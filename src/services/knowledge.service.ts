/**
 * Knowledge service for RAG (Retrieval Augmented Generation)
 * Orchestrates anonymization, embedding, and vector storage
 * @module services/knowledge
 */

import { randomUUID } from 'node:crypto';
import { ok, err } from '../core/result.js';
import type { Result } from '../core/result.js';
import { createStorageError, createValidationError } from '../core/errors.js';
import type { StorageError, ValidationError } from '../core/errors.js';
import type {
  VectorDocument,
  VectorDocumentType,
  EntityCategory,
  ExtractedEntity,
  VectorSearchResult,
} from '../domain/types/knowledge.js';
import type { VectorStorage } from '../storage/vector-storage.interface.js';
import { AnonymizerService } from './anonymizer.service.js';
import type { EmbeddingService } from './embedding.service.js';

/**
 * Configuration for knowledge service
 */
export interface KnowledgeConfig {
  /** Namespace for vector storage (default: 'travel-knowledge') */
  namespace?: string;
  /** Number of similar documents to retrieve (default: 5) */
  topK?: number;
  /** Minimum similarity score threshold (default: 0.7) */
  similarityThreshold?: number;
}

/**
 * Chat message to be stored
 */
export interface ChatMessage {
  /** Message content */
  content: string;
  /** Optional session ID for grouping */
  sessionId?: string;
  /** Message role (user or assistant) */
  role: 'user' | 'assistant';
}

/**
 * RAG retrieval result
 */
export interface RAGResult {
  /** Retrieved documents */
  documents: VectorDocument[];
  /** Similarity scores */
  scores: number[];
  /** Formatted context for LLM */
  context: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<KnowledgeConfig> = {
  namespace: 'travel-knowledge',
  topK: 5,
  similarityThreshold: 0.7,
};

/**
 * Knowledge service for managing travel conversation knowledge graph
 */
export class KnowledgeService {
  private config: Required<KnowledgeConfig>;
  private anonymizer: AnonymizerService;

  constructor(
    private vectorStorage: VectorStorage,
    private embeddingService: EmbeddingService,
    config?: KnowledgeConfig
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.anonymizer = new AnonymizerService();
  }

  /**
   * Initialize the knowledge service
   */
  async initialize(): Promise<Result<void, StorageError>> {
    return this.vectorStorage.initialize();
  }

  /**
   * Store a chat message in the knowledge graph
   */
  async storeMessage(
    message: ChatMessage
  ): Promise<Result<VectorDocument, StorageError | ValidationError>> {
    // 1. Anonymize the content
    const anonymizationResult = this.anonymizer.anonymize(message.content);
    if (!anonymizationResult.success) {
      return anonymizationResult;
    }

    const { anonymized, originalHash } = anonymizationResult.value;

    // 2. Generate embedding
    const embeddingResult = await this.embeddingService.embed(anonymized);
    if (!embeddingResult.success) {
      return embeddingResult;
    }

    const { embedding } = embeddingResult.value;

    // 3. Create vector document
    const document: VectorDocument = {
      id: randomUUID(),
      content: anonymized,
      embedding,
      metadata: {
        type: 'chat',
        timestamp: new Date(),
        sessionId: message.sessionId,
        originalHash,
      },
    };

    // 4. Store in vector database
    const upsertResult = await this.vectorStorage.upsert(this.config.namespace, [document]);
    if (!upsertResult.success) {
      return upsertResult;
    }

    return ok(document);
  }

  /**
   * Store multiple chat messages in batch
   */
  async storeMessages(
    messages: ChatMessage[]
  ): Promise<Result<VectorDocument[], StorageError | ValidationError>> {
    if (messages.length === 0) {
      return ok([]);
    }

    // 1. Anonymize all messages
    const contents = messages.map((m) => m.content);
    const anonymizationResult = await this.anonymizer.anonymizeBatch(contents);
    if (!anonymizationResult.success) {
      return anonymizationResult;
    }

    const anonymizedResults = anonymizationResult.value;

    // 2. Generate embeddings in batch
    const anonymizedContents = anonymizedResults.map((r) => r.anonymized);
    const embeddingResult = await this.embeddingService.embedBatch(anonymizedContents);
    if (!embeddingResult.success) {
      return embeddingResult;
    }

    const { embeddings } = embeddingResult.value;

    // 3. Create vector documents
    const documents: VectorDocument[] = messages.map((message, i) => ({
      id: randomUUID(),
      content: anonymizedContents[i] || '',
      embedding: embeddings[i],
      metadata: {
        type: 'chat',
        timestamp: new Date(),
        sessionId: message.sessionId,
        originalHash: anonymizedResults[i]?.originalHash,
      },
    }));

    // 4. Store in vector database
    const upsertResult = await this.vectorStorage.upsert(this.config.namespace, documents);
    if (!upsertResult.success) {
      return upsertResult;
    }

    return ok(documents);
  }

  /**
   * Store extracted entities
   */
  async storeEntity(
    entity: ExtractedEntity,
    sessionId?: string
  ): Promise<Result<VectorDocument, StorageError | ValidationError>> {
    // 1. Anonymize entity text
    const anonymizationResult = this.anonymizer.anonymize(entity.text);
    if (!anonymizationResult.success) {
      return anonymizationResult;
    }

    const { anonymized, originalHash } = anonymizationResult.value;

    // 2. Generate embedding
    const embeddingResult = await this.embeddingService.embed(anonymized);
    if (!embeddingResult.success) {
      return embeddingResult;
    }

    const { embedding } = embeddingResult.value;

    // 3. Create vector document
    const document: VectorDocument = {
      id: randomUUID(),
      content: anonymized,
      embedding,
      metadata: {
        type: 'entity',
        category: entity.category,
        timestamp: new Date(),
        sessionId,
        originalHash,
      },
    };

    // 4. Store in vector database
    const upsertResult = await this.vectorStorage.upsert(this.config.namespace, [document]);
    if (!upsertResult.success) {
      return upsertResult;
    }

    return ok(document);
  }

  /**
   * Retrieve relevant context for a query (RAG)
   */
  async retrieveContext(
    query: string,
    filter?: { type?: VectorDocumentType; category?: EntityCategory }
  ): Promise<Result<RAGResult, StorageError | ValidationError>> {
    // 1. Anonymize the query
    const anonymizationResult = this.anonymizer.anonymize(query);
    if (!anonymizationResult.success) {
      return anonymizationResult;
    }

    const { anonymized } = anonymizationResult.value;

    // 2. Generate embedding for the query
    const embeddingResult = await this.embeddingService.embed(anonymized);
    if (!embeddingResult.success) {
      return embeddingResult;
    }

    const { embedding } = embeddingResult.value;

    // 3. Search vector database
    const searchResult = await this.vectorStorage.search(
      this.config.namespace,
      embedding,
      this.config.topK,
      filter as Record<string, unknown> | undefined
    );
    if (!searchResult.success) {
      return searchResult;
    }

    const { documents, scores } = searchResult.value;

    // 4. Filter by similarity threshold
    const filteredResults = documents
      .map((doc, i) => ({ doc, score: scores[i] || 0 }))
      .filter((r) => r.score >= this.config.similarityThreshold);

    const filteredDocuments = filteredResults.map((r) => r.doc);
    const filteredScores = filteredResults.map((r) => r.score);

    // 5. Format context for LLM
    const context = this.formatContext(filteredDocuments, filteredScores);

    return ok({
      documents: filteredDocuments,
      scores: filteredScores,
      context,
    });
  }

  /**
   * Search for similar messages or entities
   */
  async search(
    query: string,
    options?: {
      topK?: number;
      type?: VectorDocumentType;
      category?: EntityCategory;
    }
  ): Promise<Result<VectorSearchResult, StorageError | ValidationError>> {
    // 1. Anonymize query
    const anonymizationResult = this.anonymizer.anonymize(query);
    if (!anonymizationResult.success) {
      return anonymizationResult;
    }

    const { anonymized } = anonymizationResult.value;

    // 2. Generate embedding
    const embeddingResult = await this.embeddingService.embed(anonymized);
    if (!embeddingResult.success) {
      return embeddingResult;
    }

    const { embedding } = embeddingResult.value;

    // 3. Search with filters
    const filter: Record<string, unknown> = {};
    if (options?.type) filter.type = options.type;
    if (options?.category) filter.category = options.category;

    return this.vectorStorage.search(
      this.config.namespace,
      embedding,
      options?.topK || this.config.topK,
      Object.keys(filter).length > 0 ? filter : undefined
    );
  }

  /**
   * Get statistics about stored knowledge
   */
  async getStats(): Promise<
    Result<
      {
        totalDocuments: number;
        byType: Record<VectorDocumentType, number>;
        byCategory: Record<EntityCategory, number>;
      },
      StorageError
    >
  > {
    const listResult = await this.vectorStorage.list(this.config.namespace, 10000);
    if (!listResult.success) {
      return listResult;
    }

    const documents = listResult.value;

    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const doc of documents) {
      // Count by type
      byType[doc.metadata.type] = (byType[doc.metadata.type] || 0) + 1;

      // Count by category
      if (doc.metadata.category) {
        byCategory[doc.metadata.category] = (byCategory[doc.metadata.category] || 0) + 1;
      }
    }

    return ok({
      totalDocuments: documents.length,
      byType: byType as Record<VectorDocumentType, number>,
      byCategory: byCategory as Record<EntityCategory, number>,
    });
  }

  /**
   * Clear all knowledge (use with caution!)
   */
  async clear(): Promise<Result<void, StorageError>> {
    return this.vectorStorage.clear(this.config.namespace);
  }

  /**
   * Delete specific documents
   */
  async delete(ids: string[]): Promise<Result<void, StorageError>> {
    return this.vectorStorage.delete(this.config.namespace, ids);
  }

  /**
   * Format retrieved documents as context for LLM
   */
  private formatContext(documents: VectorDocument[], scores: number[]): string {
    if (documents.length === 0) {
      return 'No relevant prior knowledge found.';
    }

    const contextParts = documents.map((doc, i) => {
      const score = scores[i] || 0;
      const type = doc.metadata.type;
      const category = doc.metadata.category ? ` (${doc.metadata.category})` : '';

      return `[Relevance: ${(score * 100).toFixed(0)}%] [${type}${category}] ${doc.content}`;
    });

    return `Relevant prior knowledge:\n${contextParts.join('\n')}`;
  }
}

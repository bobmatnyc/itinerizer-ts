/**
 * Embedding service for generating vector embeddings
 * @module services/embedding
 */

import OpenAI from 'openai';
import { ok, err } from '../core/result.js';
import type { Result } from '../core/result.js';
import { createStorageError } from '../core/errors.js';
import type { StorageError } from '../core/errors.js';

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  /** API key for embedding service */
  apiKey: string;
  /** Model to use for embeddings */
  model?: string;
  /** Batch size for batch processing */
  batchSize?: number;
}

/**
 * Embedding result
 */
export interface EmbeddingResult {
  /** Vector embedding */
  embedding: number[];
  /** Model used */
  model: string;
  /** Dimension of the embedding */
  dimensions: number;
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  /** Vector embeddings in same order as input texts */
  embeddings: number[][];
  /** Model used */
  model: string;
  /** Dimension of the embeddings */
  dimensions: number;
  /** Number of tokens used */
  tokensUsed: number;
}

/**
 * Default embedding model (OpenAI text-embedding-3-small)
 */
const DEFAULT_MODEL = 'openai/text-embedding-3-small';

/**
 * Default batch size
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Service for generating vector embeddings
 */
export class EmbeddingService {
  private client: OpenAI;
  private model: string;
  private batchSize: number;

  constructor(config: EmbeddingConfig) {
    this.model = config.model || DEFAULT_MODEL;
    this.batchSize = config.batchSize || DEFAULT_BATCH_SIZE;

    // Use OpenRouter for embeddings
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/itinerizer',
        'X-Title': 'Itinerizer',
      },
    });
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<Result<EmbeddingResult, StorageError>> {
    if (!text || text.trim().length === 0) {
      return err(createStorageError('VALIDATION_ERROR', 'Text cannot be empty'));
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding) {
        return err(createStorageError('READ_ERROR', 'No embedding returned from API'));
      }

      return ok({
        embedding,
        model: this.model,
        dimensions: embedding.length,
      });
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async embedBatch(texts: string[]): Promise<Result<BatchEmbeddingResult, StorageError>> {
    if (texts.length === 0) {
      return err(createStorageError('VALIDATION_ERROR', 'Texts array cannot be empty'));
    }

    // Filter out empty texts
    const validTexts = texts.filter((t) => t && t.trim().length > 0);
    if (validTexts.length === 0) {
      return err(createStorageError('VALIDATION_ERROR', 'All texts are empty'));
    }

    try {
      const embeddings: number[][] = [];
      let totalTokens = 0;

      // Process in batches
      for (let i = 0; i < validTexts.length; i += this.batchSize) {
        const batch = validTexts.slice(i, i + this.batchSize);

        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        // Extract embeddings in order
        const batchEmbeddings = response.data.map((d) => d.embedding);
        embeddings.push(...batchEmbeddings);

        // Track token usage
        totalTokens += response.usage?.total_tokens || 0;
      }

      return ok({
        embeddings,
        model: this.model,
        dimensions: embeddings[0]?.length || 0,
        tokensUsed: totalTokens,
      });
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Calculate similarity between two embeddings (cosine similarity)
   * @returns Similarity score between 0 and 1
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    // Calculate dot product
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += (embedding1[i] || 0) * (embedding2[i] || 0);
      norm1 += (embedding1[i] || 0) ** 2;
      norm2 += (embedding2[i] || 0) ** 2;
    }

    // Cosine similarity
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

    // Normalize to 0-1 range (cosine similarity is -1 to 1)
    return (similarity + 1) / 2;
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: unknown): Result<never, StorageError> {
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return err(
          createStorageError('VALIDATION_ERROR', 'Invalid API key for embedding service')
        );
      }

      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return err(
          createStorageError('READ_ERROR', 'Rate limit exceeded', {
            hint: 'Wait and try again',
          })
        );
      }

      if (error.message.includes('timeout')) {
        return err(createStorageError('READ_ERROR', 'Embedding request timeout'));
      }

      return err(
        createStorageError('READ_ERROR', 'Embedding API request failed', {
          error: error.message,
        })
      );
    }

    return err(
      createStorageError('READ_ERROR', 'Embedding API request failed', {
        error: String(error),
      })
    );
  }

  /**
   * Get the embedding model being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the embedding dimensions for the current model
   * Note: This requires making a test call to get the actual dimensions
   */
  async getDimensions(): Promise<Result<number, StorageError>> {
    const result = await this.embed('test');
    if (!result.success) {
      return result;
    }
    return ok(result.value.dimensions);
  }
}

/**
 * Vectra-based local vector storage implementation
 * @module storage/vectra-storage
 */

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ok, err } from '../core/result.js';
import type { Result } from '../core/result.js';
import { createStorageError } from '../core/errors.js';
import type { StorageError } from '../core/errors.js';
import type { VectorDocument, VectorSearchResult } from '../domain/types/knowledge.js';
import type { VectorStorage } from './vector-storage.interface.js';

// Dynamic import for vectra (ESM package)
let LocalIndex: any;

/**
 * Vectra item format
 */
interface VectraItem {
  id: string;
  vector: number[];
  metadata: Record<string, string | undefined>;
}

/**
 * Vector storage using Vectra for local file-based storage
 */
export class VectraStorage implements VectorStorage {
  private indexes: Map<string, any> = new Map();
  private initialized = false;

  /**
   * Creates a new Vectra storage instance
   * @param storagePath - Base path for vector storage (default: ./data/vectors)
   */
  constructor(private readonly storagePath: string = './data/vectors') {}

  /**
   * Initialize storage and ensure directory exists
   */
  async initialize(): Promise<Result<void, StorageError>> {
    if (this.initialized) {
      return ok(undefined);
    }

    try {
      // Dynamically import vectra
      const vectra = await import('vectra');
      LocalIndex = vectra.LocalIndex;

      // Create storage directory
      await mkdir(this.storagePath, { recursive: true });

      this.initialized = true;
      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to initialize Vectra storage', {
          error: error instanceof Error ? error.message : String(error),
          hint: 'Ensure vectra package is installed: npm install vectra',
        })
      );
    }
  }

  /**
   * Get or create index for a namespace
   */
  private async getIndex(namespace: string): Promise<Result<any, StorageError>> {
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    // Return cached index if exists
    if (this.indexes.has(namespace)) {
      return ok(this.indexes.get(namespace));
    }

    try {
      // Create index path
      const indexPath = join(this.storagePath, namespace);
      await mkdir(indexPath, { recursive: true });

      // Create new index
      const index = new LocalIndex(indexPath);

      // Check if index exists, create if not
      if (!(await index.isIndexCreated())) {
        await index.createIndex();
      }

      // Cache the index
      this.indexes.set(namespace, index);

      return ok(index);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to create Vectra index', {
          namespace,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Insert or update vector documents
   */
  async upsert(namespace: string, documents: VectorDocument[]): Promise<Result<void, StorageError>> {
    const indexResult = await this.getIndex(namespace);
    if (!indexResult.success) {
      return indexResult;
    }

    const index = indexResult.value;

    try {
      // Convert to Vectra format
      const items: VectraItem[] = documents.map((doc) => {
        const metadata: Record<string, string | undefined> = {
          content: doc.content,
          type: doc.metadata.type,
          timestamp: doc.metadata.timestamp.toISOString(),
        };

        if (doc.metadata.category) metadata.category = doc.metadata.category;
        if (doc.metadata.budgetCategory) metadata.budgetCategory = doc.metadata.budgetCategory;
        if (doc.metadata.sessionId) metadata.sessionId = doc.metadata.sessionId;
        if (doc.metadata.originalHash) metadata.originalHash = doc.metadata.originalHash;

        return {
          id: doc.id,
          vector: doc.embedding || [],
          metadata,
        };
      });

      // Upsert items
      for (const item of items) {
        await index.upsertItem(item);
      }

      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to upsert documents', {
          namespace,
          count: documents.length,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    namespace: string,
    query: number[],
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<Result<VectorSearchResult, StorageError>> {
    const indexResult = await this.getIndex(namespace);
    if (!indexResult.success) {
      return indexResult;
    }

    const index = indexResult.value;

    try {
      // Build metadata filter function
      const metadataFilter = filter
        ? (item: VectraItem) => {
            for (const [key, value] of Object.entries(filter)) {
              if (item.metadata[key] !== value) {
                return false;
              }
            }
            return true;
          }
        : undefined;

      // Query the index
      const results = await index.queryItems(query, topK, metadataFilter);

      // Convert results to VectorDocument format
      const documents: VectorDocument[] = results.map((result: any) => ({
        id: result.item.id,
        content: result.item.metadata.content as string,
        embedding: result.item.vector,
        metadata: {
          type: result.item.metadata.type as any,
          category: result.item.metadata.category as any,
          budgetCategory: result.item.metadata.budgetCategory as any,
          timestamp: new Date(result.item.metadata.timestamp as string),
          sessionId: result.item.metadata.sessionId as string | undefined,
          originalHash: result.item.metadata.originalHash as string | undefined,
        },
      }));

      const scores: number[] = results.map((result: any) => result.score);

      return ok({ documents, scores });
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', 'Failed to search documents', {
          namespace,
          topK,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Delete documents by IDs
   */
  async delete(namespace: string, ids: string[]): Promise<Result<void, StorageError>> {
    const indexResult = await this.getIndex(namespace);
    if (!indexResult.success) {
      return indexResult;
    }

    const index = indexResult.value;

    try {
      for (const id of ids) {
        await index.deleteItem(id);
      }
      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to delete documents', {
          namespace,
          count: ids.length,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Get a document by ID
   */
  async get(namespace: string, id: string): Promise<Result<VectorDocument | null, StorageError>> {
    const indexResult = await this.getIndex(namespace);
    if (!indexResult.success) {
      return indexResult;
    }

    const index = indexResult.value;

    try {
      const item = await index.getItem(id);

      if (!item) {
        return ok(null);
      }

      const document: VectorDocument = {
        id: item.id,
        content: item.metadata.content as string,
        embedding: item.vector,
        metadata: {
          type: item.metadata.type as any,
          category: item.metadata.category as any,
          budgetCategory: item.metadata.budgetCategory as any,
          timestamp: new Date(item.metadata.timestamp as string),
          sessionId: item.metadata.sessionId as string | undefined,
          originalHash: item.metadata.originalHash as string | undefined,
        },
      };

      return ok(document);
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', 'Failed to get document', {
          namespace,
          id,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * List all documents in a namespace
   */
  async list(
    namespace: string,
    limit = 100,
    offset = 0
  ): Promise<Result<VectorDocument[], StorageError>> {
    const indexResult = await this.getIndex(namespace);
    if (!indexResult.success) {
      return indexResult;
    }

    const index = indexResult.value;

    try {
      const allItems = await index.listItems();

      // Apply pagination
      const items = allItems.slice(offset, offset + limit);

      const documents: VectorDocument[] = items.map((item: VectraItem) => ({
        id: item.id,
        content: item.metadata.content as string,
        embedding: item.vector,
        metadata: {
          type: item.metadata.type as any,
          category: item.metadata.category as any,
          budgetCategory: item.metadata.budgetCategory as any,
          timestamp: new Date(item.metadata.timestamp as string),
          sessionId: item.metadata.sessionId as string | undefined,
          originalHash: item.metadata.originalHash as string | undefined,
        },
      }));

      return ok(documents);
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', 'Failed to list documents', {
          namespace,
          limit,
          offset,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Clear all documents in a namespace
   */
  async clear(namespace: string): Promise<Result<void, StorageError>> {
    const indexResult = await this.getIndex(namespace);
    if (!indexResult.success) {
      return indexResult;
    }

    const index = indexResult.value;

    try {
      // Delete the index
      await index.deleteIndex();

      // Remove from cache
      this.indexes.delete(namespace);

      // Recreate empty index
      await index.createIndex();

      // Re-cache
      this.indexes.set(namespace, index);

      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to clear namespace', {
          namespace,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }
}

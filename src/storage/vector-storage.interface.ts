/**
 * Vector storage interface for knowledge graph
 * @module storage/vector-storage
 */

import type { Result } from '../core/result.js';
import type { StorageError } from '../core/errors.js';
import type { VectorDocument, VectorSearchResult } from '../domain/types/knowledge.js';

/**
 * Interface for vector storage implementations
 */
export interface VectorStorage {
  /**
   * Initialize the vector storage
   */
  initialize(): Promise<Result<void, StorageError>>;

  /**
   * Insert or update vector documents
   * @param namespace - Collection namespace (e.g., 'travel-knowledge')
   * @param documents - Documents to upsert
   */
  upsert(namespace: string, documents: VectorDocument[]): Promise<Result<void, StorageError>>;

  /**
   * Search for similar documents using vector similarity
   * @param namespace - Collection namespace
   * @param query - Query vector embedding
   * @param topK - Number of results to return
   * @param filter - Optional metadata filter
   */
  search(
    namespace: string,
    query: number[],
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<Result<VectorSearchResult, StorageError>>;

  /**
   * Delete documents by IDs
   * @param namespace - Collection namespace
   * @param ids - Document IDs to delete
   */
  delete(namespace: string, ids: string[]): Promise<Result<void, StorageError>>;

  /**
   * Get a document by ID
   * @param namespace - Collection namespace
   * @param id - Document ID
   */
  get(namespace: string, id: string): Promise<Result<VectorDocument | null, StorageError>>;

  /**
   * List all documents in a namespace
   * @param namespace - Collection namespace
   * @param limit - Maximum number of documents to return
   * @param offset - Number of documents to skip
   */
  list(
    namespace: string,
    limit?: number,
    offset?: number
  ): Promise<Result<VectorDocument[], StorageError>>;

  /**
   * Clear all documents in a namespace
   * @param namespace - Collection namespace
   */
  clear(namespace: string): Promise<Result<void, StorageError>>;
}

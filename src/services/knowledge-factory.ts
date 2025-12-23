/**
 * Factory for creating knowledge service instances
 * @module services/knowledge-factory
 */

import { KnowledgeService } from './knowledge.service.js';
import { WeaviateKnowledgeService } from './weaviate-knowledge.service.js';
import { createWeaviateStorage } from '../storage/weaviate-storage.js';
import { VectraStorage } from '../storage/vectra-storage.js';
import { EmbeddingService } from './embedding.service.js';

/**
 * Knowledge backend type
 */
export type KnowledgeBackend = 'vectra' | 'weaviate';

/**
 * Create a knowledge service based on environment configuration
 * @returns KnowledgeService (Vectra-based) or WeaviateKnowledgeService based on KNOWLEDGE_BACKEND
 *
 * Auto-detects based on environment:
 * - KNOWLEDGE_BACKEND='weaviate' → WeaviateKnowledgeService
 * - Otherwise → KnowledgeService (Vectra)
 */
export function createKnowledgeService():
  | KnowledgeService
  | WeaviateKnowledgeService
  | null {
  const backend = (process.env.KNOWLEDGE_BACKEND as KnowledgeBackend) || 'vectra';

  if (backend === 'weaviate') {
    // Use Weaviate backend
    const weaviateStorage = createWeaviateStorage();
    if (!weaviateStorage) {
      console.warn(
        'Weaviate backend requested but WEAVIATE_URL or WEAVIATE_API_KEY not set'
      );
      return null;
    }

    return new WeaviateKnowledgeService(weaviateStorage);
  }

  // Default to Vectra backend
  const vectorStorage = new VectraStorage();

  const embeddingService = new EmbeddingService({
    apiKey: process.env.OPENROUTER_API_KEY || '',
  });

  return new KnowledgeService(vectorStorage, embeddingService);
}

/**
 * Type guard for WeaviateKnowledgeService
 */
export function isWeaviateKnowledgeService(
  service: KnowledgeService | WeaviateKnowledgeService | null
): service is WeaviateKnowledgeService {
  return service !== null && 'searchWithFallback' in service;
}

/**
 * Create a Weaviate knowledge service (explicit)
 * @returns WeaviateKnowledgeService or null if Weaviate is not configured
 */
export function createWeaviateKnowledgeService(): WeaviateKnowledgeService | null {
  const weaviateStorage = createWeaviateStorage();
  if (!weaviateStorage) {
    return null;
  }

  return new WeaviateKnowledgeService(weaviateStorage);
}

/**
 * Create a Vectra knowledge service (explicit)
 * @returns KnowledgeService
 */
export function createVectraKnowledgeService(): KnowledgeService {
  const vectorStorage = new VectraStorage();

  const embeddingService = new EmbeddingService({
    apiKey: process.env.OPENROUTER_API_KEY || '',
  });

  return new KnowledgeService(vectorStorage, embeddingService);
}

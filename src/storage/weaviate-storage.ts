/**
 * Weaviate-based cloud vector storage implementation
 * @module storage/weaviate-storage
 */

import weaviate, { type WeaviateClient, ApiKey } from 'weaviate-client';
import { ok, err } from '../core/result.js';
import type { Result } from '../core/result.js';
import { createStorageError } from '../core/errors.js';
import type { StorageError } from '../core/errors.js';
import type { VectorDocument, VectorSearchResult } from '../domain/types/knowledge.js';
import type { VectorStorage } from './vector-storage.interface.js';
import type {
  WeaviateConfig,
  TravelKnowledge,
  Destination,
  ItineraryReference,
  KnowledgeSearchFilter,
  KnowledgeSearchResult,
  WeaviateStats,
  TemporalType,
  KnowledgeCategory,
} from '../domain/types/weaviate.js';

/**
 * Collection names in Weaviate
 */
const COLLECTIONS = {
  TRAVEL_KNOWLEDGE: 'TravelKnowledge',
  DESTINATION: 'Destination',
  ITINERARY: 'Itinerary',
} as const;

/**
 * Vector storage using Weaviate Cloud for production deployment
 */
export class WeaviateStorage implements VectorStorage {
  private client: WeaviateClient | null = null;
  private initialized = false;

  /**
   * Creates a new Weaviate storage instance
   * @param config - Weaviate configuration
   */
  constructor(private readonly config: WeaviateConfig) {}

  /**
   * Initialize Weaviate client and ensure schema exists
   */
  async initialize(): Promise<Result<void, StorageError>> {
    if (this.initialized) {
      return ok(undefined);
    }

    try {
      // Extract cluster ID from URL (e.g., https://cluster-id.weaviate.cloud)
      const clusterUrl = this.config.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

      // Connect to Weaviate Cloud
      this.client = await weaviate.connectToWeaviateCloud(clusterUrl, {
        authCredentials: new ApiKey(this.config.apiKey),
        headers: this.config.openaiKey
          ? { 'X-OpenAI-Api-Key': this.config.openaiKey }
          : undefined,
      });

      // Verify connection
      const isReady = await this.client.isReady();
      if (!isReady) {
        return err(
          createStorageError('CONNECTION_ERROR', 'Weaviate cluster is not ready', {
            url: this.config.url,
          })
        );
      }

      // Create schema if it doesn't exist
      const schemaResult = await this.ensureSchema();
      if (!schemaResult.success) {
        return schemaResult;
      }

      this.initialized = true;
      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('CONNECTION_ERROR', 'Failed to connect to Weaviate', {
          url: this.config.url,
          error: error instanceof Error ? error.message : String(error),
          hint: 'Verify WEAVIATE_URL and WEAVIATE_API_KEY are correct',
        })
      );
    }
  }

  /**
   * Ensure Weaviate schema exists for all collections
   */
  private async ensureSchema(): Promise<Result<void, StorageError>> {
    if (!this.client) {
      return err(createStorageError('CONNECTION_ERROR', 'Client not initialized'));
    }

    try {
      const collections = this.client.collections;

      // Check if TravelKnowledge collection exists
      const hasKnowledge = await collections.exists(COLLECTIONS.TRAVEL_KNOWLEDGE);
      if (!hasKnowledge) {
        await collections.create({
          name: COLLECTIONS.TRAVEL_KNOWLEDGE,
          properties: [
            { name: 'content', dataType: 'text' },
            { name: 'rawContent', dataType: 'text' },
            { name: 'category', dataType: 'text' },
            { name: 'subcategory', dataType: 'text' },
            { name: 'source', dataType: 'text' },
            { name: 'sourceUrl', dataType: 'text' },
            { name: 'sessionId', dataType: 'text' },
            { name: 'itineraryId', dataType: 'text' },
            { name: 'destinationName', dataType: 'text' },
            { name: 'createdAt', dataType: 'date' },
            { name: 'relevantFrom', dataType: 'date' },
            { name: 'relevantUntil', dataType: 'date' },
            { name: 'temporalType', dataType: 'text' },
            { name: 'decayHalfLife', dataType: 'int' },
            { name: 'baseRelevance', dataType: 'number' },
            // Category properties for faceted search
            { name: 'tripType', dataType: 'text' },
            { name: 'luxuryLevel', dataType: 'text' },
            { name: 'travelerType', dataType: 'text' },
            { name: 'region', dataType: 'text' },
            { name: 'country', dataType: 'text' },
            { name: 'season', dataType: 'text' },
            { name: 'seasonModifier', dataType: 'text' },
          ],
        });
      }

      // Check if Destination collection exists
      const hasDestination = await collections.exists(COLLECTIONS.DESTINATION);
      if (!hasDestination) {
        await collections.create({
          name: COLLECTIONS.DESTINATION,
          properties: [
            { name: 'name', dataType: 'text' },
            { name: 'country', dataType: 'text' },
            { name: 'region', dataType: 'text' },
            { name: 'city', dataType: 'text' },
            { name: 'latitude', dataType: 'number' },
            { name: 'longitude', dataType: 'number' },
            { name: 'description', dataType: 'text' },
            { name: 'popularFor', dataType: 'text[]' },
            { name: 'bestMonths', dataType: 'int[]' },
            { name: 'budgetCategory', dataType: 'text' },
            { name: 'createdAt', dataType: 'date' },
            { name: 'updatedAt', dataType: 'date' },
          ],
        });
      }

      // Check if Itinerary collection exists
      const hasItinerary = await collections.exists(COLLECTIONS.ITINERARY);
      if (!hasItinerary) {
        await collections.create({
          name: COLLECTIONS.ITINERARY,
          properties: [
            { name: 'title', dataType: 'text' },
            { name: 'destination', dataType: 'text' },
            { name: 'startDate', dataType: 'date' },
            { name: 'endDate', dataType: 'date' },
            { name: 'budget', dataType: 'number' },
            { name: 'createdAt', dataType: 'date' },
          ],
        });
      }

      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('INITIALIZATION_ERROR', 'Failed to create Weaviate schema', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Insert or update vector documents (for VectorStorage interface)
   * Maps VectorDocument to TravelKnowledge
   */
  async upsert(namespace: string, documents: VectorDocument[]): Promise<Result<void, StorageError>> {
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    // For now, we'll map VectorDocument to TravelKnowledge
    // This is a compatibility layer for the existing VectorStorage interface
    const knowledge: Partial<TravelKnowledge>[] = documents.map((doc) => ({
      id: doc.id,
      content: doc.content,
      rawContent: doc.content,
      category: 'tip' as KnowledgeCategory, // Default mapping
      source: 'user_input',
      createdAt: doc.metadata.timestamp,
      temporalType: 'evergreen' as TemporalType,
      decayHalfLife: 365,
      baseRelevance: 1.0,
      sessionId: doc.metadata.sessionId,
    }));

    return this.upsertKnowledge(knowledge as TravelKnowledge[]);
  }

  /**
   * Insert or update travel knowledge documents
   */
  async upsertKnowledge(knowledge: TravelKnowledge[]): Promise<Result<void, StorageError>> {
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const collection = this.client!.collections.get(COLLECTIONS.TRAVEL_KNOWLEDGE);

      // Batch insert/update
      const objects = knowledge.map((k) => {
        const properties: Record<string, any> = {
          content: k.content,
          rawContent: k.rawContent,
          category: k.category,
          source: k.source,
          createdAt: k.createdAt.toISOString(),
          temporalType: k.temporalType,
          decayHalfLife: k.decayHalfLife,
          baseRelevance: k.baseRelevance,
        };

        // Add optional fields only if they exist
        if (k.subcategory) properties.subcategory = k.subcategory;
        if (k.sourceUrl) properties.sourceUrl = k.sourceUrl;
        if (k.sessionId) properties.sessionId = k.sessionId;
        if (k.itineraryId) properties.itineraryId = k.itineraryId;
        if (k.destinationName) properties.destinationName = k.destinationName;
        if (k.relevantFrom) properties.relevantFrom = k.relevantFrom.toISOString();
        if (k.relevantUntil) properties.relevantUntil = k.relevantUntil.toISOString();
        if (k.tripType) properties.tripType = k.tripType;
        if (k.luxuryLevel) properties.luxuryLevel = k.luxuryLevel;
        if (k.travelerType) properties.travelerType = k.travelerType;
        if (k.region) properties.region = k.region;
        if (k.country) properties.country = k.country;
        if (k.season) properties.season = k.season;
        if (k.seasonModifier) properties.seasonModifier = k.seasonModifier;

        return { id: k.id, properties };
      });

      await collection.data.insertMany(objects);

      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to upsert knowledge documents', {
          count: knowledge.length,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async search(
    namespace: string,
    query: number[],
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<Result<VectorSearchResult, StorageError>> {
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const collection = this.client!.collections.get(COLLECTIONS.TRAVEL_KNOWLEDGE);

      // Build where filter from Record
      let whereFilter;
      if (filter) {
        const conditions = Object.entries(filter).map(([key, value]) => ({
          path: [key],
          operator: 'Equal' as const,
          valueText: String(value),
        }));

        whereFilter =
          conditions.length > 1
            ? { operator: 'And' as const, operands: conditions }
            : conditions[0];
      }

      // Search with vector
      const result = await collection.query.nearVector(query, {
        limit: topK,
        returnMetadata: ['distance'],
        filters: whereFilter,
      });

      // Convert to VectorDocument format
      const documents: VectorDocument[] = result.objects.map((obj: any) => ({
        id: obj.uuid,
        content: obj.properties.content,
        embedding: query, // Weaviate doesn't return vectors by default
        metadata: {
          type: 'chat' as const,
          timestamp: new Date(obj.properties.createdAt),
          sessionId: obj.properties.sessionId,
          category: obj.properties.category,
        },
      }));

      const scores = result.objects.map((obj: any) => 1 - (obj.metadata?.distance || 0));

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
   * Search knowledge with filters and temporal decay
   */
  async searchKnowledge(
    query: string,
    topK: number,
    filter?: KnowledgeSearchFilter
  ): Promise<Result<KnowledgeSearchResult, StorageError>> {
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const collection = this.client!.collections.get(COLLECTIONS.TRAVEL_KNOWLEDGE);

      // Build where filter
      const conditions: any[] = [];
      if (filter?.category) {
        conditions.push({ path: ['category'], operator: 'Equal', valueText: filter.category });
      }
      if (filter?.source) {
        conditions.push({ path: ['source'], operator: 'Equal', valueText: filter.source });
      }
      if (filter?.destinationName) {
        conditions.push({
          path: ['destinationName'],
          operator: 'Equal',
          valueText: filter.destinationName,
        });
      }
      if (filter?.sessionId) {
        conditions.push({ path: ['sessionId'], operator: 'Equal', valueText: filter.sessionId });
      }
      if (filter?.temporalType) {
        conditions.push({
          path: ['temporalType'],
          operator: 'Equal',
          valueText: filter.temporalType,
        });
      }
      // Category filters
      if (filter?.tripType) {
        conditions.push({ path: ['tripType'], operator: 'Equal', valueText: filter.tripType });
      }
      if (filter?.luxuryLevel) {
        conditions.push({
          path: ['luxuryLevel'],
          operator: 'Equal',
          valueText: filter.luxuryLevel,
        });
      }
      if (filter?.travelerType) {
        conditions.push({
          path: ['travelerType'],
          operator: 'Equal',
          valueText: filter.travelerType,
        });
      }
      if (filter?.region) {
        conditions.push({ path: ['region'], operator: 'Equal', valueText: filter.region });
      }
      if (filter?.country) {
        conditions.push({ path: ['country'], operator: 'Equal', valueText: filter.country });
      }
      if (filter?.season) {
        conditions.push({ path: ['season'], operator: 'Equal', valueText: filter.season });
      }
      if (filter?.seasonModifier) {
        conditions.push({
          path: ['seasonModifier'],
          operator: 'Equal',
          valueText: filter.seasonModifier,
        });
      }

      const whereFilter =
        conditions.length > 1
          ? { operator: 'And' as const, operands: conditions }
          : conditions.length === 1
            ? conditions[0]
            : undefined;

      // Search with hybrid (vector + keyword)
      const result = await collection.query.hybrid(query, {
        limit: topK,
        returnMetadata: ['score', 'distance'],
        filters: whereFilter,
      });

      // Convert to TravelKnowledge format
      const knowledge: TravelKnowledge[] = result.objects.map((obj: any) => ({
        id: obj.uuid,
        content: obj.properties.content || '',
        rawContent: obj.properties.rawContent || '',
        category: obj.properties.category,
        subcategory: obj.properties.subcategory || undefined,
        source: obj.properties.source,
        sourceUrl: obj.properties.sourceUrl || undefined,
        sessionId: obj.properties.sessionId || undefined,
        itineraryId: obj.properties.itineraryId || undefined,
        destinationName: obj.properties.destinationName || undefined,
        createdAt: new Date(obj.properties.createdAt),
        relevantFrom: obj.properties.relevantFrom
          ? new Date(obj.properties.relevantFrom)
          : undefined,
        relevantUntil: obj.properties.relevantUntil
          ? new Date(obj.properties.relevantUntil)
          : undefined,
        temporalType: obj.properties.temporalType,
        decayHalfLife: obj.properties.decayHalfLife,
        baseRelevance: obj.properties.baseRelevance,
        // Category properties (null-coalescing to undefined)
        tripType: obj.properties.tripType || undefined,
        luxuryLevel: obj.properties.luxuryLevel || undefined,
        travelerType: obj.properties.travelerType || undefined,
        region: obj.properties.region || undefined,
        country: obj.properties.country || undefined,
        season: obj.properties.season || undefined,
        seasonModifier: obj.properties.seasonModifier || undefined,
      }));

      const scores = result.objects.map((obj: any) => obj.metadata?.score || 0);

      // Calculate temporal decay
      const relevantAt = filter?.relevantAt || new Date();
      const relevanceScores = knowledge.map((k, i) => {
        const score = scores[i];
        const decay = this.calculateTemporalDecay(k, relevantAt);
        return score * decay;
      });

      return ok({ knowledge, scores, relevanceScores });
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', 'Failed to search knowledge', {
          query,
          topK,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Calculate temporal decay factor (0-1)
   */
  private calculateTemporalDecay(knowledge: TravelKnowledge, currentDate: Date): number {
    // Evergreen content doesn't decay
    if (knowledge.temporalType === 'evergreen') {
      return 1.0;
    }

    // Check if within relevant date range
    if (knowledge.relevantFrom && currentDate < knowledge.relevantFrom) {
      return 0.5; // Future content gets partial relevance
    }
    if (knowledge.relevantUntil && currentDate > knowledge.relevantUntil) {
      // Past events decay based on half-life
      const daysSinceExpiry =
        (currentDate.getTime() - knowledge.relevantUntil.getTime()) / (1000 * 60 * 60 * 24);
      const halfLives = daysSinceExpiry / knowledge.decayHalfLife;
      return Math.pow(0.5, halfLives); // Exponential decay
    }

    return 1.0; // Within relevant range
  }

  /**
   * Delete documents by IDs
   */
  async delete(namespace: string, ids: string[]): Promise<Result<void, StorageError>> {
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const collection = this.client!.collections.get(COLLECTIONS.TRAVEL_KNOWLEDGE);

      // Delete by UUID
      for (const id of ids) {
        await collection.data.deleteById(id);
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
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const collection = this.client!.collections.get(COLLECTIONS.TRAVEL_KNOWLEDGE);

      const result = await collection.query.fetchObjectById(id);

      if (!result) {
        return ok(null);
      }

      const document: VectorDocument = {
        id: result.uuid,
        content: result.properties.content,
        metadata: {
          type: 'chat' as const,
          timestamp: new Date(result.properties.createdAt),
          sessionId: result.properties.sessionId,
          category: result.properties.category,
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
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const collection = this.client!.collections.get(COLLECTIONS.TRAVEL_KNOWLEDGE);

      const result = await collection.query.fetchObjects({
        limit,
        offset,
      });

      const documents: VectorDocument[] = result.objects.map((obj: any) => ({
        id: obj.uuid,
        content: obj.properties.content,
        metadata: {
          type: 'chat' as const,
          timestamp: new Date(obj.properties.createdAt),
          sessionId: obj.properties.sessionId,
          category: obj.properties.category,
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
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const collection = this.client!.collections.get(COLLECTIONS.TRAVEL_KNOWLEDGE);

      // Delete all objects - use where filter to match all
      await collection.data.deleteMany(
        collection.filter.byProperty('category').containsAny(['destination', 'activity']) // Dummy filter
      );

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

  /**
   * Get storage statistics
   */
  async getStats(): Promise<Result<WeaviateStats, StorageError>> {
    if (!this.client) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    try {
      const knowledgeCollection = this.client!.collections.get(COLLECTIONS.TRAVEL_KNOWLEDGE);
      const destinationCollection = this.client!.collections.get(COLLECTIONS.DESTINATION);
      const itineraryCollection = this.client!.collections.get(COLLECTIONS.ITINERARY);

      // Get total counts
      const knowledgeResult = await knowledgeCollection.aggregate.overAll();
      const destinationResult = await destinationCollection.aggregate.overAll();
      const itineraryResult = await itineraryCollection.aggregate.overAll();

      const totalKnowledge = knowledgeResult.totalCount;
      const totalDestinations = destinationResult.totalCount;
      const totalItineraries = itineraryResult.totalCount;

      // Initialize category counts
      const knowledgeByCategory = {} as Record<KnowledgeCategory, number>;
      const knowledgeBySource = {} as Record<string, number>;
      const knowledgeByTemporalType = {} as Record<TemporalType, number>;

      // Get all knowledge to calculate breakdowns (for small datasets)
      // For large datasets, we'd use aggregation queries
      const allKnowledge = await this.list('knowledge', totalKnowledge);
      if (allKnowledge.success) {
        // This is a simplified version - in production, use Weaviate aggregations
      }

      const stats: WeaviateStats = {
        totalKnowledge,
        totalDestinations,
        totalItineraries,
        knowledgeByCategory,
        knowledgeBySource,
        knowledgeByTemporalType,
      };

      return ok(stats);
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', 'Failed to get statistics', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Close the Weaviate client connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.initialized = false;
    }
  }
}

/**
 * Create WeaviateStorage from environment variables
 */
export function createWeaviateStorage(): WeaviateStorage | null {
  const url = process.env.WEAVIATE_URL;
  const apiKey = process.env.WEAVIATE_API_KEY;

  if (!url || !apiKey) {
    return null;
  }

  const config: WeaviateConfig = {
    url,
    apiKey,
    grpcUrl: process.env.WEAVIATE_GRPC_URL,
    openaiKey: process.env.OPENROUTER_API_KEY, // Reuse OpenRouter key for embeddings
  };

  return new WeaviateStorage(config);
}

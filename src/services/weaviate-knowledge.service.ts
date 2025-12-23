/**
 * Weaviate-based knowledge service with KB-first search flow
 * @module services/weaviate-knowledge
 */

import { randomUUID } from 'node:crypto';
import { ok, err } from '../core/result.js';
import type { Result } from '../core/result.js';
import { createStorageError, createValidationError } from '../core/errors.js';
import type { StorageError, ValidationError } from '../core/errors.js';
import type { WeaviateStorage } from '../storage/weaviate-storage.js';
import { AnonymizerService } from './anonymizer.service.js';
import {
  detectSeason,
  inferLuxuryLevel,
  inferTravelerType,
  detectRegion,
  calculateDailyBudget,
} from '../domain/utils/categories.js';
import type {
  TravelKnowledge,
  KnowledgeSearchFilter,
  KnowledgeSearchResult,
  WeaviateStats,
  TemporalType,
  KnowledgeCategory,
  KnowledgeSource,
  CategoryFilter,
} from '../domain/types/weaviate.js';
import type { Itinerary } from '../domain/types/itinerary.js';

/**
 * Raw knowledge before processing
 */
export interface RawKnowledge {
  /** Content to store */
  content: string;
  /** Category (auto-detected if not provided) */
  category?: KnowledgeCategory;
  /** Subcategory for finer classification */
  subcategory?: string;
  /** Source of knowledge */
  source?: KnowledgeSource;
  /** Source URL (for web search results) */
  sourceUrl?: string;
  /** Trip type */
  tripType?: string;
  /** Country */
  country?: string;
  /** Temporal type */
  temporalType?: TemporalType;
  /** Base relevance score */
  baseRelevance?: number;
}

/**
 * Context for knowledge storage
 */
export interface KnowledgeContext {
  /** Associated itinerary */
  itinerary?: Itinerary;
  /** Session ID */
  sessionId?: string;
  /** Destination name */
  destinationName?: string;
  /** Number of travelers */
  travelers?: number;
  /** Daily budget per person */
  dailyBudget?: number;
  /** Travel date */
  travelDate?: Date;
}

/**
 * Search context for KB-first flow
 */
export interface SearchContext {
  /** Category filters */
  filters?: CategoryFilter;
  /** Associated itinerary */
  itinerary?: Itinerary;
  /** Destination name */
  destinationName?: string;
  /** Travel date (for temporal decay) */
  travelDate?: Date;
}

/**
 * Knowledge search result with source indicator
 */
export interface KnowledgeResult extends TravelKnowledge {
  /** Similarity score */
  score: number;
  /** Relevance score (with temporal decay) */
  relevanceScore: number;
}

/**
 * KB-first search result
 */
export interface KBSearchResult {
  /** Source of results */
  source: 'knowledge_base' | 'web_search';
  /** Results */
  results: KnowledgeResult[];
  /** Whether KB had results below threshold */
  kbFallback: boolean;
}

/**
 * Knowledge service error types
 */
export type KnowledgeError = StorageError | ValidationError;

/**
 * Configuration for WeaviateKnowledgeService
 */
export interface WeaviateKnowledgeConfig {
  /** Similarity threshold for KB results (default: 0.7) */
  similarityThreshold?: number;
  /** Number of results to return (default: 5) */
  topK?: number;
  /** Default temporal decay half-life in days (default: 365) */
  defaultDecayHalfLife?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<WeaviateKnowledgeConfig> = {
  similarityThreshold: 0.7,
  topK: 5,
  defaultDecayHalfLife: 365,
};

/**
 * Weaviate-based knowledge service
 * Implements KB-first search with web fallback and anonymization
 */
export class WeaviateKnowledgeService {
  private config: Required<WeaviateKnowledgeConfig>;
  private anonymizer: AnonymizerService;

  constructor(
    private weaviateStorage: WeaviateStorage,
    config?: WeaviateKnowledgeConfig
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.anonymizer = new AnonymizerService();
  }

  /**
   * Initialize the knowledge service
   */
  async initialize(): Promise<Result<void, KnowledgeError>> {
    return this.weaviateStorage.initialize();
  }

  /**
   * Store knowledge in Weaviate with anonymization and category auto-detection
   */
  async storeKnowledge(
    knowledge: RawKnowledge,
    context?: KnowledgeContext
  ): Promise<Result<void, KnowledgeError>> {
    // 1. Validate input
    if (!knowledge.content || knowledge.content.trim().length === 0) {
      return err(createValidationError('INVALID_DATA', 'Content cannot be empty', 'content'));
    }

    // 2. Anonymize content
    const anonymizationResult = this.anonymizer.anonymize(knowledge.content);
    if (!anonymizationResult.success) {
      // Cast ValidationError to KnowledgeError (they're compatible)
      return anonymizationResult as Result<void, KnowledgeError>;
    }

    const { anonymized } = anonymizationResult.value;

    // 3. Auto-detect categories
    const categories = this.detectCategories(knowledge, context);

    // 4. Build TravelKnowledge document
    const travelKnowledge: TravelKnowledge = {
      id: randomUUID(),
      content: anonymized, // Anonymized for embedding/search
      rawContent: knowledge.content, // Original for display
      category: knowledge.category || 'tip',
      subcategory: knowledge.subcategory,
      source: knowledge.source || 'user_input',
      sourceUrl: knowledge.sourceUrl,
      sessionId: context?.sessionId,
      itineraryId: context?.itinerary?.id,
      destinationName:
        context?.destinationName || context?.itinerary?.destinations?.[0]?.name,
      createdAt: new Date(),
      temporalType: knowledge.temporalType || 'evergreen',
      decayHalfLife: this.config.defaultDecayHalfLife,
      baseRelevance: knowledge.baseRelevance || 1.0,
      ...categories,
    };

    // 5. Store in Weaviate
    return this.weaviateStorage.upsertKnowledge([travelKnowledge]);
  }

  /**
   * Search knowledge base first, fall back to web search if needed
   */
  async searchWithFallback(
    query: string,
    context: SearchContext
  ): Promise<Result<KBSearchResult, KnowledgeError>> {
    // 1. Search internal KB first
    const kbResult = await this.searchKnowledge(query, this.buildFilter(context));
    if (!kbResult.success) {
      return kbResult as Result<KBSearchResult, KnowledgeError>;
    }

    const kbResults = this.mapToKnowledgeResults(
      kbResult.value,
      context.travelDate || new Date()
    );

    // 2. Check if we have good results (score > threshold)
    const hasGoodResults =
      kbResults.length > 0 && kbResults[0].relevanceScore > this.config.similarityThreshold;

    if (hasGoodResults) {
      return ok({
        source: 'knowledge_base',
        results: kbResults,
        kbFallback: false,
      });
    }

    // 3. Fall back to web search
    // TODO: Implement web search integration when available
    // For now, return KB results with fallback flag
    return ok({
      source: 'knowledge_base',
      results: kbResults,
      kbFallback: true, // Indicates we would have fallen back to web search
    });
  }

  /**
   * Enrich knowledge base with web search results (async, don't wait)
   */
  async enrichKnowledgeBase(
    webResults: RawKnowledge[],
    context: SearchContext
  ): Promise<Result<void, KnowledgeError>> {
    // Store all web results
    for (const result of webResults) {
      const storeResult = await this.storeKnowledge(
        {
          ...result,
          source: 'web_search',
        },
        {
          destinationName: context.destinationName,
          itinerary: context.itinerary,
          travelDate: context.travelDate,
        }
      );

      if (!storeResult.success) {
        console.error('Failed to enrich KB');
      }
    }

    return ok(undefined);
  }

  /**
   * Search knowledge base with filters
   */
  async searchKnowledge(
    query: string,
    filter?: KnowledgeSearchFilter
  ): Promise<Result<KnowledgeSearchResult, KnowledgeError>> {
    return this.weaviateStorage.searchKnowledge(query, this.config.topK, filter);
  }

  /**
   * Get knowledge by itinerary ID
   */
  async getKnowledgeByItinerary(
    itineraryId: string
  ): Promise<Result<KnowledgeResult[], KnowledgeError>> {
    const searchResult = await this.weaviateStorage.searchKnowledge(
      '', // Empty query for exact filter match
      100, // Higher limit for itinerary-specific knowledge
      { itineraryId }
    );

    if (!searchResult.success) {
      return searchResult as Result<KnowledgeResult[], KnowledgeError>;
    }

    const results = this.mapToKnowledgeResults(searchResult.value, new Date());
    return ok(results);
  }

  /**
   * Get knowledge by destination
   */
  async getKnowledgeByDestination(
    destination: string
  ): Promise<Result<KnowledgeResult[], KnowledgeError>> {
    const searchResult = await this.weaviateStorage.searchKnowledge(
      destination,
      this.config.topK * 2, // More results for destination queries
      { destinationName: destination }
    );

    if (!searchResult.success) {
      return searchResult as Result<KnowledgeResult[], KnowledgeError>;
    }

    const results = this.mapToKnowledgeResults(searchResult.value, new Date());
    return ok(results);
  }

  /**
   * Get statistics about stored knowledge
   */
  async getStats(): Promise<Result<WeaviateStats, KnowledgeError>> {
    return this.weaviateStorage.getStats();
  }

  /**
   * Auto-detect categories from knowledge and context
   */
  private detectCategories(
    knowledge: RawKnowledge,
    context?: KnowledgeContext
  ): Partial<TravelKnowledge> {
    const categories: Partial<TravelKnowledge> = {};

    // Trip type
    if (knowledge.tripType) {
      categories.tripType = knowledge.tripType as any;
    } else if (context?.itinerary?.tripType) {
      categories.tripType = context.itinerary.tripType as any;
    }

    // Luxury level (from daily budget)
    if (context?.dailyBudget) {
      categories.luxuryLevel = inferLuxuryLevel(context.dailyBudget);
    } else if (context?.itinerary?.totalPrice?.amount) {
      // Calculate daily budget from itinerary total price
      const totalBudget = context.itinerary.totalPrice.amount;
      const days =
        (new Date(context.itinerary.endDate).getTime() -
          new Date(context.itinerary.startDate).getTime()) /
        (1000 * 60 * 60 * 24);
      const travelers = context.travelers || context.itinerary.travelers.length || 1;
      const dailyBudget = calculateDailyBudget(totalBudget, days, travelers);
      if (dailyBudget > 0) {
        categories.luxuryLevel = inferLuxuryLevel(dailyBudget);
      }
    }

    // Traveler type
    if (context?.travelers) {
      categories.travelerType = inferTravelerType({ count: context.travelers });
    }

    // Region and country
    if (knowledge.country) {
      categories.country = knowledge.country;
      categories.region = detectRegion(knowledge.country);
    } else if (context?.itinerary?.destinations?.[0]?.name) {
      // Try to detect from first destination
      categories.region = detectRegion(context.itinerary.destinations[0].name);
    }

    // Season (from travel date)
    if (context?.travelDate) {
      const seasonInfo = detectSeason(context.travelDate);
      categories.season = seasonInfo.season;
      categories.seasonModifier = seasonInfo.modifier;
    } else if (context?.itinerary) {
      const seasonInfo = detectSeason(new Date(context.itinerary.startDate));
      categories.season = seasonInfo.season;
      categories.seasonModifier = seasonInfo.modifier;
    }

    return categories;
  }

  /**
   * Build knowledge search filter from search context
   */
  private buildFilter(context: SearchContext): KnowledgeSearchFilter {
    const filter: KnowledgeSearchFilter = {};

    if (context.destinationName) {
      filter.destinationName = context.destinationName;
    }

    if (context.travelDate) {
      filter.relevantAt = context.travelDate;
    }

    // Apply category filters
    if (context.filters) {
      // For now, we'll use the first value from each array
      // In a more sophisticated implementation, we'd use OR logic
      if (context.filters.tripTypes?.[0]) {
        filter.tripType = context.filters.tripTypes[0];
      }
      if (context.filters.luxuryLevels?.[0]) {
        filter.luxuryLevel = context.filters.luxuryLevels[0];
      }
      if (context.filters.travelerTypes?.[0]) {
        filter.travelerType = context.filters.travelerTypes[0];
      }
      if (context.filters.regions?.[0]) {
        filter.region = context.filters.regions[0];
      }
      if (context.filters.countries?.[0]) {
        filter.country = context.filters.countries[0];
      }
      if (context.filters.seasons?.[0]) {
        filter.season = context.filters.seasons[0];
      }
      if (context.filters.seasonModifiers?.[0]) {
        filter.seasonModifier = context.filters.seasonModifiers[0];
      }
    }

    return filter;
  }

  /**
   * Map Weaviate search results to KnowledgeResult
   */
  private mapToKnowledgeResults(
    searchResult: KnowledgeSearchResult,
    queryDate: Date
  ): KnowledgeResult[] {
    const { knowledge, scores, relevanceScores } = searchResult;

    return knowledge
      .map((k, i) => ({
        ...k,
        score: scores[i] || 0,
        relevanceScore: relevanceScores[i] || 0,
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Apply temporal decay to search results
   * (Already handled by WeaviateStorage, this is a utility for manual calculations)
   */
  applyTemporalDecay(results: KnowledgeResult[], queryDate: Date): KnowledgeResult[] {
    return results
      .map((result) => {
        const decayFactor = this.calculateDecayFactor(result, queryDate);
        return {
          ...result,
          relevanceScore: result.score * decayFactor,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate temporal decay factor (0-1)
   */
  private calculateDecayFactor(knowledge: TravelKnowledge, currentDate: Date): number {
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
}

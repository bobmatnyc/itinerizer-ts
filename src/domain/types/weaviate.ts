/**
 * Weaviate-specific types for travel knowledge graph
 * @module domain/types/weaviate
 */

/**
 * Temporal type for knowledge decay and relevance
 */
export const TemporalType = {
  /** Always relevant information (e.g., historical facts, geography) */
  EVERGREEN: 'evergreen',
  /** Seasonal information (e.g., weather patterns, seasonal events) */
  SEASONAL: 'seasonal',
  /** Time-bound events (e.g., festivals, exhibitions) */
  EVENT: 'event',
  /** Time-sensitive information (e.g., COVID restrictions, construction) */
  TIME_SENSITIVE: 'time_sensitive',
} as const;

export type TemporalType = (typeof TemporalType)[keyof typeof TemporalType];

/**
 * Knowledge category for classification
 */
export const KnowledgeCategory = {
  /** Destination information */
  DESTINATION: 'destination',
  /** Activity and attraction information */
  ACTIVITY: 'activity',
  /** Event information (festivals, concerts, etc.) */
  EVENT: 'event',
  /** Weather and climate information */
  WEATHER: 'weather',
  /** Travel tips and advice */
  TIP: 'tip',
  /** Restrictions and regulations */
  RESTRICTION: 'restriction',
} as const;

export type KnowledgeCategory = (typeof KnowledgeCategory)[keyof typeof KnowledgeCategory];

/**
 * Source of knowledge
 */
export const KnowledgeSource = {
  /** From Trip Designer chat sessions */
  TRIP_DESIGNER: 'trip_designer',
  /** From web search results */
  WEB_SEARCH: 'web_search',
  /** From user input */
  USER_INPUT: 'user_input',
  /** From bulk import */
  BULK_IMPORT: 'bulk_import',
} as const;

export type KnowledgeSource = (typeof KnowledgeSource)[keyof typeof KnowledgeSource];

/**
 * Trip type categorization
 */
export const TripType = {
  /** Leisure and vacation trips */
  LEISURE: 'leisure',
  /** Business and work trips */
  BUSINESS: 'business',
  /** Adventure and outdoor activities */
  ADVENTURE: 'adventure',
  /** Cultural exploration and heritage */
  CULTURAL: 'cultural',
  /** Relaxation and wellness */
  RELAXATION: 'relaxation',
} as const;

export type TripType = (typeof TripType)[keyof typeof TripType];

/**
 * Luxury level categorization
 */
export const LuxuryLevel = {
  /** Budget travel (under $100/day) */
  BUDGET: 'budget',
  /** Moderate comfort ($100-300/day) */
  MODERATE: 'moderate',
  /** Luxury travel ($300-800/day) */
  LUXURY: 'luxury',
  /** Ultra-luxury ($800+/day) */
  ULTRA_LUXURY: 'ultra-luxury',
} as const;

export type LuxuryLevel = (typeof LuxuryLevel)[keyof typeof LuxuryLevel];

/**
 * Traveler type categorization
 */
export const TravelerType = {
  /** Family travel with children */
  FAMILY: 'family',
  /** Couple or romantic travel */
  COUPLE: 'couple',
  /** Solo travel */
  SOLO: 'solo',
  /** Friends traveling together */
  FRIENDS: 'friends',
  /** Group travel (tours, etc.) */
  GROUP: 'group',
} as const;

export type TravelerType = (typeof TravelerType)[keyof typeof TravelerType];

/**
 * Season categorization
 */
export const Season = {
  /** Spring season */
  SPRING: 'spring',
  /** Summer season */
  SUMMER: 'summer',
  /** Fall/Autumn season */
  FALL: 'fall',
  /** Winter season */
  WINTER: 'winter',
} as const;

export type Season = (typeof Season)[keyof typeof Season];

/**
 * Season modifier for fine-grained seasonal information
 */
export const SeasonModifier = {
  /** Early in the season (days 1-10 of month) */
  EARLY: 'early',
  /** Mid-season (days 11-20 of month) */
  MID: 'mid',
  /** Late in the season (days 21-31 of month) */
  LATE: 'late',
} as const;

export type SeasonModifier = (typeof SeasonModifier)[keyof typeof SeasonModifier];

/**
 * Travel knowledge document stored in Weaviate
 */
export interface TravelKnowledge {
  /** Unique identifier */
  id: string;
  /** Content for embedding (searchable text) */
  content: string;
  /** Original raw content */
  rawContent: string;
  /** Category of knowledge */
  category: KnowledgeCategory;
  /** Subcategory for finer classification */
  subcategory?: string;
  /** Source of the knowledge */
  source: KnowledgeSource;
  /** Source URL if from web */
  sourceUrl?: string;
  /** Session ID for grouping related knowledge */
  sessionId?: string;
  /** Associated itinerary ID */
  itineraryId?: string;
  /** Destination name */
  destinationName?: string;
  /** When the knowledge was created */
  createdAt: Date;
  /** Start date for relevance (for events/seasonal) */
  relevantFrom?: Date;
  /** End date for relevance (for events/seasonal) */
  relevantUntil?: Date;
  /** Temporal type for decay calculation */
  temporalType: TemporalType;
  /** Decay half-life in days (how long until relevance drops 50%) */
  decayHalfLife: number;
  /** Base relevance score (0-1) */
  baseRelevance: number;
  /** Trip type (null = applicable to all types) */
  tripType?: TripType | null;
  /** Luxury level (null = applicable to all levels) */
  luxuryLevel?: LuxuryLevel | null;
  /** Traveler type (null = applicable to all traveler types) */
  travelerType?: TravelerType | null;
  /** Geographic region */
  region?: string;
  /** Country name */
  country?: string;
  /** Season (for seasonal knowledge) */
  season?: Season;
  /** Season modifier (early/mid/late) */
  seasonModifier?: SeasonModifier;
}

/**
 * Destination entity in Weaviate
 */
export interface Destination {
  /** Unique identifier */
  id: string;
  /** Destination name */
  name: string;
  /** Country */
  country: string;
  /** Region/state/province */
  region?: string;
  /** City/town */
  city?: string;
  /** Geographic coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  /** Destination description */
  description?: string;
  /** Popular for (tags) */
  popularFor?: string[];
  /** Best months to visit (1-12) */
  bestMonths?: number[];
  /** Average budget category */
  budgetCategory?: string;
  /** When this destination info was created */
  createdAt: Date;
  /** When this destination info was last updated */
  updatedAt: Date;
}

/**
 * Itinerary reference in Weaviate (for cross-referencing)
 */
export interface ItineraryReference {
  /** Itinerary ID */
  id: string;
  /** Trip title */
  title: string;
  /** Primary destination */
  destination: string;
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
  /** Total budget */
  budget?: number;
  /** When created */
  createdAt: Date;
}

/**
 * Weaviate configuration
 */
export interface WeaviateConfig {
  /** Weaviate Cloud URL */
  url: string;
  /** API key for authentication */
  apiKey: string;
  /** gRPC URL (optional, for performance) */
  grpcUrl?: string;
  /** OpenAI API key for embeddings (if using text2vec-openai) */
  openaiKey?: string;
}

/**
 * Knowledge search filter
 */
export interface KnowledgeSearchFilter {
  /** Filter by category */
  category?: KnowledgeCategory;
  /** Filter by source */
  source?: KnowledgeSource;
  /** Filter by destination */
  destinationName?: string;
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by itinerary ID */
  itineraryId?: string;
  /** Filter by temporal type */
  temporalType?: TemporalType;
  /** Filter by date range (knowledge relevant at this time) */
  relevantAt?: Date;
  /** Minimum relevance score */
  minRelevance?: number;
  /** Filter by trip type */
  tripType?: TripType;
  /** Filter by luxury level */
  luxuryLevel?: LuxuryLevel;
  /** Filter by traveler type */
  travelerType?: TravelerType;
  /** Filter by region */
  region?: string;
  /** Filter by country */
  country?: string;
  /** Filter by season */
  season?: Season;
  /** Filter by season modifier */
  seasonModifier?: SeasonModifier;
}

/**
 * Category filter for multi-faceted search
 */
export interface CategoryFilter {
  /** Trip types to match (OR logic) */
  tripTypes?: TripType[];
  /** Luxury levels to match (OR logic) */
  luxuryLevels?: LuxuryLevel[];
  /** Traveler types to match (OR logic) */
  travelerTypes?: TravelerType[];
  /** Regions to match (OR logic) */
  regions?: string[];
  /** Countries to match (OR logic) */
  countries?: string[];
  /** Seasons to match (OR logic) */
  seasons?: Season[];
  /** Season modifiers to match (OR logic) */
  seasonModifiers?: SeasonModifier[];
}

/**
 * Knowledge search result
 */
export interface KnowledgeSearchResult {
  /** Matching knowledge documents */
  knowledge: TravelKnowledge[];
  /** Similarity scores (0-1) */
  scores: number[];
  /** Relevance scores (adjusted by temporal decay) */
  relevanceScores: number[];
}

/**
 * Weaviate storage statistics
 */
export interface WeaviateStats {
  /** Total knowledge documents */
  totalKnowledge: number;
  /** Total destinations */
  totalDestinations: number;
  /** Total itinerary references */
  totalItineraries: number;
  /** Knowledge by category */
  knowledgeByCategory: Record<KnowledgeCategory, number>;
  /** Knowledge by source */
  knowledgeBySource: Record<KnowledgeSource, number>;
  /** Knowledge by temporal type */
  knowledgeByTemporalType: Record<TemporalType, number>;
}

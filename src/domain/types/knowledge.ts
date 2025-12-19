/**
 * Knowledge graph and vector storage types
 * @module domain/types/knowledge
 */

/**
 * Types of vector documents that can be stored
 */
export const VectorDocumentType = {
  CHAT: 'chat',
  ENTITY: 'entity',
  PREFERENCE: 'preference',
} as const;

export type VectorDocumentType = (typeof VectorDocumentType)[keyof typeof VectorDocumentType];

/**
 * Categories for entity extraction
 */
export const EntityCategory = {
  DESTINATION: 'destination',
  ACTIVITY: 'activity',
  BUDGET: 'budget',
  ACCOMMODATION: 'accommodation',
  TRANSPORT: 'transport',
  CUISINE: 'cuisine',
  TRAVELER_TYPE: 'traveler_type',
  TIMING: 'timing',
  OTHER: 'other',
} as const;

export type EntityCategory = (typeof EntityCategory)[keyof typeof EntityCategory];

/**
 * Budget categories for generalization
 */
export const BudgetCategory = {
  BUDGET: 'budget',
  MID_RANGE: 'mid-range',
  LUXURY: 'luxury',
  ULTRA_LUXURY: 'ultra-luxury',
} as const;

export type BudgetCategory = (typeof BudgetCategory)[keyof typeof BudgetCategory];

/**
 * Vector document stored in the knowledge graph
 */
export interface VectorDocument {
  /** Unique identifier */
  id: string;
  /** Anonymized content */
  content: string;
  /** Vector embedding (optional - generated on demand) */
  embedding?: number[];
  /** Metadata for filtering and context */
  metadata: VectorDocumentMetadata;
}

/**
 * Metadata attached to vector documents
 */
export interface VectorDocumentMetadata {
  /** Type of document */
  type: VectorDocumentType;
  /** Category for entity documents */
  category?: EntityCategory;
  /** Budget category for budget-related entities */
  budgetCategory?: BudgetCategory;
  /** When the document was created */
  timestamp: Date;
  /** Session identifier (for grouping related queries) */
  sessionId?: string;
  /** Original content before anonymization (for debugging) */
  originalHash?: string;
}

/**
 * Result of anonymization process
 */
export interface AnonymizationResult {
  /** Anonymized text */
  anonymized: string;
  /** Number of PII items removed */
  piiRemoved: number;
  /** Types of PII that were removed */
  piiTypes: PIIType[];
  /** Original content hash (for tracking) */
  originalHash: string;
}

/**
 * Types of PII that can be detected and removed
 */
export const PIIType = {
  NAME: 'name',
  EMAIL: 'email',
  PHONE: 'phone',
  ADDRESS: 'address',
  CREDIT_CARD: 'credit_card',
  SSN: 'ssn',
  DATE: 'date',
  LOCATION: 'location',
} as const;

export type PIIType = (typeof PIIType)[keyof typeof PIIType];

/**
 * Configuration for anonymization
 */
export interface AnonymizationConfig {
  /** Remove personal names */
  removeNames?: boolean;
  /** Remove email addresses */
  removeEmails?: boolean;
  /** Remove phone numbers */
  removePhones?: boolean;
  /** Remove specific addresses */
  removeAddresses?: boolean;
  /** Generalize dates to periods */
  generalizeDates?: boolean;
  /** Generalize locations to region level */
  generalizeLocations?: boolean;
  /** Categorize budget amounts */
  categorizeBudgets?: boolean;
}

/**
 * Search result from vector database
 */
export interface VectorSearchResult {
  /** Matching documents */
  documents: VectorDocument[];
  /** Similarity scores (0-1) */
  scores: number[];
}

/**
 * Extracted entity from conversation
 */
export interface ExtractedEntity {
  /** Entity text (anonymized) */
  text: string;
  /** Category of entity */
  category: EntityCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Original context (anonymized) */
  context?: string;
}

/**
 * Types for document import pipeline
 * @module domain/types/import
 */

import type { Itinerary } from './itinerary.js';

/**
 * Token usage for a single LLM call
 */
export interface TokenUsage {
  /** Model identifier (e.g., 'anthropic/claude-3-haiku') */
  model: string;
  /** Number of input tokens */
  inputTokens: number;
  /** Number of output tokens */
  outputTokens: number;
  /** Estimated cost in USD */
  costUSD: number;
  /** Timestamp of the call */
  timestamp: Date;
}

/**
 * Model pricing information (per million tokens)
 */
export interface ModelPricing {
  /** Model identifier */
  model: string;
  /** Cost per million input tokens in USD */
  inputPerMillion: number;
  /** Cost per million output tokens in USD */
  outputPerMillion: number;
}

/**
 * Known model pricing (as of 2024)
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'anthropic/claude-3-haiku': {
    model: 'anthropic/claude-3-haiku',
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
  },
  'anthropic/claude-3-5-haiku': {
    model: 'anthropic/claude-3-5-haiku',
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
  },
  'meta-llama/llama-3-8b-instruct': {
    model: 'meta-llama/llama-3-8b-instruct',
    inputPerMillion: 0.06,
    outputPerMillion: 0.06,
  },
  'meta-llama/llama-3.1-8b-instruct': {
    model: 'meta-llama/llama-3.1-8b-instruct',
    inputPerMillion: 0.06,
    outputPerMillion: 0.06,
  },
  'mistralai/mistral-7b-instruct': {
    model: 'mistralai/mistral-7b-instruct',
    inputPerMillion: 0.06,
    outputPerMillion: 0.06,
  },
  'google/gemma-7b-it': {
    model: 'google/gemma-7b-it',
    inputPerMillion: 0.07,
    outputPerMillion: 0.07,
  },
};

/**
 * Default model for import operations
 */
export const DEFAULT_IMPORT_MODEL = 'anthropic/claude-3-haiku';

/**
 * Result of importing a document
 */
export interface ImportResult {
  /** Unique import ID */
  id: string;
  /** Source file path */
  sourceFile: string;
  /** Extracted markdown (intermediate representation) */
  extractedMarkdown: string;
  /** Parsed itinerary */
  parsedItinerary: Itinerary;
  /** Token usage for the LLM call */
  usage: TokenUsage;
  /** Import timestamp */
  timestamp: Date;
}

/**
 * Result of model testing
 */
export interface ModelTestResult {
  /** Model identifier */
  model: string;
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed itinerary (if successful) */
  itinerary?: Itinerary;
  /** Error message (if failed) */
  error?: string;
  /** Token usage */
  usage: TokenUsage;
  /** Time taken in milliseconds */
  durationMs: number;
}

/**
 * PDF extraction result
 */
export interface PDFExtractionResult {
  /** Extracted raw text */
  text: string;
  /** Number of pages */
  pages: number;
  /** Page-by-page text (if available) */
  pageTexts?: string[];
  /** PDF metadata */
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Structured markdown section
 */
export interface MarkdownSection {
  /** Section type */
  type: 'header' | 'dates' | 'flight' | 'hotel' | 'activity' | 'transfer' | 'text';
  /** Section title (if any) */
  title?: string;
  /** Section content */
  content: string;
  /** Extracted data (inferred from content) */
  data?: Record<string, unknown>;
  /** Source line numbers */
  lineNumbers?: [number, number];
}

/**
 * Structured markdown result
 */
export interface StructuredMarkdown {
  /** Overall title (if detected) */
  title?: string;
  /** Trip date range (if detected) */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  /** Markdown sections */
  sections: MarkdownSection[];
  /** Full markdown text */
  markdown: string;
  /** Confidence scores for inferred data */
  confidence: {
    title: number;
    dates: number;
    flights: number;
    hotels: number;
    activities: number;
  };
}

/**
 * SerpAPI configuration
 */
export interface SerpApiConfig {
  /** SerpAPI API key */
  apiKey: string;
}

/**
 * Import configuration
 */
export interface ImportConfig {
  /** OpenRouter API key */
  apiKey: string;
  /** Default model for imports */
  defaultModel?: string;
  /** Maximum tokens for LLM response */
  maxTokens?: number;
  /** Temperature for LLM (0-1) */
  temperature?: number;
  /** Enable cost tracking */
  costTrackingEnabled?: boolean;
  /** Path for cost log file */
  costLogPath?: string;
  /** SerpAPI configuration (optional) */
  serpapi?: SerpApiConfig;
}

/**
 * Trip Designer Agent types
 * @module domain/types/trip-designer
 */

import type { ItineraryId, SegmentId } from './branded.js';

/**
 * Branded type for session IDs
 */
export type SessionId = string & { readonly __brand: 'SessionId' };

/**
 * Generate a new session ID
 */
export function generateSessionId(): SessionId {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` as SessionId;
}

/**
 * Message role in conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * Tool call made by the assistant
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string of arguments
  };
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  toolCallId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Message in conversation history
 */
export interface Message {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: Date;
  tokens?: {
    input?: number;
    output?: number;
  };
}

/**
 * Trip profile extracted from conversation
 */
export interface TripProfile {
  /** Traveler demographics */
  travelers: {
    count: number;
    ages?: number[];
    relationships?: string; // "family", "couple", "solo", "friends", "group"
  };

  /** Budget information */
  budget?: {
    total?: number;
    currency?: string;
    flexibility?: 'strict' | 'flexible' | 'no_limit';
    perPerson?: boolean;
  };

  /** Travel style preferences */
  travelStyle?: string[]; // "luxury", "budget", "adventure", "relaxed", "cultural", "beach"
  accommodationPreference?: string; // "hotel", "resort", "airbnb", "hostel", "boutique"
  pacePreference?: 'packed' | 'balanced' | 'leisurely';

  /** Dietary and mobility needs */
  dietaryRestrictions?: string[]; // "vegetarian", "vegan", "halal", "kosher", "gluten-free"
  mobilityNeeds?: string[]; // "wheelchair", "limited_walking", "no_stairs"
  allergies?: string[];

  /** Interests and preferences */
  interests?: string[]; // "food", "culture", "nature", "shopping", "nightlife", "history", "art"
  mustSee?: string[]; // Specific attractions or experiences
  avoidances?: string[]; // Things to avoid

  /** Metadata */
  extractedAt: Date;
  confidence: number; // 0-1 score indicating confidence in extracted profile
}

/**
 * Trip designer session
 */
export interface TripDesignerSession {
  id: SessionId;
  itineraryId: ItineraryId;
  messages: Message[];
  tripProfile: TripProfile;
  createdAt: Date;
  lastActiveAt: Date;
  metadata: {
    messageCount: number;
    totalTokens: number;
    lastCompactedAt?: Date;
    costUSD?: number;
  };
}

/**
 * Session summary for listing
 */
export interface SessionSummary {
  id: SessionId;
  itineraryId: ItineraryId;
  messageCount: number;
  lastActiveAt: Date;
  preview: string; // First user message
}

/**
 * Question option for structured questions
 */
export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Structured question for UI rendering
 */
export interface StructuredQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'date_range' | 'text';
  question: string;
  context?: string; // Additional explanation
  options?: QuestionOption[];
  scale?: {
    min: number;
    max: number;
    step?: number;
    minLabel?: string;
    maxLabel?: string;
  };
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Suggested action for the user
 */
export interface SuggestedAction {
  type: 'add_flight' | 'add_hotel' | 'search_hotels' | 'search_flights' | 'view_map' | 'view_budget' | 'custom';
  label: string;
  description?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent response to user message
 */
export interface AgentResponse {
  message: string; // Natural language response
  structuredQuestions?: StructuredQuestion[];
  itineraryUpdated?: boolean;
  segmentsModified?: SegmentId[];
  toolCallsMade?: ToolCall[];
  suggestedActions?: SuggestedAction[];
  tripProfileUpdated?: boolean;
}

/**
 * Tool definition for OpenRouter function calling
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, JSONSchemaProperty>;
      required: string[];
    };
  };
}

/**
 * JSON Schema property definition
 */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  format?: string;
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  sessionId: SessionId;
  itineraryId: ItineraryId;
  toolCall: ToolCall;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolCallId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  metadata?: {
    executionTimeMs?: number;
    segmentId?: SegmentId;
    itineraryVersion?: number;
  };
}

/**
 * Trip designer configuration
 */
export interface TripDesignerConfig {
  /** OpenRouter API key */
  apiKey: string;

  /** Model to use (default: claude-3.5-sonnet:online) */
  model?: string;

  /** SERP API key for search tools (optional) */
  serpApiKey?: string;

  /** Maximum tokens for completion */
  maxTokens?: number;

  /** Temperature for generation */
  temperature?: number;

  /** Cost limit per session (USD) */
  sessionCostLimit?: number;

  /** Enable streaming responses */
  streaming?: boolean;

  /** Context compaction threshold (% of max tokens) */
  compactionThreshold?: number;
}

/**
 * Trip designer error types
 */
export type TripDesignerError =
  | { type: 'session_not_found'; sessionId: SessionId }
  | { type: 'itinerary_not_found'; itineraryId: ItineraryId }
  | { type: 'tool_execution_failed'; tool: string; error: string }
  | { type: 'llm_api_error'; error: string; retryable: boolean }
  | { type: 'context_limit_exceeded'; tokens: number; limit: number }
  | { type: 'invalid_tool_call'; tool: string; validation: string }
  | { type: 'cost_limit_exceeded'; cost: number; limit: number }
  | { type: 'rate_limit_exceeded'; retryAfter?: number };

/**
 * Cost metrics for a session
 */
export interface CostMetrics {
  totalCostUSD: number;
  inputTokens: number;
  outputTokens: number;
  toolExecutions: number;
  searchApiCalls: number;
  breakdown: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  }[];
}

/**
 * Search result from SERP API
 */
export interface SearchResult {
  type: 'flight' | 'hotel' | 'transfer' | 'web';
  results: unknown[];
  metadata?: {
    queryTime: Date;
    resultCount: number;
    source: string;
  };
}

/**
 * Token usage data
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * Cost data
 */
export interface CostData {
  input: number;
  output: number;
  total: number;
}

/**
 * Stream event types for SSE
 */
export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: unknown; success: boolean }
  | { type: 'structured_questions'; questions: StructuredQuestion[] }
  | { type: 'done'; itineraryUpdated: boolean; segmentsModified?: SegmentId[]; tokens?: TokenUsage; cost?: CostData }
  | { type: 'error'; message: string };

/**
 * SSE message format
 */
export interface SSEMessage {
  event: string;
  data: string;
}

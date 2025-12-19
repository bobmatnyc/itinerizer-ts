/**
 * Agent mode types and configuration
 * @module domain/types/agent
 */

/**
 * Agent operating modes
 * - dream: Creative, imprecise - for gap filling, can invent plausible times/routes
 * - plan: Precise, real schedules - uses actual flight schedules, real hotel availability
 * - book: Actual bookable tickets - real-time availability, actual prices, booking links (TBD)
 */
export type AgentMode = 'dream' | 'plan' | 'book';

/**
 * Configuration for agent mode behavior
 */
export interface AgentModeConfig {
  /** Operating mode */
  mode: AgentMode;

  /**
   * Dream mode characteristics:
   * - Can invent plausible times/routes
   * - Doesn't need real schedules
   * - Uses SerpAPI only for plausibility checks
   * - Best for: Filling transportation gaps in itineraries
   */
  dreamModeSettings?: {
    /** Whether to use SerpAPI for plausibility validation */
    usePlausibilityChecks?: boolean;
    /** Minimum confidence threshold (0-1) for accepting generated segments */
    minConfidence?: number;
    /** Allow approximate times and durations */
    allowApproximateTimes?: boolean;
  };

  /**
   * Plan mode characteristics:
   * - Uses actual flight schedules from SerpAPI
   * - Real hotel availability
   * - Plausible ground transport (taxi ~30min, uber on-demand)
   * - Best for: Detailed trip planning with real options
   */
  planModeSettings?: {
    /** Whether to verify real-time availability */
    verifyAvailability?: boolean;
    /** Include price information when available */
    includePricing?: boolean;
    /** Maximum price threshold for filtering options */
    maxPriceThreshold?: number;
  };

  /**
   * Book mode characteristics (TBD):
   * - Real-time availability
   * - Actual prices
   * - Booking links
   * - Best for: Ready-to-book itineraries
   */
  bookModeSettings?: {
    /** Enable booking link generation */
    generateBookingLinks?: boolean;
    /** Verify real-time pricing before presenting */
    verifyRealTimePricing?: boolean;
    /** Include cancellation policies */
    includeCancellationPolicies?: boolean;
  };
}

/**
 * Default agent mode configuration
 */
export const DEFAULT_AGENT_MODE: AgentMode = 'dream';

/**
 * Default configuration for dream mode
 */
export const DEFAULT_DREAM_MODE_CONFIG: Required<NonNullable<AgentModeConfig['dreamModeSettings']>> = {
  usePlausibilityChecks: false,
  minConfidence: 0.5,
  allowApproximateTimes: true,
};

/**
 * Default configuration for plan mode
 */
export const DEFAULT_PLAN_MODE_CONFIG: Required<NonNullable<AgentModeConfig['planModeSettings']>> = {
  verifyAvailability: true,
  includePricing: true,
  maxPriceThreshold: Number.POSITIVE_INFINITY,
};

/**
 * Default configuration for book mode
 */
export const DEFAULT_BOOK_MODE_CONFIG: Required<NonNullable<AgentModeConfig['bookModeSettings']>> = {
  generateBookingLinks: true,
  verifyRealTimePricing: true,
  includeCancellationPolicies: true,
};

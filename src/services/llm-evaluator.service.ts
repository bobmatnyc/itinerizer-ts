/**
 * LLM Evaluator Service - Testing framework for comparing models
 * @module services/llm-evaluator
 */

import type { Itinerary } from '../domain/types/itinerary.js';
import type { Segment } from '../domain/types/segment.js';
import type { AgentMode } from '../domain/types/agent.js';
import type { TripProfile } from '../domain/types/trip-taxonomy.js';
import { inferTripProfile } from '../domain/types/trip-taxonomy.js';
import type { Result } from '../core/result.js';
import type { StorageError, ValidationError } from '../core/errors.js';

/**
 * Qualitative evaluation metrics (0-1 scale)
 */
export interface QualitativeMetrics {
  /** Did the itinerary match the trip profile? */
  tripTypeAccuracy: number;
  /** Logical flow between segments */
  coherence: number;
  /** Interesting and creative suggestions */
  creativity: number;
  /** Realistic schedules and routes */
  practicality: number;
  /** All gaps filled appropriately */
  completeness: number;
}

/**
 * Quantitative evaluation metrics
 */
export interface QuantitativeMetrics {
  /** API cost in USD */
  cost: number;
  /** Response time in milliseconds */
  latency: number;
  /** Token usage */
  tokenUsage: {
    input: number;
    output: number;
  };
  /** Success rate (0-1, % successful parses) */
  successRate: number;
  /** Number of gaps filled */
  gapsFilled: number;
  /** Percentage of segments passing validation */
  validSegments: number;
}

/**
 * Composite scoring metrics
 */
export interface CompositeScores {
  /** Weighted overall score (0-1) */
  overall: number;
  /** Quality per dollar spent */
  costEfficiency: number;
  /** Quality per second spent */
  speedEfficiency: number;
}

/**
 * Complete LLM evaluation criteria
 */
export interface LLMEvaluationCriteria {
  qualitative: QualitativeMetrics;
  quantitative: QuantitativeMetrics;
  scores: CompositeScores;
}

/**
 * Test case for model evaluation
 */
export interface TestCase {
  /** Test case identifier */
  id: string;
  /** Test case name */
  name: string;
  /** Input markdown or text */
  input: string;
  /** Expected trip profile */
  expectedProfile?: TripProfile;
  /** Expected number of segments */
  expectedSegmentCount?: number;
  /** Expected segment types */
  expectedSegmentTypes?: string[];
  /** Test metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of testing a single model
 */
export interface ModelTestResult {
  /** Model identifier */
  model: string;
  /** Agent mode used */
  mode: AgentMode;
  /** Trip profile (expected or inferred) */
  tripProfile: TripProfile;
  /** Evaluation criteria */
  evaluation: LLMEvaluationCriteria;
  /** Generated itinerary (optional) */
  generatedItinerary?: Itinerary;
  /** Errors encountered (optional) */
  errors?: string[];
}

/**
 * Comparison report across multiple models
 */
export interface ModelComparisonReport {
  /** Test case identifier */
  testCaseId: string;
  /** Results for each model */
  results: ModelTestResult[];
  /** Best model for this test case */
  bestModel: {
    overall: string;
    costEfficient: string;
    fastest: string;
    highestQuality: string;
  };
  /** Summary statistics */
  summary: {
    averageCost: number;
    averageLatency: number;
    averageQuality: number;
  };
}

/**
 * Optimization criteria for finding best model
 */
export type OptimizationCriteria = 'quality' | 'cost' | 'speed' | 'balanced';

/**
 * Weights for composite scoring
 */
const QUALITY_WEIGHTS = {
  tripTypeAccuracy: 0.25,
  coherence: 0.25,
  creativity: 0.15,
  practicality: 0.20,
  completeness: 0.15,
} as const;

/**
 * Service for evaluating and comparing LLM models
 */
export class LLMEvaluatorService {
  /**
   * Evaluate a single model on a test case
   * @param model - Model identifier
   * @param testCase - Test case to evaluate
   * @param mode - Agent mode to use
   * @param executor - Function to execute the model and return itinerary
   * @returns Model test result
   */
  async evaluateModel(
    model: string,
    testCase: TestCase,
    mode: AgentMode,
    executor: (input: string, model: string) => Promise<Result<{
      itinerary: Itinerary;
      usage: { inputTokens: number; outputTokens: number; costUSD: number };
      durationMs: number;
    }, StorageError | ValidationError>>
  ): Promise<ModelTestResult> {
    const errors: string[] = [];

    try {
      // Execute the model
      const executionResult = await executor(testCase.input, model);

      if (!executionResult.success) {
        errors.push(executionResult.error.message);

        // Return failed result
        return {
          model,
          mode,
          tripProfile: testCase.expectedProfile || this.getDefaultProfile(),
          evaluation: this.getFailedEvaluation(),
          errors,
        };
      }

      const { itinerary, usage, durationMs } = executionResult.value;

      // Infer trip profile from generated itinerary
      const inferredProfile = inferTripProfile(itinerary.segments);
      const tripProfile = testCase.expectedProfile || inferredProfile;

      // Evaluate qualitative metrics
      const qualitative = this.evaluateQualitativeMetrics(
        itinerary,
        tripProfile,
        testCase
      );

      // Evaluate quantitative metrics
      const quantitative: QuantitativeMetrics = {
        cost: usage.costUSD,
        latency: durationMs,
        tokenUsage: {
          input: usage.inputTokens,
          output: usage.outputTokens,
        },
        successRate: 1.0, // Successful parse
        gapsFilled: itinerary.segments.filter(s => s.inferred).length,
        validSegments: this.calculateValidSegmentPercentage(itinerary.segments),
      };

      // Calculate composite scores
      const scores = this.calculateCompositeScores(qualitative, quantitative);

      const testResult: ModelTestResult = {
        model,
        mode,
        tripProfile,
        evaluation: {
          qualitative,
          quantitative,
          scores,
        },
        generatedItinerary: itinerary,
      };

      if (errors.length > 0) {
        testResult.errors = errors;
      }

      return testResult;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));

      return {
        model,
        mode,
        tripProfile: testCase.expectedProfile || this.getDefaultProfile(),
        evaluation: this.getFailedEvaluation(),
        errors,
      };
    }
  }

  /**
   * Compare multiple models on multiple test cases
   * @param models - Models to compare
   * @param testCases - Test cases to run
   * @param modes - Agent modes to test
   * @param executor - Function to execute models
   * @returns Comparison reports for each test case
   */
  async compareModels(
    models: string[],
    testCases: TestCase[],
    modes: AgentMode[],
    executor: (input: string, model: string) => Promise<Result<{
      itinerary: Itinerary;
      usage: { inputTokens: number; outputTokens: number; costUSD: number };
      durationMs: number;
    }, StorageError | ValidationError>>
  ): Promise<ModelComparisonReport[]> {
    const reports: ModelComparisonReport[] = [];

    for (const testCase of testCases) {
      const results: ModelTestResult[] = [];

      // Test each model with each mode
      for (const model of models) {
        for (const mode of modes) {
          const result = await this.evaluateModel(model, testCase, mode, executor);
          results.push(result);
        }
      }

      // Find best models
      const bestModel = this.findBestModels(results);

      // Calculate summary statistics
      const summary = this.calculateSummaryStatistics(results);

      reports.push({
        testCaseId: testCase.id,
        results,
        bestModel,
        summary,
      });
    }

    return reports;
  }

  /**
   * Find the best model for a specific use case
   * @param tripProfile - Trip profile requirements
   * @param mode - Agent mode
   * @param optimizeFor - Optimization criteria
   * @param models - Models to evaluate
   * @param testCases - Test cases to run
   * @param executor - Function to execute models
   * @returns Best model identifier
   */
  async findBestModel(
    _tripProfile: TripProfile, // Prefix with _ to indicate intentionally unused
    mode: AgentMode,
    optimizeFor: OptimizationCriteria,
    models: string[],
    testCases: TestCase[],
    executor: (input: string, model: string) => Promise<Result<{
      itinerary: Itinerary;
      usage: { inputTokens: number; outputTokens: number; costUSD: number };
      durationMs: number;
    }, StorageError | ValidationError>>
  ): Promise<string> {
    const results: ModelTestResult[] = [];

    // Evaluate all models
    for (const model of models) {
      for (const testCase of testCases) {
        const result = await this.evaluateModel(model, testCase, mode, executor);
        results.push(result);
      }
    }

    // Group by model and average scores
    const modelScores = new Map<string, number[]>();
    for (const result of results) {
      const existing = modelScores.get(result.model) || [];
      const score = this.getOptimizedScore(result.evaluation, optimizeFor);
      existing.push(score);
      modelScores.set(result.model, existing);
    }

    // Find model with best average score
    let bestModel = models[0] || '';
    let bestScore = 0;

    for (const [model, scores] of modelScores.entries()) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestModel = model;
      }
    }

    return bestModel;
  }

  /**
   * Evaluate qualitative metrics
   */
  private evaluateQualitativeMetrics(
    itinerary: Itinerary,
    tripProfile: TripProfile,
    testCase: TestCase
  ): QualitativeMetrics {
    // Trip type accuracy: Check if generated itinerary matches expected profile
    const inferredProfile = inferTripProfile(itinerary.segments);
    const tripTypeAccuracy = inferredProfile.primaryType === tripProfile.primaryType ? 1.0 : 0.5;

    // Coherence: Check geographic and temporal continuity
    const coherence = this.evaluateCoherence(itinerary.segments);

    // Creativity: Check for interesting/unique segment combinations
    const creativity = this.evaluateCreativity(itinerary.segments);

    // Practicality: Check for realistic times and durations
    const practicality = this.evaluatePracticality(itinerary.segments);

    // Completeness: Check if all expected segments are present
    const completeness = this.evaluateCompleteness(itinerary.segments, testCase);

    return {
      tripTypeAccuracy,
      coherence,
      creativity,
      practicality,
      completeness,
    };
  }

  /**
   * Evaluate geographic and temporal coherence
   */
  private evaluateCoherence(segments: Segment[]): number {
    if (segments.length === 0) return 0;

    let coherenceScore = 1.0;

    // Check temporal ordering
    const sorted = [...segments].sort((a, b) =>
      a.startDatetime.getTime() - b.startDatetime.getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (!current || !next) continue;

      // Penalize overlapping segments
      if (current.endDatetime > next.startDatetime) {
        coherenceScore -= 0.1;
      }

      // Penalize unrealistic gaps (> 24 hours without hotel)
      const gapHours = (next.startDatetime.getTime() - current.endDatetime.getTime()) / (1000 * 60 * 60);
      if (gapHours > 24 && current.type !== 'HOTEL' && next.type !== 'HOTEL') {
        coherenceScore -= 0.05;
      }
    }

    return Math.max(0, Math.min(1, coherenceScore));
  }

  /**
   * Evaluate creativity of suggestions
   */
  private evaluateCreativity(segments: Segment[]): number {
    // Simple heuristic: More diverse segment types = more creative
    const uniqueTypes = new Set(segments.map(s => s.type));
    const typeRatio = uniqueTypes.size / 6; // 6 possible types

    // Activities suggest more creative planning
    const activityRatio = segments.filter(s => s.type === 'ACTIVITY').length / segments.length;

    return Math.min(1, (typeRatio * 0.5) + (activityRatio * 0.5));
  }

  /**
   * Evaluate practicality of schedules
   */
  private evaluatePracticality(segments: Segment[]): number {
    let practicalityScore = 1.0;

    for (const segment of segments) {
      const duration = segment.endDatetime.getTime() - segment.startDatetime.getTime();
      const durationHours = duration / (1000 * 60 * 60);

      // Penalize unrealistic durations
      if (segment.type === 'FLIGHT' && durationHours > 20) {
        practicalityScore -= 0.1; // Very long flight
      }
      if (segment.type === 'TRANSFER' && durationHours > 3) {
        practicalityScore -= 0.1; // Very long transfer
      }
      if (segment.type === 'ACTIVITY' && durationHours > 12) {
        practicalityScore -= 0.1; // Very long activity
      }
    }

    return Math.max(0, Math.min(1, practicalityScore));
  }

  /**
   * Evaluate completeness of itinerary
   */
  private evaluateCompleteness(segments: Segment[], testCase: TestCase): number {
    if (!testCase.expectedSegmentCount) {
      return 1.0; // No expectation, assume complete
    }

    const actualCount = segments.length;
    const expectedCount = testCase.expectedSegmentCount;

    // Calculate ratio, penalize both under and over
    const ratio = actualCount / expectedCount;
    if (ratio >= 0.8 && ratio <= 1.2) {
      return 1.0; // Within 20% of expected
    }

    return Math.max(0, 1 - Math.abs(1 - ratio));
  }

  /**
   * Calculate percentage of valid segments
   */
  private calculateValidSegmentPercentage(segments: Segment[]): number {
    if (segments.length === 0) return 0;

    let validCount = 0;
    for (const segment of segments) {
      // Check if segment has required fields populated
      const hasValidDates = segment.startDatetime < segment.endDatetime;
      const hasValidType = segment.type !== undefined;

      if (hasValidDates && hasValidType) {
        validCount++;
      }
    }

    return validCount / segments.length;
  }

  /**
   * Calculate composite scores
   */
  private calculateCompositeScores(
    qualitative: QualitativeMetrics,
    quantitative: QuantitativeMetrics
  ): CompositeScores {
    // Overall quality score (weighted average of qualitative metrics)
    const overall =
      qualitative.tripTypeAccuracy * QUALITY_WEIGHTS.tripTypeAccuracy +
      qualitative.coherence * QUALITY_WEIGHTS.coherence +
      qualitative.creativity * QUALITY_WEIGHTS.creativity +
      qualitative.practicality * QUALITY_WEIGHTS.practicality +
      qualitative.completeness * QUALITY_WEIGHTS.completeness;

    // Cost efficiency (quality per dollar)
    const costEfficiency = quantitative.cost > 0 ? overall / quantitative.cost : overall;

    // Speed efficiency (quality per second)
    const speedEfficiency = quantitative.latency > 0 ? overall / (quantitative.latency / 1000) : overall;

    return {
      overall,
      costEfficiency,
      speedEfficiency,
    };
  }

  /**
   * Find best models across different criteria
   */
  private findBestModels(results: ModelTestResult[]): {
    overall: string;
    costEfficient: string;
    fastest: string;
    highestQuality: string;
  } {
    if (results.length === 0) {
      return { overall: '', costEfficient: '', fastest: '', highestQuality: '' };
    }

    const sortedByOverall = [...results].sort((a, b) =>
      b.evaluation.scores.overall - a.evaluation.scores.overall
    );
    const sortedByCost = [...results].sort((a, b) =>
      b.evaluation.scores.costEfficiency - a.evaluation.scores.costEfficiency
    );
    const sortedBySpeed = [...results].sort((a, b) =>
      b.evaluation.scores.speedEfficiency - a.evaluation.scores.speedEfficiency
    );
    const sortedByQuality = [...results].sort((a, b) =>
      b.evaluation.scores.overall - a.evaluation.scores.overall
    );

    return {
      overall: sortedByOverall[0]?.model || '',
      costEfficient: sortedByCost[0]?.model || '',
      fastest: sortedBySpeed[0]?.model || '',
      highestQuality: sortedByQuality[0]?.model || '',
    };
  }

  /**
   * Calculate summary statistics across results
   */
  private calculateSummaryStatistics(results: ModelTestResult[]): {
    averageCost: number;
    averageLatency: number;
    averageQuality: number;
  } {
    if (results.length === 0) {
      return { averageCost: 0, averageLatency: 0, averageQuality: 0 };
    }

    const totalCost = results.reduce((sum, r) => sum + r.evaluation.quantitative.cost, 0);
    const totalLatency = results.reduce((sum, r) => sum + r.evaluation.quantitative.latency, 0);
    const totalQuality = results.reduce((sum, r) => sum + r.evaluation.scores.overall, 0);

    return {
      averageCost: totalCost / results.length,
      averageLatency: totalLatency / results.length,
      averageQuality: totalQuality / results.length,
    };
  }

  /**
   * Get optimized score based on criteria
   */
  private getOptimizedScore(
    evaluation: LLMEvaluationCriteria,
    optimizeFor: OptimizationCriteria
  ): number {
    switch (optimizeFor) {
      case 'quality':
        return evaluation.scores.overall;
      case 'cost':
        return evaluation.scores.costEfficiency;
      case 'speed':
        return evaluation.scores.speedEfficiency;
      case 'balanced':
        return (
          evaluation.scores.overall * 0.5 +
          evaluation.scores.costEfficiency * 0.25 +
          evaluation.scores.speedEfficiency * 0.25
        );
    }
  }

  /**
   * Get default trip profile for failed evaluations
   */
  private getDefaultProfile(): TripProfile {
    return {
      primaryType: 'business',
      travelers: { adults: 1 },
    };
  }

  /**
   * Get failed evaluation with zero scores
   */
  private getFailedEvaluation(): LLMEvaluationCriteria {
    return {
      qualitative: {
        tripTypeAccuracy: 0,
        coherence: 0,
        creativity: 0,
        practicality: 0,
        completeness: 0,
      },
      quantitative: {
        cost: 0,
        latency: 0,
        tokenUsage: { input: 0, output: 0 },
        successRate: 0,
        gapsFilled: 0,
        validSegments: 0,
      },
      scores: {
        overall: 0,
        costEfficiency: 0,
        speedEfficiency: 0,
      },
    };
  }
}

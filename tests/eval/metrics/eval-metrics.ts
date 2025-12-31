/**
 * Metric calculation helpers for AI quality evaluation
 */

import type { SSEEvent } from '../../helpers/sse-parser.js';
import type { Itinerary } from '../../../src/domain/types/index.js';
import { evaluateOneQuestionRule } from './format-compliance.js';

/**
 * Conversation turn result
 */
export interface TurnResult {
  message: string;
  events: SSEEvent[];
  text: string;
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
  segmentCount: number;
  hasError: boolean;
}

/**
 * Quality metrics for a scenario
 */
export interface ScenarioMetrics {
  segmentCreationRate: number; // % of requests that added segments
  toolUseAccuracy: number; // % of correct tools used
  oneQuestionCompliance: number; // % of responses with ONE question
  formatCompliance: number; // % of properly formatted responses
  contextRetention: number; // % of turns with correct context
  finalCompleteness: number; // % of required segment types present
  overallScore: number; // Weighted average
}

/**
 * Calculate segment creation rate
 * Measures how effectively AI adds segments to itinerary
 */
export function calculateSegmentCreationRate(
  turnResults: TurnResult[],
  expectedSegmentAdds: number[]
): number {
  let segmentAddsCount = 0;
  let expectedAddsCount = 0;

  for (let i = 0; i < turnResults.length; i++) {
    if (expectedSegmentAdds[i] > 0) {
      expectedAddsCount++;

      // Check if segments were actually added
      const prevSegments = i > 0 ? turnResults[i - 1].segmentCount : 0;
      const currentSegments = turnResults[i].segmentCount;

      if (currentSegments > prevSegments) {
        segmentAddsCount++;
      }
    }
  }

  return expectedAddsCount > 0 ? segmentAddsCount / expectedAddsCount : 0;
}

/**
 * Calculate tool use accuracy
 * Measures if AI uses correct tools for requests
 */
export function calculateToolUseAccuracy(
  turnResults: TurnResult[],
  expectedTools: Array<string[]>
): number {
  let correctToolUse = 0;
  let totalToolExpectations = 0;

  for (let i = 0; i < turnResults.length; i++) {
    const expected = expectedTools[i];
    if (!expected || expected.length === 0) continue;

    totalToolExpectations++;
    const actualTools = turnResults[i].toolCalls.map(tc => tc.name);

    // Check if at least one expected tool was used
    const hasExpectedTool = expected.some(tool => actualTools.includes(tool));
    if (hasExpectedTool) {
      correctToolUse++;
    }
  }

  return totalToolExpectations > 0 ? correctToolUse / totalToolExpectations : 1.0;
}

/**
 * Calculate ONE question rule compliance
 * Measures if AI asks exactly ONE question at a time
 */
export function calculateOneQuestionCompliance(turnResults: TurnResult[]): number {
  let compliantResponses = 0;

  for (const turn of turnResults) {
    const compliance = evaluateOneQuestionRule(turn.text);
    if (compliance >= 1.0) {
      compliantResponses++;
    }
  }

  return turnResults.length > 0 ? compliantResponses / turnResults.length : 0;
}

/**
 * Calculate format compliance
 * Measures proper JSON formatting in tool calls and structured questions
 */
export function calculateFormatCompliance(turnResults: TurnResult[]): number {
  let properlyFormatted = 0;

  for (const turn of turnResults) {
    let hasFormatIssue = false;

    // Check for malformed tool calls
    for (const toolCall of turn.toolCalls) {
      if (!toolCall.name || typeof toolCall.arguments !== 'object') {
        hasFormatIssue = true;
        break;
      }
    }

    // Check for structured questions format
    const hasStructuredQuestions = turn.events.some(e => e.type === 'structured_questions');
    if (hasStructuredQuestions) {
      const sqEvent = turn.events.find(e => e.type === 'structured_questions');
      if (sqEvent && 'questions' in sqEvent) {
        // Valid structured questions
      } else {
        hasFormatIssue = true;
      }
    }

    if (!hasFormatIssue) {
      properlyFormatted++;
    }
  }

  return turnResults.length > 0 ? properlyFormatted / turnResults.length : 0;
}

/**
 * Calculate context retention
 * Measures if AI remembers earlier conversation details
 */
export function calculateContextRetention(
  turnResults: TurnResult[],
  contextChecks: Array<{ turn: number; shouldMention: string[] }>
): number {
  let correctContextUse = 0;

  for (const check of contextChecks) {
    if (check.turn >= turnResults.length) continue;

    const turnText = turnResults[check.turn].text.toLowerCase();
    const mentionsAll = check.shouldMention.every(term =>
      turnText.includes(term.toLowerCase())
    );

    if (mentionsAll) {
      correctContextUse++;
    }
  }

  return contextChecks.length > 0 ? correctContextUse / contextChecks.length : 1.0;
}

/**
 * Calculate final itinerary completeness
 * Checks if all required segment types are present
 */
export function calculateFinalCompleteness(
  itinerary: Itinerary,
  required: { hasFlights: boolean; hasHotels: boolean; hasActivities: boolean }
): number {
  let score = 0;
  let totalChecks = 0;

  if (required.hasFlights) {
    totalChecks++;
    const hasFlight = itinerary.segments.some(s => s.type === 'FLIGHT');
    if (hasFlight) score++;
  }

  if (required.hasHotels) {
    totalChecks++;
    const hasHotel = itinerary.segments.some(s => s.type === 'HOTEL');
    if (hasHotel) score++;
  }

  if (required.hasActivities) {
    totalChecks++;
    const hasActivity = itinerary.segments.some(s => s.type === 'ACTIVITY');
    if (hasActivity) score++;
  }

  return totalChecks > 0 ? score / totalChecks : 0;
}

/**
 * Calculate overall quality score with weights
 */
export function calculateOverallScore(metrics: Omit<ScenarioMetrics, 'overallScore'>): number {
  const weights = {
    segmentCreationRate: 0.25,
    toolUseAccuracy: 0.20,
    oneQuestionCompliance: 0.20,
    formatCompliance: 0.15,
    contextRetention: 0.10,
    finalCompleteness: 0.10,
  };

  return (
    metrics.segmentCreationRate * weights.segmentCreationRate +
    metrics.toolUseAccuracy * weights.toolUseAccuracy +
    metrics.oneQuestionCompliance * weights.oneQuestionCompliance +
    metrics.formatCompliance * weights.formatCompliance +
    metrics.contextRetention * weights.contextRetention +
    metrics.finalCompleteness * weights.finalCompleteness
  );
}

/**
 * Generate scenario metrics from turn results
 */
export function generateScenarioMetrics(
  turnResults: TurnResult[],
  expectedSegmentAdds: number[],
  expectedTools: Array<string[]>,
  contextChecks: Array<{ turn: number; shouldMention: string[] }>,
  finalItinerary: Itinerary,
  required: { hasFlights: boolean; hasHotels: boolean; hasActivities: boolean }
): ScenarioMetrics {
  const segmentCreationRate = calculateSegmentCreationRate(turnResults, expectedSegmentAdds);
  const toolUseAccuracy = calculateToolUseAccuracy(turnResults, expectedTools);
  const oneQuestionCompliance = calculateOneQuestionCompliance(turnResults);
  const formatCompliance = calculateFormatCompliance(turnResults);
  const contextRetention = calculateContextRetention(turnResults, contextChecks);
  const finalCompleteness = calculateFinalCompleteness(finalItinerary, required);

  const overallScore = calculateOverallScore({
    segmentCreationRate,
    toolUseAccuracy,
    oneQuestionCompliance,
    formatCompliance,
    contextRetention,
    finalCompleteness,
  });

  return {
    segmentCreationRate,
    toolUseAccuracy,
    oneQuestionCompliance,
    formatCompliance,
    contextRetention,
    finalCompleteness,
    overallScore,
  };
}

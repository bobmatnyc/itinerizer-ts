/**
 * AI Quality Evaluation Test Suite
 *
 * SEPARATE FROM E2E INFRASTRUCTURE TESTS
 *
 * This test suite focuses on measuring AI QUALITY through:
 * - Longer conversations (10-15 turns)
 * - Realistic trip planning workflows
 * - Stricter quality thresholds
 *
 * Run with: npm run test:eval
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  TestClient,
  collectSSEEvents,
  assertNoErrors,
  assertStreamCompleted,
  extractTextFromEvents,
  extractToolCallsFromEvents,
} from '../helpers/index.js';
import type { Itinerary } from '../../src/domain/types/index.js';
import { EVAL_SCENARIOS, type EvalScenario, type ConversationTurn } from './scenarios/index.js';
import {
  generateScenarioMetrics,
  type TurnResult,
  type ScenarioMetrics,
} from './metrics/eval-metrics.js';

const TEST_USER = 'eval@test.com';
const DELAY_BETWEEN_TURNS = 2000; // 2 seconds between turns

/**
 * Quality thresholds (STRICTER than E2E)
 */
const QUALITY_THRESHOLDS = {
  segmentCreationRate: 0.60, // 60% of requests should add segments
  toolUseAccuracy: 0.80, // 80% correct tool usage
  oneQuestionCompliance: 0.90, // 90% ONE question rule
  formatCompliance: 0.95, // 95% proper formatting
  contextRetention: 0.70, // 70% context retention
  finalCompleteness: 0.50, // 50% of itineraries complete
  overallScore: 0.70, // 70% overall quality
};

/**
 * Scenario result
 */
interface ScenarioResult {
  scenario: EvalScenario;
  itineraryId: string;
  turnResults: TurnResult[];
  metrics: ScenarioMetrics;
  passed: boolean;
  failures: string[];
}

/**
 * Helper to wait between turns
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute a conversation turn
 */
async function executeTurn(
  client: TestClient,
  sessionId: string,
  turn: ConversationTurn,
  turnIndex: number,
  currentSegmentCount: number
): Promise<TurnResult> {
  console.log(`\n  Turn ${turnIndex + 1}: "${turn.message.substring(0, 60)}${turn.message.length > 60 ? '...' : ''}"`);

  const response = await client.sendMessage(sessionId, turn.message);
  const events = await collectSSEEvents(response);

  assertNoErrors(events);
  assertStreamCompleted(events);

  const text = extractTextFromEvents(events);
  const toolCalls = extractToolCallsFromEvents(events);

  // Log response summary
  console.log(`    Response: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`);
  if (toolCalls.length > 0) {
    console.log(`    Tools: ${toolCalls.map(tc => tc.name).join(', ')}`);
  }

  // Wait before next turn
  await delay(DELAY_BETWEEN_TURNS);

  return {
    message: turn.message,
    events,
    text,
    toolCalls,
    segmentCount: currentSegmentCount, // Will be updated after fetching itinerary
    hasError: events.some(e => e.type === 'error'),
  };
}

/**
 * Execute a complete scenario
 */
async function executeScenario(
  client: TestClient,
  scenario: EvalScenario
): Promise<ScenarioResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Scenario: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`Turns: ${scenario.turns.length}`);
  console.log(`${'='.repeat(80)}`);

  // Create itinerary
  const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days trip

  const itinerary = await client.createItinerary({
    title: `${scenario.name} - Eval Test`,
    description: scenario.description,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    tripType: 'leisure',
    tags: ['eval-test', scenario.name.toLowerCase().replace(/\s+/g, '-')],
  });

  console.log(`✓ Itinerary created: ${itinerary.id}`);

  // Create session
  const session = await client.createSession(itinerary.id, 'trip-designer');
  console.log(`✓ Session created: ${session.sessionId}`);

  // Execute turns
  const turnResults: TurnResult[] = [];
  let currentSegmentCount = 0;

  for (let i = 0; i < scenario.turns.length; i++) {
    const turn = scenario.turns[i];

    try {
      const result = await executeTurn(client, session.sessionId, turn, i, currentSegmentCount);

      // Fetch updated itinerary to get segment count
      const updatedItinerary = await client.getItinerary(itinerary.id);
      currentSegmentCount = updatedItinerary.segments.length;
      result.segmentCount = currentSegmentCount;

      turnResults.push(result);

      console.log(`    Segments: ${currentSegmentCount}`);
    } catch (error) {
      console.error(`  ✗ Turn ${i + 1} failed:`, error);
      turnResults.push({
        message: turn.message,
        events: [],
        text: '',
        toolCalls: [],
        segmentCount: currentSegmentCount,
        hasError: true,
      });
    }
  }

  // Get final itinerary
  const finalItinerary = await client.getItinerary(itinerary.id);

  // Build expected data for metrics
  const expectedSegmentAdds = scenario.turns.map(t => t.minSegmentsAfter || 0);
  const expectedTools = scenario.turns.map(t => t.expectedTools || []);

  // Generate context checks (simple: check if earlier locations/preferences are mentioned)
  const contextChecks: Array<{ turn: number; shouldMention: string[] }> = [];
  // Example: After turn 5, should remember destination from turn 1
  if (scenario.turns.length > 5) {
    contextChecks.push({
      turn: 5,
      shouldMention: [], // Can be enhanced with scenario-specific checks
    });
  }

  // Calculate metrics
  const metrics = generateScenarioMetrics(
    turnResults,
    expectedSegmentAdds,
    expectedTools,
    contextChecks,
    finalItinerary,
    scenario.expectedFinalState
  );

  // Check if scenario passed
  const failures: string[] = [];

  if (metrics.segmentCreationRate < QUALITY_THRESHOLDS.segmentCreationRate) {
    failures.push(
      `Segment creation rate: ${(metrics.segmentCreationRate * 100).toFixed(1)}% < ${QUALITY_THRESHOLDS.segmentCreationRate * 100}%`
    );
  }

  if (metrics.toolUseAccuracy < QUALITY_THRESHOLDS.toolUseAccuracy) {
    failures.push(
      `Tool use accuracy: ${(metrics.toolUseAccuracy * 100).toFixed(1)}% < ${QUALITY_THRESHOLDS.toolUseAccuracy * 100}%`
    );
  }

  if (metrics.oneQuestionCompliance < QUALITY_THRESHOLDS.oneQuestionCompliance) {
    failures.push(
      `ONE question compliance: ${(metrics.oneQuestionCompliance * 100).toFixed(1)}% < ${QUALITY_THRESHOLDS.oneQuestionCompliance * 100}%`
    );
  }

  if (metrics.formatCompliance < QUALITY_THRESHOLDS.formatCompliance) {
    failures.push(
      `Format compliance: ${(metrics.formatCompliance * 100).toFixed(1)}% < ${QUALITY_THRESHOLDS.formatCompliance * 100}%`
    );
  }

  if (metrics.finalCompleteness < scenario.expectedFinalState.minQualityScore / 100) {
    failures.push(
      `Final completeness: ${(metrics.finalCompleteness * 100).toFixed(1)}% < ${scenario.expectedFinalState.minQualityScore}%`
    );
  }

  const passed = failures.length === 0;

  return {
    scenario,
    itineraryId: itinerary.id,
    turnResults,
    metrics,
    passed,
    failures,
  };
}

/**
 * Format percentage for display
 */
function pct(value: number): string {
  return `${(value * 100).toFixed(0).padStart(3)}%`;
}

/**
 * Format pass/fail indicator
 */
function passFailIndicator(value: number, threshold: number): string {
  return value >= threshold ? '✓' : '✗';
}

/**
 * Generate quality report
 */
function generateQualityReport(results: ScenarioResult[]): void {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(95) + '╗');
  console.log('║' + ' '.repeat(30) + 'AI QUALITY EVALUATION REPORT' + ' '.repeat(37) + '║');
  console.log('╚' + '═'.repeat(95) + '╝\n');

  // Table header
  console.log('Scenario                  | Seg Rate | Tools | 1Q Rule | Format | Context | Complete | Overall');
  console.log('-'.repeat(95));

  // Calculate averages
  let avgSegRate = 0;
  let avgTools = 0;
  let avgOneQ = 0;
  let avgFormat = 0;
  let avgContext = 0;
  let avgComplete = 0;
  let avgOverall = 0;

  for (const result of results) {
    const m = result.metrics;

    // Scenario name (truncated to 24 chars)
    const name = result.scenario.name.padEnd(24).substring(0, 24);

    // Metrics with pass/fail indicators
    const segRate = pct(m.segmentCreationRate);
    const tools = pct(m.toolUseAccuracy);
    const oneQ = pct(m.oneQuestionCompliance);
    const format = pct(m.formatCompliance);
    const context = pct(m.contextRetention);
    const complete = pct(m.finalCompleteness);
    const overall = pct(m.overallScore);

    console.log(
      `${name} | ` +
      `${passFailIndicator(m.segmentCreationRate, QUALITY_THRESHOLDS.segmentCreationRate)} ${segRate} | ` +
      `${passFailIndicator(m.toolUseAccuracy, QUALITY_THRESHOLDS.toolUseAccuracy)} ${tools} | ` +
      `${passFailIndicator(m.oneQuestionCompliance, QUALITY_THRESHOLDS.oneQuestionCompliance)} ${oneQ} | ` +
      `${passFailIndicator(m.formatCompliance, QUALITY_THRESHOLDS.formatCompliance)} ${format} | ` +
      `${passFailIndicator(m.contextRetention, QUALITY_THRESHOLDS.contextRetention)} ${context} | ` +
      `${passFailIndicator(m.finalCompleteness, QUALITY_THRESHOLDS.finalCompleteness)} ${complete} | ` +
      `${passFailIndicator(m.overallScore, QUALITY_THRESHOLDS.overallScore)} ${overall}`
    );

    avgSegRate += m.segmentCreationRate;
    avgTools += m.toolUseAccuracy;
    avgOneQ += m.oneQuestionCompliance;
    avgFormat += m.formatCompliance;
    avgContext += m.contextRetention;
    avgComplete += m.finalCompleteness;
    avgOverall += m.overallScore;
  }

  // Average row
  const count = results.length;
  console.log('-'.repeat(95));
  console.log(
    `${'AVERAGE'.padEnd(24)} | ` +
    `  ${pct(avgSegRate / count)} | ` +
    `  ${pct(avgTools / count)} | ` +
    `  ${pct(avgOneQ / count)} | ` +
    `  ${pct(avgFormat / count)} | ` +
    `  ${pct(avgContext / count)} | ` +
    `  ${pct(avgComplete / count)} | ` +
    `  ${pct(avgOverall / count)}`
  );

  // Threshold row
  console.log('-'.repeat(95));
  console.log(
    `${'THRESHOLD'.padEnd(24)} | ` +
    `  ${pct(QUALITY_THRESHOLDS.segmentCreationRate)} | ` +
    `  ${pct(QUALITY_THRESHOLDS.toolUseAccuracy)} | ` +
    `  ${pct(QUALITY_THRESHOLDS.oneQuestionCompliance)} | ` +
    `  ${pct(QUALITY_THRESHOLDS.formatCompliance)} | ` +
    `  ${pct(QUALITY_THRESHOLDS.contextRetention)} | ` +
    `  ${pct(QUALITY_THRESHOLDS.finalCompleteness)} | ` +
    `  ${pct(QUALITY_THRESHOLDS.overallScore)}`
  );

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const passRate = passedCount / count;

  console.log('\n' + '─'.repeat(95));
  console.log(`\nPass Rate: ${passedCount}/${count} (${pct(passRate)})`);

  if (passRate >= 1.0) {
    console.log('✅ ALL SCENARIOS PASSED - Excellent AI quality!');
  } else if (passRate >= 0.67) {
    console.log('⚠️  MOST SCENARIOS PASSED - Good AI quality with room for improvement');
  } else {
    console.log('❌ MANY SCENARIOS FAILED - AI quality needs significant improvement');
  }

  // Detailed failures
  const failedResults = results.filter(r => !r.passed);
  if (failedResults.length > 0) {
    console.log('\n' + '═'.repeat(95));
    console.log('FAILED SCENARIOS - DETAILS\n');

    for (const result of failedResults) {
      console.log(`${result.scenario.name}:`);
      for (const failure of result.failures) {
        console.log(`  • ${failure}`);
      }
      console.log('');
    }
  }

  console.log('');
}

describe('AI Quality Evaluation', () => {
  let client: TestClient;
  const scenarioResults: ScenarioResult[] = [];

  beforeAll(async () => {
    client = new TestClient({
      baseUrl: process.env.ITINERIZER_TEST_BASE_URL || 'http://localhost:5176',
      apiKey: process.env.ITINERIZER_TEST_API_KEY || process.env.OPENROUTER_API_KEY,
      userEmail: TEST_USER,
    });

    await client.authenticate();
    console.log(`\n✅ Authenticated as: ${TEST_USER}`);
  });

  afterAll(() => {
    // Generate comprehensive quality report
    generateQualityReport(scenarioResults);
  });

  for (const scenario of EVAL_SCENARIOS) {
    it(`evaluates ${scenario.name}`, async () => {
      const result = await executeScenario(client, scenario);
      scenarioResults.push(result);

      // Log scenario result
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`Scenario: ${scenario.name}`);
      console.log(`Segments Created: ${result.turnResults[result.turnResults.length - 1]?.segmentCount || 0}`);
      console.log(`Segment Creation Rate: ${pct(result.metrics.segmentCreationRate)}`);
      console.log(`Tool Use Accuracy: ${pct(result.metrics.toolUseAccuracy)}`);
      console.log(`ONE Question Compliance: ${pct(result.metrics.oneQuestionCompliance)}`);
      console.log(`Format Compliance: ${pct(result.metrics.formatCompliance)}`);
      console.log(`Context Retention: ${pct(result.metrics.contextRetention)}`);
      console.log(`Final Completeness: ${pct(result.metrics.finalCompleteness)}`);
      console.log(`Overall Score: ${pct(result.metrics.overallScore)}`);
      console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

      if (!result.passed) {
        console.log('\nFailures:');
        for (const failure of result.failures) {
          console.log(`  • ${failure}`);
        }
      }

      console.log(`${'─'.repeat(80)}\n`);

      // Assert thresholds
      expect(result.metrics.segmentCreationRate).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.segmentCreationRate
      );
      expect(result.metrics.toolUseAccuracy).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.toolUseAccuracy
      );
      expect(result.metrics.oneQuestionCompliance).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.oneQuestionCompliance
      );
      expect(result.metrics.formatCompliance).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.formatCompliance
      );
      expect(result.metrics.overallScore).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.overallScore
      );
    }, 600000); // 10 minutes per scenario
  }
});

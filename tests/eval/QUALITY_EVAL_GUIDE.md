# AI Quality Evaluation Test Suite - Quick Reference

**Location**: `/tests/eval/quality-eval.test.ts`

**Purpose**: Measure Trip Designer AI quality through realistic multi-turn conversations (separate from E2E infrastructure tests)

## Quick Start

```bash
# Run AI quality evaluation
npm run test:eval

# Run with custom endpoint
ITINERIZER_TEST_BASE_URL=http://localhost:5176 npm run test:eval
```

## Key Differences: E2E vs Quality Eval

| Aspect | E2E Tests | Quality Eval Tests |
|--------|-----------|-------------------|
| **Purpose** | Infrastructure validation | AI quality measurement |
| **Turns** | 6-8 | 10-15 |
| **Thresholds** | Lenient (10% min) | Strict (60-95%) |
| **Focus** | Can create itinerary? | High-quality itinerary? |
| **Runtime** | ~4 min/test | ~10 min/scenario |

## Three Test Scenarios

### 1. Complete Trip Planning (11 turns)
User provides details upfront → AI systematically builds itinerary

**Expected**: 6+ segments, all types present, 70% quality

### 2. Iterative Refinement (13 turns)
Vague start → AI asks questions → Complete itinerary emerges

**Expected**: 5+ segments through dialogue, 60% quality

### 3. Modification Flow (12 turns)
Existing itinerary → User requests changes → AI modifies correctly

**Expected**: 4+ segments preserved/modified, 55% quality

## Six Quality Metrics

```typescript
1. Segment Creation Rate (60% threshold)
   - % of requests that add segments

2. Tool Usage Accuracy (80% threshold)
   - % of correct tool calls

3. ONE Question Compliance (90% threshold)
   - % asking exactly ONE question

4. Format Compliance (95% threshold)
   - % properly formatted JSON/events

5. Context Retention (70% threshold)
   - % remembering earlier details

6. Final Completeness (50% threshold)
   - % with all required segment types
```

## Sample Output

```
╔═══════════════════════════════════════════════════════════╗
║           AI QUALITY EVALUATION REPORT                    ║
╚═══════════════════════════════════════════════════════════╝

Scenario                  | Seg Rate | Tools | 1Q Rule | Format | Context | Complete | Overall
Complete Trip Planning    | ✓  75%   | ✓ 85% | ✓ 100%  | ✓  98% | ✓  80%  | ✓   70%  | ✓  82%
Iterative Refinement      | ✓  60%   | ✓ 90% | ✓  90%  | ✓ 100% | ✓  75%  | ✓   55%  | ✓  78%
Modification Flow         | ✓  80%   | ✓ 95% | ✓ 100%  | ✓  95% | ✓  90%  | ✓   65%  | ✓  88%
-------------------------------------------------------------------------------------------
AVERAGE                   |    72%   |   90% |    97%  |    98% |    82%  |     63%  |    83%

Pass Rate: 3/3 (100%)
✅ ALL SCENARIOS PASSED
```

## File Structure

```
tests/eval/
├── quality-eval.test.ts          # Main test suite (NEW)
├── scenarios/
│   └── index.ts                  # Conversation scenarios (NEW)
├── metrics/
│   ├── eval-metrics.ts           # Metric calculators (NEW)
│   ├── quality-judge.ts          # LLM-as-judge (existing)
│   └── format-compliance.ts      # Format validation (existing)
├── model-comparison.ts           # Model eval (existing)
└── README.md                     # Original eval docs
```

## Debugging Failures

### Low Segment Creation Rate (<60%)
- Check turn logs for tool calls
- Verify `add_flight`, `add_hotel`, `add_activity` called
- Confirm segments saved to itinerary

### Low Tool Use Accuracy (<80%)
- Review expected vs actual tool calls
- Check tools available in agent context
- Refine scenario expectations

### Low ONE Question Compliance (<90%)
- Check `structured_questions` events
- Verify prompt enforces ONE question rule
- Review question counts in logs

### Low Format Compliance (<95%)
- Check JSON parsing errors
- Verify event structure matches schema
- Review tool call arguments

## Adding New Scenarios

```typescript
// tests/eval/scenarios/index.ts

export const MY_SCENARIO: EvalScenario = {
  name: 'My Test Scenario',
  description: 'What this tests',
  travelersCount: 2,
  turns: [
    {
      message: 'User message',
      expectedBehavior: 'add_segment',
      expectedTools: ['add_flight'],
      minSegmentsAfter: 1,
    },
    // ...
  ],
  expectedFinalState: {
    minSegments: 5,
    hasFlights: true,
    hasHotels: true,
    hasActivities: true,
    minQualityScore: 65,
  },
};

export const EVAL_SCENARIOS = [
  COMPLETE_TRIP_SCENARIO,
  ITERATIVE_REFINEMENT_SCENARIO,
  MODIFICATION_FLOW_SCENARIO,
  MY_SCENARIO, // Add here
];
```

## Configuration

**File**: `vitest.config.eval.ts`

```typescript
{
  testTimeout: 600000,      // 10 min/scenario
  pool: 'forks',
  singleFork: true,         // Sequential execution
  reporters: ['verbose'],
}
```

**Environment**:
```bash
ITINERIZER_TEST_API_KEY=<openrouter-key>    # Required
ITINERIZER_TEST_BASE_URL=http://localhost:5176
ITINERIZER_TEST_USER_EMAIL=eval@test.com
```

## Interpreting Results

### ✅ Pass (≥70% overall)
Production-ready AI quality

### ⚠️ Partial (50-70%)
Works but needs improvement

### ❌ Fail (<50%)
Significant issues, not production-ready

## Related Files

- `/tests/e2e/persona-itinerary-creation.e2e.test.ts` - Infrastructure E2E
- `/tests/eval/model-comparison.ts` - Model comparison
- `/tests/eval/README.md` - Original eval docs
- `/vitest.config.eval.ts` - Eval config

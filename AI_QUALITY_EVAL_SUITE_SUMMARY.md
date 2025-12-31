# AI Quality Evaluation Test Suite - Implementation Summary

## Overview

Created a comprehensive AI quality evaluation test suite that is **separate from E2E infrastructure tests** and focuses on measuring AI QUALITY through realistic multi-turn conversations.

## Files Created

### 1. `/tests/eval/quality-eval.test.ts` (Main Test Suite)
**Purpose**: Vitest test file that executes 3 detailed scenarios and measures 6 quality metrics

**Key Features**:
- Executes 10-15 turn conversations per scenario
- Measures segment creation rate, tool usage accuracy, ONE question compliance
- Generates comprehensive quality report at end
- Strict thresholds (60-95% compliance required)

**Test Flow**:
```typescript
1. Create itinerary
2. Create Trip Designer session
3. Execute conversation turns (10-15 messages)
4. Collect SSE events from each response
5. Fetch itinerary after each turn to check segment count
6. Calculate metrics across all turns
7. Generate quality report with pass/fail
```

### 2. `/tests/eval/scenarios/index.ts` (Conversation Scenarios)
**Purpose**: Detailed conversation scripts for realistic trip planning workflows

**Three Scenarios**:

#### Scenario 1: Complete Trip Planning (11 turns)
- User provides comprehensive trip details upfront
- AI systematically searches and adds flights, hotels, activities
- Expected: 6+ segments, all types present, 70% quality score

#### Scenario 2: Iterative Refinement (13 turns)
- User starts vague: "I want to go somewhere warm"
- AI asks clarifying questions
- Itinerary emerges through dialogue
- Expected: 5+ segments, 60% quality score

#### Scenario 3: Modification Flow (12 turns)
- Start with existing itinerary
- User requests date changes, hotel changes, activity additions
- AI modifies correctly without losing data
- Expected: 4+ segments modified, 55% quality score

**Turn Structure**:
```typescript
{
  message: 'User message text',
  expectedBehavior: 'ask_question' | 'add_segment' | 'search',
  expectedTools: ['tool_name'],
  minSegmentsAfter: 2,
}
```

### 3. `/tests/eval/metrics/eval-metrics.ts` (Metric Calculators)
**Purpose**: Helper functions to calculate quality metrics from conversation results

**Six Metric Functions**:

1. **`calculateSegmentCreationRate()`**
   - Measures: % of requests that added segments
   - Threshold: 60%
   - Why: Core measure of AI effectiveness

2. **`calculateToolUseAccuracy()`**
   - Measures: % of correct tool calls
   - Threshold: 80%
   - Why: Validates AI uses right tools

3. **`calculateOneQuestionCompliance()`**
   - Measures: % asking exactly ONE question
   - Threshold: 90%
   - Why: UX requirement for chat flow

4. **`calculateFormatCompliance()`**
   - Measures: % properly formatted JSON/events
   - Threshold: 95%
   - Why: Prevents UI breaking

5. **`calculateContextRetention()`**
   - Measures: % remembering earlier details
   - Threshold: 70%
   - Why: Multi-turn conversation quality

6. **`calculateFinalCompleteness()`**
   - Measures: % with all required segment types
   - Threshold: 50%
   - Why: Itinerary usefulness

**Overall Score**: Weighted average (segment creation 25%, tool use 20%, ONE question 20%, format 15%, context 10%, completeness 10%)

### 4. `/vitest.config.eval.ts` (Eval-Specific Config)
**Purpose**: Separate Vitest configuration for eval tests

**Key Settings**:
- `testTimeout: 600000` (10 minutes per scenario)
- `singleFork: true` (sequential execution, one scenario at a time)
- `reporters: ['verbose']` (detailed output)
- Excludes E2E and unit tests

**Why Separate**:
- Different timeout requirements (10 min vs 2 min)
- Sequential execution to avoid API rate limits
- Different reporting needs (quality metrics vs pass/fail)

### 5. `/tests/eval/QUALITY_EVAL_GUIDE.md` (Quick Reference)
**Purpose**: Condensed guide for running and interpreting eval tests

**Contents**:
- Quick start commands
- Key differences from E2E tests
- Metric explanations
- Sample output report
- Debugging guide
- How to add scenarios

### 6. `package.json` (Updated)
**Change**: Added `test:eval` script

```json
"test:eval": "vitest run --config vitest.config.eval.ts"
```

## Usage

### Run Evaluation

```bash
# Standard run (uses localhost:5176)
npm run test:eval

# Custom endpoint
ITINERIZER_TEST_BASE_URL=http://localhost:5176 npm run test:eval

# Required env vars
ITINERIZER_TEST_API_KEY=<openrouter-api-key>
```

### Expected Output

```
╔═══════════════════════════════════════════════════════════╗
║           AI QUALITY EVALUATION REPORT                    ║
╚═══════════════════════════════════════════════════════════╝

Scenario                  | Seg Rate | Tools | 1Q Rule | Format | Context | Complete | Overall
-------------------------------------------------------------------------------------------
Complete Trip Planning    | ✓  75%   | ✓ 85% | ✓ 100%  | ✓  98% | ✓  80%  | ✓   70%  | ✓  82%
Iterative Refinement      | ✓  60%   | ✓ 90% | ✓  90%  | ✓ 100% | ✓  75%  | ✓   55%  | ✓  78%
Modification Flow         | ✓  80%   | ✓ 95% | ✓ 100%  | ✓  95% | ✓  90%  | ✓   65%  | ✓  88%
-------------------------------------------------------------------------------------------
AVERAGE                   |    72%   |   90% |    97%  |    98% |    82%  |     63%  |    83%
-------------------------------------------------------------------------------------------
THRESHOLD                 |    60%   |   80% |    90%  |    95% |    70%  |     50%  |    70%

Pass Rate: 3/3 (100%)
✅ ALL SCENARIOS PASSED - Excellent AI quality!
```

## Quality Thresholds (STRICTER than E2E)

```typescript
const QUALITY_THRESHOLDS = {
  segmentCreationRate: 0.60,      // 60% (E2E has no equivalent)
  toolUseAccuracy: 0.80,          // 80% (E2E has no equivalent)
  oneQuestionCompliance: 0.90,    // 90% (E2E has no equivalent)
  formatCompliance: 0.95,         // 95% (E2E has no equivalent)
  contextRetention: 0.70,         // 70% (E2E has no equivalent)
  finalCompleteness: 0.50,        // 50% (E2E: 10% min score)
  overallScore: 0.70,             // 70% (E2E has no overall score)
};
```

## Key Design Decisions

### 1. Separate from E2E Tests
**Why**: Different purposes
- E2E validates infrastructure works
- Eval measures AI quality
- Different thresholds, timeouts, focus

### 2. Longer Conversations (10-15 turns)
**Why**: More realistic
- Real users have multi-turn conversations
- More opportunity for AI to add segments
- Better tests context retention

### 3. Strict Thresholds (60-95%)
**Why**: Production quality bar
- E2E tests are lenient (just check it works)
- Eval tests enforce production-ready quality
- Clear signal when AI needs improvement

### 4. Six Distinct Metrics
**Why**: Actionable insights
- Segment creation rate → Is AI effective?
- Tool use accuracy → Is AI using right tools?
- ONE question compliance → Is UX good?
- Format compliance → Will UI break?
- Context retention → Multi-turn quality?
- Final completeness → Useful itineraries?

### 5. Sequential Execution
**Why**: Avoid API rate limits
- Multiple concurrent LLM requests = rate limit errors
- Sequential execution more reliable
- Slightly slower but more stable

## Comparison: E2E vs Eval

| Aspect | E2E Tests | Eval Tests |
|--------|-----------|------------|
| **File** | `persona-itinerary-creation.e2e.test.ts` | `quality-eval.test.ts` |
| **Purpose** | Infrastructure validation | AI quality measurement |
| **Scenarios** | 4 personas (solo, family, business, group) | 3 workflows (complete, iterative, modify) |
| **Turns** | 6-8 | 10-15 |
| **Thresholds** | 10% min score | 60-95% thresholds |
| **Metrics** | Completeness score, pricing | 6 quality metrics |
| **Focus** | Can create itinerary? | High-quality itinerary? |
| **Runtime** | ~4 min/test (×4 = 16 min) | ~10 min/scenario (×3 = 30 min) |
| **Config** | `vitest.config.e2e.ts` | `vitest.config.eval.ts` |
| **Command** | `npm run test:e2e` | `npm run test:eval` |

## Integration with Existing Tests

### Uses Existing Helpers
```typescript
// From tests/helpers/
import {
  TestClient,           // API client
  collectSSEEvents,     // SSE stream parsing
  extractTextFromEvents,
  extractToolCallsFromEvents,
} from '../helpers/index.js';
```

### Uses Existing Metrics
```typescript
// From tests/eval/metrics/
import { evaluateOneQuestionRule } from './format-compliance.js';
import { evaluateResponseQuality } from './quality-judge.js';
```

### Shares Test Setup
```typescript
// vitest.config.eval.ts
setupFiles: ['./tests/setup-e2e.ts']  // Reuses E2E auth setup
```

## Next Steps

### 1. Run Initial Evaluation
```bash
npm run test:eval
```

### 2. Review Results
- Check which scenarios pass/fail
- Identify low-scoring metrics
- Look for patterns in failures

### 3. Tune Prompts
Based on failure patterns:
- Low segment creation → Improve tool call prompts
- Low tool accuracy → Clarify tool descriptions
- Low ONE question → Strengthen ONE question instruction
- Low format → Fix JSON schema validation
- Low context → Improve conversation memory

### 4. Re-evaluate
```bash
npm run test:eval
```

### 5. Compare Improvements
Track metrics over time:
- Segment creation rate increasing?
- Tool accuracy improving?
- ONE question compliance better?

## Future Enhancements

### Potential Additions
1. **More Scenarios**: Multi-city trips, group travel, budget constraints
2. **LLM-as-Judge Integration**: Use quality-judge.ts for response quality
3. **Historical Tracking**: Store results over time, detect regressions
4. **Parallel Model Testing**: Compare GPT-4 vs Claude across scenarios
5. **Custom Context Checks**: Scenario-specific context validation
6. **Segment Type Validation**: Check segment data quality (not just count)
7. **Error Recovery Tests**: How AI handles tool failures
8. **Edge Case Scenarios**: Invalid dates, overlapping segments, etc.

## Files Summary

```
Created:
✓ tests/eval/quality-eval.test.ts          (Main test suite, 600 lines)
✓ tests/eval/scenarios/index.ts            (3 scenarios, 250 lines)
✓ tests/eval/metrics/eval-metrics.ts       (6 metric calculators, 200 lines)
✓ tests/eval/QUALITY_EVAL_GUIDE.md         (Quick reference)
✓ vitest.config.eval.ts                    (Eval config)
✓ AI_QUALITY_EVAL_SUITE_SUMMARY.md         (This file)

Modified:
✓ package.json                             (Added test:eval script)

Total: 6 new files, 1 modified file
Lines of Code: ~1050 lines
```

## Success Criteria

### ✅ Implementation Complete
- [x] 3 detailed scenarios with 10-15 turns each
- [x] 6 quality metrics with strict thresholds
- [x] Comprehensive quality report generation
- [x] Separate Vitest config for eval tests
- [x] Integration with existing test helpers
- [x] Documentation (guide + summary)

### 🎯 Ready to Use
```bash
npm run test:eval
```

Expected runtime: ~30 minutes (3 scenarios × 10 minutes each)

Expected output: Quality report with pass/fail for each metric

Expected value: Actionable insights into AI quality for continuous improvement

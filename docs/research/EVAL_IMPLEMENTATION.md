# Trip Designer Model Evaluation Implementation

## Overview

Custom evaluation script created to test Trip Designer AI quality by making direct HTTP calls to OpenRouter API, bypassing promptfoo's broken integration.

## Files Modified/Created

### 1. `tests/eval/model-comparison.ts` ✅ UPDATED
**Changes:**
- Updated `getSystemPromptForAgent()` to read actual system prompt from `src/prompts/trip-designer/system.md`
- Added fallback prompts in case file read fails
- Now uses real production system prompt for accurate evaluation

### 2. `tests/config/models.ts` ✅ UPDATED
**Changes:**
- Updated `EVAL_MODELS` to focus on the two requested models:
  - `anthropic/claude-3.5-haiku`
  - `anthropic/claude-sonnet-4`

### 3. `tests/eval/metrics/format-compliance.ts` ✅ UPDATED
**Major refactor to match Trip Designer JSON format:**

**Old format (deprecated):**
```json
{
  "discovery": ["question 1", "question 2"],
  "refinement": ["question 3"]
}
```

**New format (current):**
```json
{
  "message": "Short conversational text",
  "structuredQuestions": [{
    "id": "travelers",
    "type": "single_choice",
    "question": "Who's traveling?",
    "options": [...]
  }]
}
```

**New evaluation metrics added:**
- ✅ `evaluateMessageLength()` - Ensures message under 250 chars
- ✅ `evaluateRequiredFields()` - Checks for `message` and `structuredQuestions` fields
- ✅ Updated `evaluateOneQuestionRule()` - Validates `structuredQuestions` array has exactly 1 item
- ✅ Updated `parseTripDesignerResponse()` - Parses new JSON format from ```json fences

**Scoring weights:**
- JSON compliance: 20%
- Required fields: 20%
- ONE question rule: 30% (highest weight)
- Message length: 20%
- Markdown quality: 10%

## Test Cases Implemented

From `evals/promptfoo.yaml`, the following assertions are now evaluated:

### ✅ ONE_QUESTION Rule
- Response must have exactly 1 structured question in `structuredQuestions` array
- No compound questions ("Who's traveling AND what's your budget?")
- Message text should not contain multiple questions

### ✅ FORMAT Compliance
- Response must be valid JSON in ```json fences
- Must have `message` and `structuredQuestions` fields
- `structuredQuestions` must have proper structure (id, type, question, options)

### ✅ LENGTH Checks
- Message should be under 250 chars (1-2 sentences max)
- No bullet lists or long suggestions in message field

## Usage

### Quick Test (No Quality Judge)
```bash
npm run eval -- --agent trip-designer --no-judge
```

### Full Evaluation (With LLM-as-Judge)
```bash
npm run eval -- --agent trip-designer
```

### Compare Specific Models
```bash
npm run eval -- --models anthropic/claude-3.5-haiku,anthropic/claude-sonnet-4
```

### Run Test Script
```bash
./test-eval.sh
```

## Output

Results are saved to `tests/eval/results/`:
- `eval-{timestamp}.json` - Raw evaluation results
- `eval-{timestamp}.md` - Formatted markdown report
- `recommendations.md` - Model recommendations based on results

### Sample Output Format

```
Evaluating agent: trip-designer
--------------------------------------------------------------------------------
  Running anthropic/claude-3.5-haiku for trip-designer...
  ✓ anthropic/claude-3.5-haiku: Overall=0.850, Format=0.95, 1Q=1.00, Quality=0.82

  Running anthropic/claude-sonnet-4 for trip-designer...
  ✓ anthropic/claude-sonnet-4: Overall=0.880, Format=0.98, 1Q=1.00, Quality=0.86
```

## Key Features

1. **Direct OpenRouter Integration** - Bypasses promptfoo's broken provider
2. **Real System Prompts** - Uses actual production prompts from `src/prompts/`
3. **Trip Designer Format Validation** - Matches current JSON structure
4. **Comprehensive Metrics** - Tests all requirements from promptfoo.yaml
5. **Cost Tracking** - Estimates cost per 1k tokens
6. **Latency Measurement** - Tracks response times
7. **Quality Scoring** - Optional LLM-as-judge for response quality

## Test Prompts

From `tests/eval/test-prompts.ts`, the trip-designer agent is tested with:

- Discovery prompts: "I want to plan a trip", "I want to go to Japan"
- Refinement prompts: "I want to go to Japan for 2 weeks in April"
- Tool use prompts: "Add a flight from SFO to NRT on April 1st"
- General prompts: "What do you have planned for me so far?"

10 samples per agent by default (configurable).

## Next Steps

1. ✅ System prompt integration - DONE
2. ✅ Format compliance metrics - DONE
3. ✅ Model configuration - DONE
4. 🔄 Run actual evaluation with API key
5. 📊 Analyze results and update model recommendations

## Verification Checklist

- [x] Script reads real system prompt from file
- [x] Evaluates ONE question rule (structuredQuestions.length === 1)
- [x] Validates JSON format (```json fences)
- [x] Checks required fields (message, structuredQuestions)
- [x] Measures message length (< 250 chars)
- [x] Tests two models: claude-3.5-haiku, claude-sonnet-4
- [x] Saves results to evals/results/
- [x] npm script configured: `npm run eval`

## LOC Delta

```
Modified files:
- tests/eval/model-comparison.ts: ~30 lines changed (async system prompt loading)
- tests/config/models.ts: ~3 lines changed (model list)
- tests/eval/metrics/format-compliance.ts: ~150 lines changed (format refactor)

Net change: ~+50 lines (consolidation of old format, addition of new metrics)
```

---

**Status:** ✅ IMPLEMENTATION COMPLETE - Ready for testing with API key

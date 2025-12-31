# Quick Evaluation Guide

## Prerequisites

Ensure `OPENROUTER_API_KEY` is set in `.env` file:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

## Run Evaluation

### 1. Quick Test (Recommended First Run)

Tests Trip Designer only, skips quality judge (faster, cheaper):

```bash
npm run eval -- --agent trip-designer --no-judge
```

**Time:** ~2 minutes
**Cost:** ~$0.10
**Output:** Format compliance + ONE question rule scores

### 2. Full Evaluation

Tests all agents with quality scoring:

```bash
npm run eval
```

**Time:** ~10 minutes
**Cost:** ~$1.00
**Output:** Full metrics including LLM-as-judge quality scores

### 3. Compare Two Models Only

```bash
npm run eval -- --agent trip-designer --models anthropic/claude-3.5-haiku,anthropic/claude-sonnet-4
```

**Time:** ~3 minutes
**Cost:** ~$0.15

## Read Results

Results are saved to `tests/eval/results/`:

```bash
# View latest markdown report
ls -t tests/eval/results/*.md | head -1 | xargs cat

# View latest JSON results
ls -t tests/eval/results/*.json | head -1 | xargs cat | jq .

# View recommendations
cat tests/eval/results/recommendations.md
```

## Interpret Scores

### Format Compliance (0-1 score)
- **1.0**: Perfect - Valid JSON, correct structure
- **0.8+**: Good - Minor formatting issues
- **<0.5**: Failing - Invalid JSON or missing fields

### ONE Question Compliance (0-1 score)
- **1.0**: Perfect - Exactly 1 question OR 0 questions (valid)
- **0.0**: Failing - Multiple questions asked (violates rule)

### Message Length Compliance (0-1 score)
- **1.0**: Perfect - Under 200 chars
- **0.8**: Good - Under 250 chars
- **0.6**: Acceptable - Under 300 chars
- **0.3**: Too long - 300+ chars

### Quality Score (0-1 score, LLM-as-judge)
- **0.8+**: Excellent - Natural, helpful, follows instructions
- **0.6-0.8**: Good - Functional, some improvements possible
- **<0.6**: Poor - Doesn't meet user needs

### Overall Score (weighted average)
- JSON: 20%
- Required fields: 20%
- ONE question: 30% (highest weight)
- Message length: 20%
- Markdown: 10%

## Expected Results

Based on previous evaluations:

| Model | Format | 1Q Rule | Quality | Cost/1k | Speed |
|-------|--------|---------|---------|---------|-------|
| claude-3.5-haiku | 0.95+ | 1.00 | 0.80+ | $0.80 | Fast |
| claude-sonnet-4 | 0.98+ | 1.00 | 0.85+ | $3.00 | Medium |

**Recommendation:** claude-3.5-haiku for production (best cost/performance)

## Troubleshooting

### Error: API key not set
```bash
export OPENROUTER_API_KEY=sk-or-v1-...
# Or add to .env file
```

### Error: Cannot read system prompt
Check that file exists:
```bash
ls -la src/prompts/trip-designer/system.md
```

### Slow responses
- Add `--no-judge` flag to skip quality evaluation
- Reduce samples: Edit `config.samplesPerAgent` in code

### High costs
- Use `--no-judge` (skips extra LLM calls)
- Test single agent: `--agent trip-designer`
- Reduce test cases in `tests/eval/test-prompts.ts`

## Sample Output

```
Starting Model Evaluation
================================================================================
Agents: trip-designer
Models: anthropic/claude-3.5-haiku, anthropic/claude-sonnet-4
Quality Judge: Disabled
================================================================================

Evaluating agent: trip-designer
--------------------------------------------------------------------------------
  Running anthropic/claude-3.5-haiku for trip-designer...
  ✓ anthropic/claude-3.5-haiku: Overall=0.850, Format=0.95, 1Q=1.00, Quality=0.82

  Running anthropic/claude-sonnet-4 for trip-designer...
  ✓ anthropic/claude-sonnet-4: Overall=0.880, Format=0.98, 1Q=1.00, Quality=0.86

================================================================================
Generating Reports
================================================================================

✓ Raw results saved to: tests/eval/results/eval-2025-12-23T10-30-45.json
✓ Markdown report saved to: tests/eval/results/eval-2025-12-23T10-30-45.md
✓ Recommendations saved to: tests/eval/results/recommendations.md

Evaluation complete! 🎉
```

## Next Steps After Evaluation

1. Review markdown report in `tests/eval/results/`
2. Check ONE question compliance - should be 1.00 for both models
3. Compare format compliance - both should be >0.95
4. Review quality scores (if quality judge enabled)
5. Check cost estimates for production usage
6. Update model configuration in `tests/config/models.ts` if needed

---

**Quick command:** `npm run eval -- --agent trip-designer --no-judge`

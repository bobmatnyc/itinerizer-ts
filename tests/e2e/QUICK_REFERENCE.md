# E2E Tests Quick Reference

## Setup (One Time)

```bash
# 1. Set API key
export ITINERIZER_TEST_API_KEY="sk-or-v1-xxxxx"

# OR create .env.test
cp .env.test.example .env.test
# Edit and add your key

# 2. Start API server
cd viewer-svelte && npm run dev
# Runs on http://localhost:5176
```

## Run Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Specific Test Files
```bash
npm run test:e2e -- persona-itinerary-creation  # Persona tests
npm run test:e2e -- trip-designer               # Trip Designer tests
npm run test:e2e -- help-agent                  # Help Agent tests
npm run test:e2e -- visualization               # Visualization tests
```

### Single Persona
```bash
npm run test:e2e -- -t "Solo Traveler"       # Alex Chen - Japan
npm run test:e2e -- -t "Family Vacation"     # Johnson Family - Orlando
npm run test:e2e -- -t "Business Trip"       # Marcus Williams - SF
npm run test:e2e -- -t "Group Adventure"     # 6 Friends - Costa Rica
```

## Verify Created Itineraries

### Console Output
```bash
# Look for at end of test run:
✅ Created itineraries for qa@test.com:
   - 08d10489-69bc-41e0-aeff-59abd3491e31
   - 1096bf81-ce50-4df9-98d1-331dcbb36a0d
   ...
```

### Via API
```bash
curl http://localhost:5176/api/v1/itineraries \
  -H "X-User-Email: qa@test.com" | jq '.[] | .title'
```

### Via UI
```
http://localhost:5176
Login as: qa@test.com
```

### Via Files
```bash
grep -r "qa@test.com" data/itineraries/ | cut -d: -f1
```

## Test Details

### Personas Tested

| Persona | Trip | Duration | Budget |
|---------|------|----------|--------|
| Alex Chen | Japan | 2 weeks | $150-200/day |
| Johnson Family | Orlando | 7 days | Moderate |
| Marcus Williams | San Francisco | 3 days | Premium |
| Adventure Friends | Costa Rica | 10 days | Budget |

### What Gets Created

Each persona test creates:
- ✅ 1 itinerary with metadata
- ✅ 1 Trip Designer session
- ✅ 5-6 conversational exchanges
- ✅ 2-4 segments (flights, hotels, activities)

All saved with `userId: "qa@test.com"`

### Test Timeouts

- Individual test: **180 seconds** (3 minutes)
- Full suite: **~12 minutes** (4 personas × 3 min)
- Rate limit delay: **2 seconds** between messages

### Cost Estimate

- Single persona: ~$0.05 - $0.15
- All 4 personas: ~$0.20 - $0.60
- Full suite: ~$0.25 - $0.75

## Troubleshooting

### "ITINERIZER_TEST_API_KEY required"
→ Set the environment variable or create `.env.test`

### "Failed to connect to API"
→ Start the dev server: `cd viewer-svelte && npm run dev`

### "Test timeout exceeded"
→ LLM call took too long. Re-run or increase timeout in test

### "Rate limit exceeded"
→ Tests already have 2s delays. Wait and retry.

## Files

```
tests/
├── e2e/
│   ├── persona-itinerary-creation.e2e.test.ts  ← Persona tests
│   ├── trip-designer.e2e.test.ts               ← Trip Designer tests
│   ├── help-agent.e2e.test.ts                  ← Help Agent tests
│   ├── visualization.e2e.test.ts               ← Visualization tests
│   ├── README.md                               ← Full documentation
│   └── QUICK_REFERENCE.md                      ← This file
├── fixtures/
│   └── personas/
│       ├── solo-traveler.json
│       ├── family-vacation.json
│       ├── business-trip.json
│       └── group-adventure.json
└── helpers/
    ├── test-client.ts          ← API client
    ├── event-extractors.ts     ← SSE parsing
    ├── assertions.ts           ← Test assertions
    └── fixtures.ts             ← Fixture loaders
```

## Common Commands

```bash
# Run all personas
npm run test:e2e -- persona-itinerary-creation

# Run one persona for debugging
npm run test:e2e -- -t "Solo Traveler"

# Run with verbose output (already default)
npm run test:e2e -- persona-itinerary-creation

# Check created itineraries
grep -r "qa@test.com" data/itineraries/ | wc -l

# View itinerary details
cat data/itineraries/{id}.json | jq '.segments'
```

## When to Run

✅ **Run these tests when:**
- Testing persona-based flows
- Validating multi-turn conversations
- QA testing itinerary creation
- Verifying tool execution
- Testing different user types

❌ **Don't run when:**
- Making frequent code changes (use unit tests)
- Testing non-AI features
- Low on API credits
- In CI without budget (expensive)

## Success Indicators

Look for:
- ✅ All tests pass (green)
- ✅ Each persona creates 2+ segments
- ✅ Tool calls logged for flights/hotels
- ✅ No error events in streams
- ✅ 4 itineraries listed at end
- ✅ Quality analysis shows meaningful content

## Need Help?

- Full docs: `tests/e2e/README.md`
- Implementation summary: `PERSONA_E2E_TESTS.md`
- Test helpers: `tests/helpers/`
- Example tests: `tests/e2e/trip-designer.e2e.test.ts`

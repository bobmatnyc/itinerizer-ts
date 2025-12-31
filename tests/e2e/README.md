# E2E Tests - Trip Designer

End-to-end tests for the Itinerizer Trip Designer that make **REAL LLM API calls** using locked models.

## Overview

These tests verify the Trip Designer's behavior with actual OpenRouter API calls, testing:

- **Trip Discovery Flow**: ONE question at a time enforcement
- **Context Awareness**: Using existing itinerary data
- **Tool Execution**: Flights, hotels, activities
- **Help Agent**: App questions and mode switching
- **Visualization**: Map trigger detection and location extraction

## Test Files

### `persona-itinerary-creation.e2e.test.ts`
**NEW**: Complete itinerary creation using realistic traveler personas:

1. **Solo Traveler** (Alex Chen) - 2 weeks in Japan
   - Cultural immersion, local food, off-beaten-path
   - Budget: $150-200/day

2. **Family Vacation** (Johnson Family) - 7 days Orlando, FL
   - Theme parks, kid-friendly activities with 2 kids (ages 6 & 9)
   - Budget: Moderate, family packages

3. **Business Trip** (Marcus Williams) - 3 days San Francisco
   - Tech conference, premium hotels, efficiency-focused
   - Budget: Company expense, premium preferred

4. **Group Adventure** (6 Friends) - 10 days Costa Rica
   - Outdoor adventures, shared accommodations, budget-conscious
   - Budget: Group discounts, hostels

All itineraries saved with `userId: "qa@test.com"` for verification.

### `trip-designer.e2e.test.ts`
Full Trip Designer flows with real LLM calls:
- New trip discovery (one question at a time)
- Existing itinerary context handling
- Tool execution (add_flight, add_hotel, add_activity)
- Multi-turn conversations
- Error handling

### `help-agent.e2e.test.ts`
Help Agent tests including mode switching:
- App-related question answering
- Feature explanations
- Mode switching to Trip Designer
- Help quality assessment

### `visualization.e2e.test.ts`
Visualization trigger detection:
- Location extraction from tool results
- Map trigger rules (2+ locations)
- Coordinate extraction
- Multi-city itineraries

## Prerequisites

### Required Environment Variables

```bash
# OpenRouter API key for LLM calls (REQUIRED)
export ITINERIZER_TEST_API_KEY="sk-or-v1-..."

# Optional: Test user email for scoping
export ITINERIZER_TEST_USER_EMAIL="test@example.com"

# API endpoint (defaults to http://localhost:5176)
export VITE_API_URL="http://localhost:5176"
```

### Running the API Server

E2E tests require the API server to be running:

```bash
# Option 1: SvelteKit dev server (recommended for local testing)
cd viewer-svelte
npm run dev  # Runs on port 5176

# Option 2: Express API server (alternative)
npm run server  # Runs on port 5177
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
# Persona itinerary creation tests
npm run test:e2e -- persona-itinerary-creation

# Trip Designer tests only
npm run test:e2e -- trip-designer

# Help Agent tests only
npm run test:e2e -- help-agent

# Visualization tests only
npm run test:e2e -- visualization
```

### Run in Watch Mode (NOT RECOMMENDED)

```bash
# WARNING: Watch mode will re-run tests on file changes
# This can quickly consume API credits!
npx vitest tests/e2e/trip-designer.e2e.test.ts
```

### Run Single Test or Persona

```bash
# Run specific persona test
npm run test:e2e -- -t "Solo Traveler"
npm run test:e2e -- -t "Family Vacation"
npm run test:e2e -- -t "Business Trip"
npm run test:e2e -- -t "Group Adventure"

# Run other single tests
npm run test:e2e -- -t "asks ONE structured question"
```

## Configuration

### Test Timeouts

E2E tests use longer timeouts for LLM API calls:

- **Test timeout**: 60 seconds per test
- **Hook timeout**: 30 seconds for setup/teardown
- **Sequential execution**: One test at a time to avoid rate limits

Configuration: `vitest.config.e2e.ts`

### Rate Limiting

Tests run **sequentially** (not in parallel) to avoid rate limits:

```typescript
poolOptions: {
  forks: {
    singleFork: true, // Sequential execution
  },
}
```

### Cost Management

- Tests use `bail: 1` to stop on first failure (saves API calls)
- Each test cleans up resources (deletes test itineraries)
- Use fixtures for existing itineraries when possible

## Test Helpers

### Event Extractors (`tests/helpers/event-extractors.ts`)

```typescript
import {
  extractQuestionsFromEvents,
  extractTextFromEvents,
  extractToolCallsFromEvents,
  extractLocationsFromEvents,
  hasToolCall,
} from '../helpers/index.js';

// Extract structured questions
const questions = extractQuestionsFromEvents(events);

// Get all text content
const text = extractTextFromEvents(events);

// Check for specific tool call
if (hasToolCall(events, 'add_flight')) {
  // Flight was added
}
```

### Assertions (`tests/helpers/assertions.ts`)

```typescript
import {
  assertOneQuestionOnly,
  assertNoErrors,
  assertStreamCompleted,
  assertItineraryUpdated,
} from '../helpers/index.js';

// Verify exactly one question
assertOneQuestionOnly(questions);

// Verify no errors in stream
assertNoErrors(events);

// Verify stream completed
assertStreamCompleted(events);
```

### Fixtures (`tests/helpers/fixtures.ts`)

```typescript
import { loadItinerary } from '../helpers/index.js';

// Load pre-defined test itineraries
const planningItinerary = loadItinerary('planning-phase');
const completeTrip = loadItinerary('complete-trip');
```

Available fixtures:
- `empty-new`: Brand new empty itinerary
- `planning-phase`: Has destination and dates set
- `partial-segments`: Has some flights/hotels
- `complete-trip`: Fully planned trip
- `past-trip`: Completed trip in the past

**Personas** (in `tests/fixtures/personas/`):
- `solo-traveler.json`: Alex Chen - Solo travel, flexible budget
- `family-vacation.json`: Johnson Family - 4 people with kids
- `business-trip.json`: Marcus Williams - Business travel, premium
- `group-adventure.json`: Adventure Friends - 6 people, budget-conscious

### Verifying Created Itineraries

After running `persona-itinerary-creation.e2e.test.ts`, itineraries are saved with `userId: "qa@test.com"`:

```bash
# View test output for created IDs
npm run test:e2e -- persona-itinerary-creation

# Output shows:
# ✅ Created itineraries for qa@test.com:
#    - 08d10489-69bc-41e0-aeff-59abd3491e31
#    - 1096bf81-ce50-4df9-98d1-331dcbb36a0d
#    ...
```

Check via API or UI:
```bash
# Via API
curl http://localhost:5176/api/v1/itineraries | jq '.[] | select(.userId == "qa@test.com")'

# Via UI (if logged in as qa@test.com)
open http://localhost:5176
```

## Writing New E2E Tests

### Template

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  TestClient,
  collectSSEEvents,
  assertNoErrors,
  extractTextFromEvents,
} from '../helpers/index.js';

describe('My E2E Test Suite', () => {
  let client: TestClient;
  let sessionId: string | null = null;
  let itineraryId: string | null = null;

  beforeAll(() => {
    client = new TestClient();
  });

  afterEach(async () => {
    // Cleanup
    if (itineraryId) {
      await client.deleteItinerary(itineraryId).catch(() => {});
      itineraryId = null;
    }
    sessionId = null;
  });

  it('should test something', async () => {
    // Create test itinerary
    const itinerary = await client.createItinerary({
      title: 'Test Trip',
      startDate: '2025-08-01T00:00:00.000Z',
      endDate: '2025-08-08T00:00:00.000Z',
    });
    itineraryId = itinerary.id;

    // Create session
    const session = await client.createSession(itineraryId);
    sessionId = session.sessionId;

    // Send message and collect events
    const events = await collectSSEEvents(
      await client.sendMessage(sessionId, 'Your test message')
    );

    // Assertions
    assertNoErrors(events);

    const text = extractTextFromEvents(events);
    expect(text).toContain('expected content');
  }, 60000); // 60 second timeout
});
```

### Best Practices

1. **Always clean up resources** in `afterEach`
2. **Use fixtures** when possible to save API calls
3. **Set 60-second timeout** for LLM calls: `}, 60000);`
4. **Test behavior, not implementation**
5. **Use descriptive test names**
6. **Verify no errors first** with `assertNoErrors(events)`
7. **Extract data efficiently** using helper functions

## Debugging

### Verbose Output

```bash
npx vitest run tests/e2e/trip-designer.e2e.test.ts --reporter=verbose
```

### Console Logging

E2E tests log SSE events automatically. Add custom logging:

```typescript
console.log('Events received:', events.length);
console.log('Text content:', extractTextFromEvents(events));
console.log('Tool calls:', extractToolCallsFromEvents(events));
```

### Check API Server Logs

Monitor the API server console for errors:

```bash
# In viewer-svelte directory
npm run dev

# Watch for error messages in console
```

### Inspect Itineraries

```bash
# List test itineraries
ls data/itineraries/

# View specific itinerary
cat data/itineraries/<id>.json | jq .
```

## Troubleshooting

### "ITINERIZER_TEST_API_KEY environment variable is required"

Set your OpenRouter API key:

```bash
export ITINERIZER_TEST_API_KEY="sk-or-v1-..."
```

### "Failed to connect to API"

Ensure the API server is running:

```bash
cd viewer-svelte
npm run dev
```

### "Test timeout exceeded"

LLM calls may take longer than expected. Increase timeout:

```typescript
it('should test something', async () => {
  // Test code
}, 120000); // Increase to 120 seconds
```

### Rate Limit Errors

Tests already run sequentially. If you still hit rate limits:

1. Reduce number of tests
2. Add delays between test suites
3. Use fixtures instead of creating new itineraries

### "Session not found"

Session may have expired. Tests clean up automatically, but if debugging:

```typescript
// Check session exists
const session = await client.getSession(sessionId);
console.log('Session:', session);
```

## Cost Estimation

Each test makes 1-3 LLM API calls:

- **Single test**: ~$0.01 - $0.05
- **Full suite**: ~$1.00 - $3.00
- **Daily development**: ~$10 - $20

Use fixtures and skip unnecessary tests during development to reduce costs.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Start API server
        run: |
          cd viewer-svelte
          npm run dev &
          sleep 10  # Wait for server to start

      - name: Run E2E tests
        env:
          ITINERIZER_TEST_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          VITE_API_URL: http://localhost:5176
        run: npm run test:e2e
```

### Skip E2E in CI (Cost Savings)

```yaml
# Only run E2E on main branch or release tags
- name: Run E2E tests
  if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/')
  run: npm run test:e2e
```

## Related Documentation

- [Test Helpers Documentation](../helpers/README.md)
- [Fixtures Documentation](../fixtures/README.md)
- [Trip Designer API](../../src/services/trip-designer/)
- [SSE Event Specification](../../src/domain/types/trip-designer.ts)

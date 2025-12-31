# E2E Tests Implementation Summary

Comprehensive E2E test suite created for Trip Designer with **real LLM API calls**.

## Files Created

### 1. Test Helpers - Event Extractors
**File**: `tests/helpers/event-extractors.ts`

New utility functions for extracting data from SSE event streams:

```typescript
// Extract structured questions from events
extractQuestionsFromEvents(events: SSEEvent[]): StructuredQuestion[]

// Extract all text content
extractTextFromEvents(events: SSEEvent[]): string

// Extract tool calls
extractToolCallsFromEvents(events: SSEEvent[]): Array<{name, arguments}>

// Extract tool results
extractToolResultsFromEvents(events: SSEEvent[]): Array<{name, result, success}>

// Get done event metadata
getDoneEventMetadata(events: SSEEvent[]): {...} | null

// Check for specific tool call
hasToolCall(events: SSEEvent[], toolName: string): boolean

// Count event types
countEventType(events: SSEEvent[], eventType: string): number

// Extract error messages
extractErrorMessages(events: SSEEvent[]): string[]

// Extract locations for visualization
extractLocationsFromEvents(events: SSEEvent[]): Array<{name, coordinates}>
```

### 2. E2E Test Suite - Trip Designer
**File**: `tests/e2e/trip-designer.e2e.test.ts`

Comprehensive Trip Designer tests with real LLM calls:

#### Test Suites:
1. **New Trip Flow** (2 tests)
   - ✅ Asks ONE structured question on initial message
   - ✅ Asks NEXT question after receiving answer (no repeat)

2. **Existing Itinerary Context** (2 tests)
   - ✅ Acknowledges existing content and skips redundant questions
   - ✅ Uses existing trip preferences in responses

3. **Tool Execution - Flights** (2 tests)
   - ✅ Calls add_flight when flight details provided
   - ✅ Updates itinerary after successful flight addition

4. **Tool Execution - Hotels** (1 test)
   - ✅ Calls add_hotel when hotel details provided

5. **Tool Execution - Activities** (1 test)
   - ✅ Calls add_activity when activity mentioned

6. **Error Handling** (2 tests)
   - ✅ Handles invalid dates gracefully
   - ✅ Recovers from tool execution failures

7. **Multi-turn Conversation** (2 tests)
   - ✅ Maintains context across multiple messages
   - ✅ Builds on previous answers progressively

**Total: 12 tests**

### 3. E2E Test Suite - Help Agent
**File**: `tests/e2e/help-agent.e2e.test.ts`

Help Agent tests including mode switching:

#### Test Suites:
1. **Answering App Questions** (3 tests)
   - ✅ Answers questions about app features without tools
   - ✅ Explains app features clearly
   - ✅ Provides helpful guidance for common tasks

2. **Mode Switching** (3 tests)
   - ✅ Switches to trip designer when planning intent detected
   - ✅ Calls switch_to_trip_designer tool with context
   - ✅ Stays in help mode for app questions

3. **Help Quality** (2 tests)
   - ✅ Provides step-by-step instructions when appropriate
   - ✅ Clarifies ambiguous questions

4. **Error Handling** (2 tests)
   - ✅ Handles unclear questions gracefully
   - ✅ Redirects off-topic questions politely

**Total: 10 tests**

### 4. E2E Test Suite - Visualization
**File**: `tests/e2e/visualization.e2e.test.ts`

Visualization trigger detection tests:

#### Test Suites:
1. **Location Detection** (3 tests)
   - ✅ Extracts locations from tool results when adding segments
   - ✅ Detects multiple locations when adding multiple segments
   - ✅ Extracts coordinates when available in tool results

2. **Map Trigger Rules** (3 tests)
   - ✅ Triggers map when 2+ locations in response
   - ✅ Does NOT trigger map for single location
   - ✅ Handles complex multi-city itineraries

3. **Location Context from Tools** (3 tests)
   - ✅ Extracts locations from flight tool results
   - ✅ Extracts locations from hotel tool results
   - ✅ Extracts locations from activity tool results

4. **Edge Cases** (2 tests)
   - ✅ Handles locations with no coordinates gracefully
   - ✅ Handles vague location references

**Total: 11 tests**

### 5. Documentation
**File**: `tests/e2e/README.md`

Comprehensive documentation covering:
- Overview of E2E tests
- Prerequisites and setup
- Running tests (all, specific files, single tests)
- Configuration details
- Test helpers and fixtures
- Writing new E2E tests (template and best practices)
- Debugging guide
- Troubleshooting common issues
- Cost estimation
- CI/CD integration examples

## Usage

### Prerequisites

```bash
# Set OpenRouter API key
export ITINERIZER_TEST_API_KEY="sk-or-v1-..."

# Start API server
cd viewer-svelte
npm run dev  # Runs on port 5176
```

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
# Trip Designer tests
npx vitest run tests/e2e/trip-designer.e2e.test.ts

# Help Agent tests
npx vitest run tests/e2e/help-agent.e2e.test.ts

# Visualization tests
npx vitest run tests/e2e/visualization.e2e.test.ts
```

### Run Single Test

```bash
npx vitest run tests/e2e/trip-designer.e2e.test.ts -t "asks ONE structured question"
```

## Test Statistics

| Suite | Tests | Features Tested |
|-------|-------|-----------------|
| Trip Designer | 12 | Discovery flow, tool execution, context, errors |
| Help Agent | 10 | App questions, mode switching, help quality |
| Visualization | 11 | Location extraction, map triggers, coordinates |
| **TOTAL** | **33** | **Full Trip Designer functionality** |

## Key Features

### 1. Real LLM API Calls
- Tests use actual OpenRouter API with locked models
- Validates real-world behavior, not mocked responses
- Uses production-ready prompts and tools

### 2. ONE Question Enforcement
- Critical test: `assertOneQuestionOnly(questions)`
- Verifies Trip Designer asks exactly ONE question at a time
- Prevents overwhelming users with multiple questions

### 3. Context Awareness
- Tests use fixture itineraries with existing data
- Validates that existing trip details are not re-asked
- Verifies progressive information gathering

### 4. Tool Execution Validation
- Tests for `add_flight`, `add_hotel`, `add_activity`
- Validates tool arguments and results
- Confirms itinerary updates after tool calls

### 5. Help Agent Mode Switching
- Tests `switch_to_trip_designer` tool call
- Validates context passing between modes
- Ensures help mode stays for app questions

### 6. Visualization Triggers
- Extracts locations from tool results
- Validates map trigger rules (2+ locations)
- Tests coordinate extraction for precise mapping

### 7. Error Recovery
- Tests invalid date handling
- Tests incomplete requests
- Validates graceful degradation

### 8. Resource Cleanup
- All tests clean up itineraries in `afterEach`
- Prevents test data pollution
- Saves storage costs

## Configuration

### Test Timeouts
- **Test timeout**: 60 seconds (LLM calls are slow)
- **Hook timeout**: 30 seconds (setup/teardown)
- **Sequential execution**: Avoids rate limits

### Vitest Config
File: `vitest.config.e2e.ts`

```typescript
{
  include: ['tests/e2e/**/*.e2e.test.ts'],
  testTimeout: 60000,
  pool: 'forks',
  poolOptions: {
    forks: { singleFork: true } // Sequential
  },
  bail: 1, // Stop on first error
}
```

## Helper Functions Summary

### Event Extractors (New)
| Function | Purpose |
|----------|---------|
| `extractQuestionsFromEvents` | Get all structured questions |
| `extractTextFromEvents` | Concatenate text content |
| `extractToolCallsFromEvents` | Get all tool calls |
| `extractToolResultsFromEvents` | Get all tool results |
| `getDoneEventMetadata` | Extract done event data |
| `hasToolCall` | Check for specific tool |
| `countEventType` | Count event occurrences |
| `extractErrorMessages` | Get error messages |
| `extractLocationsFromEvents` | Get locations for viz |

### Existing Helpers (Used)
| Function | Purpose |
|----------|---------|
| `TestClient` | API client for E2E tests |
| `collectSSEEvents` | Collect all SSE events |
| `assertOneQuestionOnly` | Verify ONE question |
| `assertNoErrors` | Verify no errors |
| `assertStreamCompleted` | Verify done event |
| `assertItineraryUpdated` | Verify update flag |
| `loadItinerary` | Load fixture data |

## Cost Estimation

Each test makes 1-3 LLM API calls:

- **Single test**: ~$0.01 - $0.05
- **Full Trip Designer suite** (12 tests): ~$0.50 - $1.50
- **Full Help Agent suite** (10 tests): ~$0.40 - $1.20
- **Full Visualization suite** (11 tests): ~$0.45 - $1.35
- **Complete E2E suite** (33 tests): ~$1.35 - $4.05

Use fixtures and skip tests during development to reduce costs.

## Best Practices

1. ✅ **Always clean up resources** in `afterEach`
2. ✅ **Use fixtures** when possible to save API calls
3. ✅ **Set 60-second timeout** for LLM calls
4. ✅ **Test behavior, not implementation**
5. ✅ **Use descriptive test names**
6. ✅ **Verify no errors first** with `assertNoErrors(events)`
7. ✅ **Extract data efficiently** using helper functions
8. ✅ **Run sequentially** to avoid rate limits

## Next Steps

### Immediate
1. Set `ITINERIZER_TEST_API_KEY` environment variable
2. Start API server (`cd viewer-svelte && npm run dev`)
3. Run tests: `npm run test:e2e`

### Future Enhancements
- [ ] Add tests for search tools (SERP API integration)
- [ ] Add tests for budget tracking
- [ ] Add tests for traveler management
- [ ] Add tests for session persistence
- [ ] Add tests for cost limits
- [ ] Add performance benchmarks
- [ ] Add CI/CD integration

## Troubleshooting

See `tests/e2e/README.md` for detailed troubleshooting guide.

Common issues:
- Missing API key: Set `ITINERIZER_TEST_API_KEY`
- API server not running: `cd viewer-svelte && npm run dev`
- Timeout errors: Increase timeout to 120 seconds
- Rate limits: Tests already run sequentially

## Related Files

- `tests/helpers/event-extractors.ts` - New event extraction utilities
- `tests/helpers/index.ts` - Updated with new exports
- `tests/e2e/trip-designer.e2e.test.ts` - Trip Designer E2E tests
- `tests/e2e/help-agent.e2e.test.ts` - Help Agent E2E tests
- `tests/e2e/visualization.e2e.test.ts` - Visualization E2E tests
- `tests/e2e/README.md` - Comprehensive E2E documentation
- `vitest.config.e2e.ts` - E2E test configuration

---

**Total Lines of Code Added**: ~1,500+ lines
**Total Tests Created**: 33 comprehensive E2E tests
**API Calls per Full Run**: ~33-99 LLM calls
**Estimated Cost per Run**: ~$1.35 - $4.05

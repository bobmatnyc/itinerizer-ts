# E2E Testing Framework Setup - Complete

## Files Created

### Configuration Files

1. **tests/config/models.ts**
   - Model configurations for three agent types (trip-designer, help, travel-agent)
   - Locked production models with max tokens
   - Eval models for experimentation
   - Helper functions: `getModelForAgent()`, `getMaxTokensForAgent()`, etc.

2. **vitest.config.e2e.ts**
   - Separate Vitest config for E2E tests
   - 60-second timeout per test for LLM calls
   - Sequential execution (singleFork) to avoid rate limits
   - Only includes `tests/e2e/**/*.e2e.test.ts`
   - Bail on first error to save API calls

3. **tests/setup-e2e.ts**
   - E2E test environment validation
   - Checks for `ITINERIZER_TEST_API_KEY` environment variable
   - Verifies test server is running at `http://localhost:5176`
   - Global test utilities:
     - `testConfig` - Base URL, API key, timeouts
     - `waitFor()` - Async condition helper
     - `createTestUserId()` - Unique test user IDs
     - `cleanupTestItineraries()` - Test data cleanup

4. **vitest.config.ts** (modified)
   - Updated to only include unit/integration tests
   - Excludes E2E tests (separate config)
   - Patterns: `tests/unit/**/*.test.ts`, `tests/integration/**/*.test.ts`

5. **.env.test.example**
   - Template for test environment variables
   - `ITINERIZER_TEST_API_KEY` - OpenRouter API key
   - `ITINERIZER_TEST_BASE_URL` - Test server URL
   - Optional model overrides

6. **.gitignore** (modified)
   - Added `.env.test` to prevent committing test API keys

7. **package.json** (modified)
   - Added `test:e2e` script: `vitest --config vitest.config.e2e.ts`

8. **tests/README.md**
   - Comprehensive testing documentation
   - Setup instructions for E2E tests
   - Model configuration guide
   - Best practices and troubleshooting

### Directory Structure

```
tests/
├── config/
│   └── models.ts              # Model configurations
├── unit/                      # Unit tests (existing)
├── integration/               # Integration tests (existing)
├── e2e/                       # E2E tests (new)
│   ├── trip-designer/         # Trip Designer agent E2E tests
│   │   └── .gitkeep
│   ├── help/                  # Help agent E2E tests
│   │   └── .gitkeep
│   └── travel-agent/          # Travel Agent E2E tests
│       └── .gitkeep
├── setup-e2e.ts              # E2E test setup
└── README.md                  # Testing documentation
```

## Model Configurations

### Locked Production Models

| Agent | Model | Max Tokens | Rationale |
|-------|-------|------------|-----------|
| **Trip Designer** | claude-sonnet-4 | 4096 | Best balance of reasoning, tool use, and cost |
| **Help** | claude-3-haiku | 2048 | Fast and cheap for simple Q&A |
| **Travel Agent** | claude-sonnet-4 | 4096 | Needs reasoning for search synthesis |

### Evaluation Models

Available for experimentation:
- `anthropic/claude-sonnet-4`
- `anthropic/claude-3-haiku`
- `anthropic/claude-opus-4`
- `openai/gpt-4o`
- `google/gemini-2.0-flash`

## Usage

### Setup (One Time)

```bash
# Create test environment file
cp .env.test.example .env.test

# Add your OpenRouter API key
# Edit .env.test and set ITINERIZER_TEST_API_KEY
```

### Running E2E Tests

```bash
# Terminal 1: Start test server
cd viewer-svelte && npm run dev

# Terminal 2: Run E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- trip-designer

# Run with verbose output
npm run test:e2e -- --reporter=verbose
```

### Running Unit/Integration Tests

```bash
# All unit/integration tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## Key Features

### Sequential Execution
E2E tests run one at a time to avoid OpenRouter rate limits:
```typescript
poolOptions: {
  forks: {
    singleFork: true, // Sequential execution
  },
}
```

### Long Timeouts
LLM calls can take time:
- Test timeout: 60 seconds
- Hook timeout: 30 seconds

### Environment Validation
Setup file checks requirements before running tests:
- API key is set
- Test server is running
- Provides clear error messages if not

### Test Utilities
Helper functions for common E2E patterns:
- Unique user IDs per test run
- Async condition waiting
- Automatic cleanup

## Next Steps

1. **Write First E2E Test**: Create `tests/e2e/trip-designer/basic.e2e.test.ts`
2. **Add Health Check**: Create `tests/e2e/health.e2e.test.ts` as smoke test
3. **Document Test Cases**: Define scenarios in test plan
4. **CI Integration**: Add E2E tests to GitHub Actions workflow

## Test Writing Guidelines

### File Naming
- Use `.e2e.test.ts` suffix for E2E tests
- Example: `trip-designer.e2e.test.ts`

### Test Structure
```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { testConfig, createTestUserId, cleanupTestItineraries } from '../setup-e2e';
import { getModelForAgent } from '../config/models';

describe('Agent E2E Tests', () => {
  const userId = createTestUserId();

  afterEach(async () => {
    await cleanupTestItineraries(userId);
  });

  it('should handle user request', async () => {
    // Test implementation
  });
});
```

### Best Practices
1. Always cleanup test data in `afterEach`
2. Use `createTestUserId()` for isolation
3. Import model config from `tests/config/models.ts`
4. Use appropriate timeouts from `testConfig.timeout`
5. Verify both success and error paths

## LOC Delta

```
Added: ~350 lines
- tests/config/models.ts: ~70 lines
- vitest.config.e2e.ts: ~30 lines
- tests/setup-e2e.ts: ~120 lines
- tests/README.md: ~120 lines
- .env.test.example: ~10 lines

Modified: ~10 lines
- vitest.config.ts: ~5 lines
- .gitignore: ~1 line
- package.json: ~1 line

Net Change: +360 lines
```

## Related Documentation

- [tests/README.md](tests/README.md) - Comprehensive testing guide
- [tests/config/models.ts](tests/config/models.ts) - Model configurations
- [vitest.config.e2e.ts](vitest.config.e2e.ts) - E2E test config

---

**Status**: ✅ Ready for first E2E test implementation
**Phase**: Configuration complete, test writing ready to begin

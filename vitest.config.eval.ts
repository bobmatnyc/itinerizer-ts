import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for AI quality evaluation tests
 *
 * Separate from E2E tests with:
 * - Longer timeouts (10 minutes per scenario)
 * - Sequential execution (one scenario at a time)
 * - No parallelization (avoid API rate limits)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/eval/**/*.test.ts'],
    exclude: [
      'tests/unit/**',
      'tests/integration/**',
      'tests/e2e/**',
      'node_modules/',
    ],
    // Sequential execution - one scenario at a time
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Force sequential execution
      },
    },
    // Long timeouts for multi-turn conversations
    testTimeout: 600000, // 10 minutes per test
    hookTimeout: 30000,  // 30 seconds for hooks
    // Detailed output
    reporters: ['verbose'],
    // Environment setup
    setupFiles: ['./tests/setup-e2e.ts'], // Reuse E2E setup for API authentication
  },
});

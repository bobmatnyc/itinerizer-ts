#!/usr/bin/env node

/**
 * Verify health monitoring integration
 * Checks all components are properly connected
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

async function checkFileContains(filePath, patterns) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const results = patterns.map(({ pattern, description }) => {
      const found = typeof pattern === 'string'
        ? content.includes(pattern)
        : pattern.test(content);
      return { description, found };
    });
    return results;
  } catch (error) {
    return patterns.map(p => ({
      description: p.description,
      found: false,
      error: error.message
    }));
  }
}

async function main() {
  console.log('🔍 Verifying Health Monitoring Integration\n');

  // Check 1: Health endpoint exists
  console.log('1️⃣  Checking health endpoint...');
  const healthEndpoint = await checkFileContains(
    'src/routes/api/v1/health/+server.ts',
    [
      { pattern: 'export const GET', description: 'GET handler exists' },
      { pattern: 'status: \'ok\'', description: 'Returns status' },
      { pattern: 'timestamp', description: 'Returns timestamp' },
    ]
  );
  healthEndpoint.forEach(r =>
    console.log(`   ${r.found ? '✅' : '❌'} ${r.description}`)
  );

  // Check 2: Health store implementation
  console.log('\n2️⃣  Checking health store...');
  const healthStore = await checkFileContains(
    'src/lib/stores/health.svelte.ts',
    [
      { pattern: 'class HealthStore', description: 'HealthStore class defined' },
      { pattern: '$state', description: 'Uses Svelte 5 runes' },
      { pattern: 'start()', description: 'Has start method' },
      { pattern: 'stop()', description: 'Has stop method' },
      { pattern: 'exponential', description: 'Implements exponential backoff' },
    ]
  );
  healthStore.forEach(r =>
    console.log(`   ${r.found ? '✅' : '❌'} ${r.description}`)
  );

  // Check 3: Status banner component
  console.log('\n3️⃣  Checking status banner...');
  const statusBanner = await checkFileContains(
    'src/lib/components/HealthStatusBanner.svelte',
    [
      { pattern: 'healthStore.isOffline', description: 'Shows when offline' },
      { pattern: 'healthStore.wasOffline', description: 'Tracks reconnection' },
      { pattern: 'bg-yellow-500', description: 'Yellow warning style' },
      { pattern: 'bg-green-500', description: 'Green success style' },
      { pattern: 'handleDismiss', description: 'Dismissable' },
    ]
  );
  statusBanner.forEach(r =>
    console.log(`   ${r.found ? '✅' : '❌'} ${r.description}`)
  );

  // Check 4: Layout integration
  console.log('\n4️⃣  Checking layout integration...');
  const layout = await checkFileContains(
    'src/routes/+layout.svelte',
    [
      { pattern: 'import HealthStatusBanner', description: 'Imports banner component' },
      { pattern: 'import { healthStore }', description: 'Imports health store' },
      { pattern: 'healthStore.start()', description: 'Starts monitoring' },
      { pattern: 'healthStore.stop()', description: 'Stops monitoring' },
      { pattern: '<HealthStatusBanner', description: 'Renders banner' },
    ]
  );
  layout.forEach(r =>
    console.log(`   ${r.found ? '✅' : '❌'} ${r.description}`)
  );

  // Check 5: API client integration
  console.log('\n5️⃣  Checking API client...');
  const apiClient = await checkFileContains(
    'src/lib/api.ts',
    [
      { pattern: 'HEALTH: \'/api/v1/health\'', description: 'Health endpoint constant' },
      { pattern: 'async checkHealth()', description: 'Health check method' },
    ]
  );
  apiClient.forEach(r =>
    console.log(`   ${r.found ? '✅' : '❌'} ${r.description}`)
  );

  // Check 6: Public route configuration
  console.log('\n6️⃣  Checking public route configuration...');
  const hooks = await checkFileContains(
    'src/hooks.server.ts',
    [
      { pattern: '/api/v1/health', description: 'Health endpoint in PUBLIC_ROUTES' },
    ]
  );
  hooks.forEach(r =>
    console.log(`   ${r.found ? '✅' : '❌'} ${r.description}`)
  );

  // Summary
  console.log('\n📊 Summary:');
  const allChecks = [
    ...healthEndpoint,
    ...healthStore,
    ...statusBanner,
    ...layout,
    ...apiClient,
    ...hooks,
  ];

  const passed = allChecks.filter(c => c.found).length;
  const total = allChecks.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`   Passed: ${passed}/${total} (${percentage}%)`);

  if (percentage === 100) {
    console.log('\n✅ All integration checks passed!');
    console.log('📋 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Open: http://localhost:5176/itineraries');
    console.log('   3. Test offline scenario (stop server)');
    console.log('   4. Test reconnection (restart server)');
  } else {
    console.log('\n⚠️  Some checks failed. Review the results above.');
    process.exit(1);
  }
}

main().catch(console.error);

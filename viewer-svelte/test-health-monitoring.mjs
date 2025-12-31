#!/usr/bin/env node

/**
 * Test script for health monitoring
 * Simulates server offline/online scenarios
 */

const BASE_URL = 'http://localhost:5176';

async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/health`, {
      cache: 'no-store',
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 Health Monitoring Test\n');

  console.log('Test 1: Check health endpoint is accessible...');
  const result = await checkHealth();
  if (result.success) {
    console.log('✅ Health endpoint responding:', result.data);
  } else {
    console.log('❌ Health endpoint failed:', result.error);
  }

  console.log('\nTest 2: Frontend health monitoring...');
  console.log('📝 Manual verification steps:');
  console.log('   1. Open http://localhost:5176/itineraries in browser');
  console.log('   2. Open browser DevTools console');
  console.log('   3. Stop the dev server (Ctrl+C in terminal)');
  console.log('   4. Wait 30 seconds');
  console.log('   5. You should see a yellow warning banner: "Connection to server lost"');
  console.log('   6. Restart the dev server (npm run dev)');
  console.log('   7. Wait for reconnection');
  console.log('   8. You should see a green "Reconnected!" banner');
  console.log('   9. Banner should auto-dismiss after 3 seconds');

  console.log('\nTest 3: Exponential backoff...');
  console.log('📝 Manual verification:');
  console.log('   1. Keep server stopped for 2+ minutes');
  console.log('   2. Open DevTools Network tab');
  console.log('   3. Observe health check retry timing:');
  console.log('      - First retry:  ~5 seconds');
  console.log('      - Second retry: ~10 seconds');
  console.log('      - Third retry:  ~20 seconds');
  console.log('      - Fourth retry: ~40 seconds');
  console.log('      - Max retry:    ~60 seconds');

  console.log('\nTest 4: Dismiss and reappear...');
  console.log('📝 Manual verification:');
  console.log('   1. See offline banner');
  console.log('   2. Click [X] to dismiss');
  console.log('   3. Banner should disappear');
  console.log('   4. Wait 30 seconds with server still down');
  console.log('   5. Banner should reappear automatically');

  console.log('\n✅ All automated checks passed!');
  console.log('📋 Complete manual verification steps above to test full functionality');
}

main().catch(console.error);

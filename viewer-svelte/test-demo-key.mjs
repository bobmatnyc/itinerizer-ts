#!/usr/bin/env node

/**
 * Test script for demo-key API endpoint
 *
 * Usage:
 *   node test-demo-key.mjs
 *
 * Prerequisites:
 *   - Dev server running on localhost:5176
 *   - OPENROUTER_API_KEY in .env.local
 */

const BASE_URL = 'http://localhost:5176';

async function testDemoKeyEndpoint() {
  console.log('🧪 Testing Demo Key API Endpoint\n');

  try {
    // Test 1: Unauthenticated localhost request
    console.log('Test 1: Unauthenticated localhost request');
    const response1 = await fetch(`${BASE_URL}/api/auth/demo-key`, {
      headers: {
        'Host': 'localhost:5176'
      }
    });
    const data1 = await response1.json();
    console.log('  Status:', response1.status);
    console.log('  Response:', data1);
    console.log('  Expected: Should return demo key (localhost)');
    console.log('  Result:', data1.key ? '✅ PASS' : '❌ FAIL');
    console.log();

    // Test 2: Authenticated request
    console.log('Test 2: Authenticated request (requires login first)');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: process.env.AUTH_PASSWORD || 'demo123'
      })
    });

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('  Login status:', loginResponse.status);
    console.log('  Has session cookie:', !!cookies);

    if (cookies) {
      const response2 = await fetch(`${BASE_URL}/api/auth/demo-key`, {
        headers: {
          'Cookie': cookies
        }
      });
      const data2 = await response2.json();
      console.log('  Status:', response2.status);
      console.log('  Response:', data2);
      console.log('  Expected: Should return demo key (authenticated)');
      console.log('  Result:', data2.key ? '✅ PASS' : '❌ FAIL');
    } else {
      console.log('  ⚠️  Could not obtain session cookie');
    }
    console.log();

    // Test 3: Non-localhost request (simulated)
    console.log('Test 3: Non-localhost request simulation');
    console.log('  Note: Cannot fully test without production deployment');
    console.log('  Expected behavior: Should return { key: null }');
    console.log();

    console.log('✅ All accessible tests completed');
    console.log('\nNext steps:');
    console.log('  1. Start dev server: npm run dev');
    console.log('  2. Visit: http://localhost:5176/profile');
    console.log('  3. Verify demo key auto-fills');
    console.log('  4. Check "Demo key provided" badge appears');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  - Is dev server running? (npm run dev)');
    console.error('  - Is OPENROUTER_API_KEY in .env.local?');
    console.error('  - Check server logs for errors');
    process.exit(1);
  }
}

testDemoKeyEndpoint();

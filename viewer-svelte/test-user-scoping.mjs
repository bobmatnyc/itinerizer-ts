#!/usr/bin/env node

/**
 * Test User Scoping Fix
 *
 * This script verifies that the API client correctly sends the X-User-Email header
 * and that different users see different itineraries.
 *
 * Usage:
 *   node test-user-scoping.mjs
 */

const API_BASE_URL = 'http://localhost:5176'; // SvelteKit dev server

async function testUserScoping() {
  console.log('🧪 Testing User Scoping Fix\n');

  // Test 1: Fetch itineraries as bob@matsuoka.com
  console.log('Test 1: Fetching as bob@matsuoka.com');
  const bobResponse = await fetch(`${API_BASE_URL}/api/v1/itineraries`, {
    headers: {
      'X-User-Email': 'bob@matsuoka.com',
    },
  });
  const bobItineraries = await bobResponse.json();
  console.log(`✅ Bob sees ${bobItineraries.length} itineraries`);
  console.log(`   First 3 IDs: ${bobItineraries.slice(0, 3).map(i => i.id.slice(0, 8)).join(', ')}...\n`);

  // Test 2: Fetch itineraries as alice@example.com
  console.log('Test 2: Fetching as alice@example.com');
  const aliceResponse = await fetch(`${API_BASE_URL}/api/v1/itineraries`, {
    headers: {
      'X-User-Email': 'alice@example.com',
    },
  });
  const aliceItineraries = await aliceResponse.json();
  console.log(`✅ Alice sees ${aliceItineraries.length} itineraries`);
  if (aliceItineraries.length > 0) {
    console.log(`   First 3 IDs: ${aliceItineraries.slice(0, 3).map(i => i.id.slice(0, 8)).join(', ')}...\n`);
  } else {
    console.log(`   (No itineraries yet)\n`);
  }

  // Test 3: Verify no overlap
  console.log('Test 3: Verifying data isolation');
  const bobIds = new Set(bobItineraries.map(i => i.id));
  const aliceIds = new Set(aliceItineraries.map(i => i.id));
  const overlap = [...bobIds].filter(id => aliceIds.has(id));

  if (overlap.length === 0) {
    console.log('✅ No data overlap - users are properly isolated\n');
  } else {
    console.log(`❌ FAILED: ${overlap.length} itineraries visible to both users!`);
    console.log(`   Overlapping IDs: ${overlap.slice(0, 3).join(', ')}\n`);
  }

  // Test 4: Verify no header = all data (or error)
  console.log('Test 4: Fetching without X-User-Email header');
  const noHeaderResponse = await fetch(`${API_BASE_URL}/api/v1/itineraries`);
  const noHeaderItineraries = await noHeaderResponse.json();
  console.log(`   Returns ${noHeaderItineraries.length} itineraries (all users)\n`);

  // Summary
  console.log('📊 Summary:');
  console.log(`   Bob's itineraries: ${bobItineraries.length}`);
  console.log(`   Alice's itineraries: ${aliceItineraries.length}`);
  console.log(`   Data isolation: ${overlap.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Without header: ${noHeaderItineraries.length} (expected: all users combined)`);
}

// Run tests
testUserScoping().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});

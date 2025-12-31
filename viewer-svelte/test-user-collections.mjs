#!/usr/bin/env node

/**
 * Test user-scoped collections
 * 1. Login with test@example.com
 * 2. List itineraries (should see filtering logs)
 * 3. Login with another@example.com
 * 4. List itineraries again
 */

const API_URL = 'http://localhost:5176';

async function login(email) {
  console.log(`\n--- Logging in as ${email} ---`);
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await response.json();
  console.log('Login response:', data);

  // Extract cookies from response
  const cookies = response.headers.get('set-cookie');
  console.log('Cookies:', cookies);

  return cookies;
}

async function listItineraries(cookies) {
  console.log('\n--- Listing itineraries ---');
  const response = await fetch(`${API_URL}/api/v1/itineraries`, {
    headers: {
      'Cookie': cookies || ''
    }
  });

  const data = await response.json();
  console.log('Itineraries response:', {
    count: data.length,
    itineraries: data.map(i => ({ id: i.id, title: i.title, createdBy: i.createdBy }))
  });

  return data;
}

async function main() {
  console.log('Testing user-scoped collections...\n');

  // Test 1: test@example.com
  const cookies1 = await login('test@example.com');
  await listItineraries(cookies1);

  // Test 2: another@example.com
  const cookies2 = await login('another@example.com');
  await listItineraries(cookies2);

  console.log('\n--- Check server logs for filtering details ---');
}

main().catch(console.error);

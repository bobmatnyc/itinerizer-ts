#!/usr/bin/env node

/**
 * Test user-scoped collections with proper cookie handling
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

  // Extract cookies from Set-Cookie headers
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  console.log('Set-Cookie headers:', setCookieHeaders);

  // Parse cookies into a cookie header string
  const cookies = setCookieHeaders
    .map(cookie => cookie.split(';')[0]) // Get just the name=value part
    .join('; ');

  console.log('Cookie header for next request:', cookies);

  return cookies;
}

async function listItineraries(cookies) {
  console.log('\n--- Listing itineraries ---');
  console.log('Using cookies:', cookies);

  const response = await fetch(`${API_URL}/api/v1/itineraries`, {
    headers: {
      'Cookie': cookies
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
  const itineraries1 = await listItineraries(cookies1);

  // Test 2: another@example.com
  const cookies2 = await login('another@example.com');
  const itineraries2 = await listItineraries(cookies2);

  console.log('\n--- Summary ---');
  console.log('test@example.com saw:', itineraries1.length, 'itineraries');
  console.log('another@example.com saw:', itineraries2.length, 'itineraries');
  console.log('\n--- Check server logs for filtering details ---');
}

main().catch(console.error);

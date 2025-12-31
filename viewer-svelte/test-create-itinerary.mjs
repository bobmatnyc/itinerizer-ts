#!/usr/bin/env node

/**
 * Test creating an itinerary with createdBy
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

  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  const cookies = setCookieHeaders
    .map(cookie => cookie.split(';')[0])
    .join('; ');

  return cookies;
}

async function createItinerary(cookies, title) {
  console.log(`\n--- Creating itinerary: ${title} ---`);
  const response = await fetch(`${API_URL}/api/v1/itineraries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      title,
      description: 'Test itinerary',
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      draft: false
    })
  });

  const data = await response.json();
  console.log('Created itinerary:', {
    id: data.id,
    title: data.title,
    createdBy: data.createdBy
  });

  return data;
}

async function listItineraries(cookies) {
  console.log('\n--- Listing itineraries ---');
  const response = await fetch(`${API_URL}/api/v1/itineraries`, {
    headers: { 'Cookie': cookies }
  });

  const data = await response.json();
  console.log('Found itineraries:', {
    count: data.length,
    itineraries: data.map(i => ({ id: i.id, title: i.title, createdBy: i.createdBy }))
  });

  return data;
}

async function main() {
  console.log('Testing itinerary creation with user ownership...\n');

  // Test 1: Create as test@example.com
  const cookies1 = await login('test@example.com');
  await createItinerary(cookies1, 'Test User Trip');
  const list1 = await listItineraries(cookies1);

  // Test 2: Create as another@example.com
  const cookies2 = await login('another@example.com');
  await createItinerary(cookies2, 'Another User Trip');
  const list2 = await listItineraries(cookies2);

  // Test 3: List again as test@example.com to verify isolation
  const list1Again = await listItineraries(cookies1);

  console.log('\n--- Summary ---');
  console.log('test@example.com sees:', list1Again.length, 'itineraries');
  console.log('another@example.com sees:', list2.length, 'itineraries');
}

main().catch(console.error);

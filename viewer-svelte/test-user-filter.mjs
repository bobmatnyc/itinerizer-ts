/**
 * Test user-scoped itinerary filtering
 */

const BASE_URL = 'http://localhost:5176';

async function testUserFilter() {
	console.log('=== Testing User-Scoped Itinerary Filtering ===\n');

	// Test 1: Login as bob@matsuoka.com
	console.log('1. Logging in as bob@matsuoka.com...');
	const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: 'bob@matsuoka.com', password: '' })
	});

	if (!loginResponse.ok) {
		console.error('Login failed:', await loginResponse.text());
		return;
	}

	const loginData = await loginResponse.json();
	console.log('Login response:', loginData);

	// Extract cookies from Set-Cookie headers
	const cookies = loginResponse.headers.getSetCookie();
	console.log('Cookies set:', cookies);

	// Parse cookies into a cookie header
	const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
	console.log('Cookie header:', cookieHeader);

	// Test 2: List itineraries as bob@matsuoka.com (should see 18)
	console.log('\n2. Listing itineraries as bob@matsuoka.com...');
	const listResponse = await fetch(`${BASE_URL}/api/v1/itineraries`, {
		headers: { 'Cookie': cookieHeader }
	});

	if (!listResponse.ok) {
		console.error('List failed:', await listResponse.text());
		return;
	}

	const itineraries = await listResponse.json();
	console.log(`Found ${itineraries.length} itineraries`);
	console.log('First itinerary:', itineraries[0]);

	// Test 3: Login as different user
	console.log('\n3. Logging in as alice@example.com...');
	const login2Response = await fetch(`${BASE_URL}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: 'alice@example.com', password: '' })
	});

	const login2Data = await login2Response.json();
	console.log('Login response:', login2Data);

	const cookies2 = login2Response.headers.getSetCookie();
	const cookieHeader2 = cookies2.map(cookie => cookie.split(';')[0]).join('; ');

	// Test 4: List itineraries as alice@example.com (should see 0)
	console.log('\n4. Listing itineraries as alice@example.com...');
	const list2Response = await fetch(`${BASE_URL}/api/v1/itineraries`, {
		headers: { 'Cookie': cookieHeader2 }
	});

	const itineraries2 = await list2Response.json();
	console.log(`Found ${itineraries2.length} itineraries`);

	// Summary
	console.log('\n=== Summary ===');
	console.log(`bob@matsuoka.com: ${itineraries.length} itineraries (expected 18)`);
	console.log(`alice@example.com: ${itineraries2.length} itineraries (expected 0)`);

	if (itineraries.length === 18 && itineraries2.length === 0) {
		console.log('✅ User filtering is working correctly!');
	} else {
		console.log('❌ User filtering is NOT working correctly!');
	}
}

testUserFilter().catch(console.error);

/**
 * Test script to verify the TripDesignerService caching fix
 *
 * This test:
 * 1. Creates a session using header API key
 * 2. Sends a message to that session using the same header API key
 * 3. Verifies the session persists across requests
 */

const API_BASE = 'http://localhost:5177/api/v1/designer';
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error('❌ OPENROUTER_API_KEY environment variable not set');
  process.exit(1);
}

// Test itinerary ID (using one from git status)
const TEST_ITINERARY_ID = '7d9a4a57-2955-49e8-9877-1e36e9f2c275';

async function testSessionPersistence() {
  console.log('🧪 Testing Session Persistence Fix\n');

  // Step 1: Create a session
  console.log('1️⃣  Creating session...');
  const createResponse = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OpenRouter-API-Key': API_KEY,
    },
    body: JSON.stringify({ itineraryId: TEST_ITINERARY_ID }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.error(`❌ Failed to create session: ${createResponse.status}`);
    console.error(error);
    return false;
  }

  const { sessionId } = await createResponse.json();
  console.log(`✅ Session created: ${sessionId}\n`);

  // Step 2: Send a message to the session (non-streaming)
  console.log('2️⃣  Sending message to session...');
  const messageResponse = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OpenRouter-API-Key': API_KEY,
    },
    body: JSON.stringify({ message: 'Hello, what can you help me with?' }),
  });

  if (!messageResponse.ok) {
    const error = await messageResponse.text();
    console.error(`❌ Failed to send message: ${messageResponse.status}`);
    console.error(error);

    // Check if it's the "Session not found" error
    if (error.includes('Session not found')) {
      console.error('\n💥 BUG STILL EXISTS: Session was not found in the second request!');
      console.error('This means the TripDesignerService cache is not working correctly.');
      return false;
    }

    return false;
  }

  const response = await messageResponse.json();
  console.log('✅ Message sent successfully!\n');
  console.log('📝 Response preview:', JSON.stringify(response, null, 2).slice(0, 500) + '...\n');

  // Step 3: Verify we can get the session
  console.log('3️⃣  Retrieving session to verify state...');
  const getSessionResponse = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'X-OpenRouter-API-Key': API_KEY,
    },
  });

  if (!getSessionResponse.ok) {
    const error = await getSessionResponse.text();
    console.error(`❌ Failed to get session: ${getSessionResponse.status}`);
    console.error(error);
    return false;
  }

  const session = await getSessionResponse.json();
  console.log(`✅ Session retrieved successfully!`);
  console.log(`   - Session ID: ${session.id}`);
  console.log(`   - Itinerary ID: ${session.itineraryId}`);
  console.log(`   - Message count: ${session.messages?.length || 0}`);
  console.log(`   - Created at: ${session.createdAt}\n`);

  console.log('🎉 SUCCESS! The session persistence fix is working correctly!');
  console.log('   - Session was created with header API key');
  console.log('   - Message was sent to the same session using header API key');
  console.log('   - Session state persisted across requests\n');

  return true;
}

// Run the test
testSessionPersistence()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  });

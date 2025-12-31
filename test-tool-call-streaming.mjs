/**
 * Test script to verify tool call streaming fix
 */

const API_URL = 'http://localhost:5177';

// Use test API key from environment or default
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'sk-or-v1-test';

async function testToolCallStreaming() {
  console.log('=== Testing Tool Call Streaming Fix ===\n');

  try {
    // 1. Create a new itinerary
    console.log('1. Creating test itinerary...');
    const createResponse = await fetch(`${API_URL}/api/v1/itineraries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user',
      },
      body: JSON.stringify({
        title: 'Tool Call Test Trip',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create itinerary: ${createResponse.status}`);
    }

    const itinerary = await createResponse.json();
    console.log(`✓ Created itinerary: ${itinerary.id}\n`);

    // 2. Create designer session
    console.log('2. Creating Trip Designer session...');
    const sessionResponse = await fetch(`${API_URL}/api/v1/designer/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user',
        'x-openrouter-api-key': OPENROUTER_API_KEY,
      },
      body: JSON.stringify({
        itineraryId: itinerary.id,
      }),
    });

    if (!sessionResponse.ok) {
      throw new Error(`Failed to create session: ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();
    console.log(`✓ Created session: ${session.sessionId}\n`);

    // 3. Send a message that should trigger get_itinerary tool call
    console.log('3. Sending message to trigger tool call...');
    console.log('Message: "What do I have planned so far?"\n');

    const streamResponse = await fetch(
      `${API_URL}/api/v1/designer/sessions/${session.sessionId}/messages/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-openrouter-api-key': OPENROUTER_API_KEY,
        },
        body: JSON.stringify({
          message: "What do I have planned so far?",
        }),
      }
    );

    if (!streamResponse.ok) {
      throw new Error(`Failed to send message: ${streamResponse.status}`);
    }

    // 4. Process streaming response
    console.log('4. Processing streaming response...\n');
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let toolCallReceived = false;
    let textReceived = false;
    let errorReceived = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          if (event.type === 'tool_call') {
            toolCallReceived = true;
            console.log(`✓ Tool call received: ${event.name}`);
            console.log(`  Arguments:`, JSON.stringify(event.arguments, null, 2));
          } else if (event.type === 'tool_result') {
            console.log(`✓ Tool result received: ${event.name}`);
            console.log(`  Success: ${event.success}`);
            if (!event.success) {
              const errorMsg = event.result && event.result.error ? event.result.error : 'Unknown error';
              console.log(`  Error: ${errorMsg}`);
            }
          } else if (event.type === 'text') {
            textReceived = true;
            process.stdout.write('.');
          } else if (event.type === 'error') {
            errorReceived = true;
            console.error(`\n✗ Error received: ${event.message}`);
          } else if (event.type === 'done') {
            console.log(`\n\n✓ Stream completed`);
            const totalTokens = event.tokens && event.tokens.total ? event.tokens.total : 0;
            const inputTokens = event.tokens && event.tokens.input ? event.tokens.input : 0;
            const outputTokens = event.tokens && event.tokens.output ? event.tokens.output : 0;
            const totalCost = event.cost && event.cost.total ? event.cost.total.toFixed(4) : '0.0000';
            console.log(`  Tokens: ${totalTokens} (input: ${inputTokens}, output: ${outputTokens})`);
            console.log(`  Cost: $${totalCost}`);
          }
        } catch (parseError) {
          console.error('Failed to parse event:', data);
        }
      }
    }

    console.log('\n\n=== Test Results ===');
    console.log(`Tool call received: ${toolCallReceived ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Text response received: ${textReceived ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`No errors: ${!errorReceived ? '✓ PASS' : '✗ FAIL'}`);

    if (toolCallReceived && textReceived && !errorReceived) {
      console.log('\n🎉 All tests PASSED! Tool call streaming is working correctly.\n');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests FAILED. Check the output above for details.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
testToolCallStreaming();

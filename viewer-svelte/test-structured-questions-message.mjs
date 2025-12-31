#!/usr/bin/env node

/**
 * Test script to verify that structured questions preserve the AI message text
 *
 * This simulates the streaming response flow to ensure that when an AI response
 * contains structured questions, the message text is properly extracted and displayed.
 */

// Mock data simulating what the backend sends
const mockStreamResponses = {
  // Case 1: Message with structured questions (JSON format)
  withStructuredQuestions: `{
  "message": "Great question! For your April 29th departure, what time preference works best?",
  "structuredQuestions": [
    {
      "id": "q1",
      "type": "single_choice",
      "question": "What time preference works best?",
      "options": [
        { "id": "afternoon", "label": "Afternoon Departure", "description": "Leave after 2pm" },
        { "id": "evening", "label": "Evening Departure", "description": "Leave after 6pm" }
      ]
    }
  ]
}`,

  // Case 2: Regular message without structured questions
  regularMessage: "I'll help you plan your trip to Tokyo! Let me start by asking a few questions.",

  // Case 3: Message in JSON block (fenced)
  fencedJsonMessage: `\`\`\`json
{
  "message": "Let me help you choose the best flight option.",
  "structuredQuestions": [
    {
      "id": "q2",
      "type": "single_choice",
      "question": "Which matters most to you?",
      "options": [
        { "id": "price", "label": "Best Price" },
        { "id": "time", "label": "Best Time" }
      ]
    }
  ]
}
\`\`\``
};

/**
 * Clean message content by removing JSON blocks (simulates frontend logic)
 */
function cleanMessageContent(content) {
  if (!content) return '';

  let cleaned = content;

  // Remove fenced JSON blocks
  cleaned = cleaned.replace(/```json\s*[\s\S]*?```/g, '');

  // Try to extract message from naked JSON object with "message" field
  const jsonObjectMatch = cleaned.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,[\s\S]*)?\}/);
  if (jsonObjectMatch) {
    try {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed.message) {
        cleaned = cleaned.replace(jsonObjectMatch[0], parsed.message);
      }
    } catch (e) {
      const messageValue = jsonObjectMatch[1];
      if (messageValue) {
        const unescaped = messageValue.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        cleaned = cleaned.replace(jsonObjectMatch[0], unescaped);
      }
    }
  }

  // Remove any remaining JSON structures
  cleaned = cleaned.replace(/\{\s*"(?:message|structuredQuestions|type|id)"[\s\S]*?\}/g, '');

  return cleaned.trim();
}

/**
 * Extract message from JSON when cleanedContent is empty (NEW FIX)
 */
function extractMessageFromJson(accumulatedContent) {
  const jsonMatch = accumulatedContent.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (jsonMatch) {
    return jsonMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\');
  }
  return null;
}

/**
 * Test the message extraction logic
 */
function testMessageExtraction(testName, content, hasStructuredQuestions) {
  console.log(`\n🧪 Test: ${testName}`);
  console.log('─'.repeat(60));

  // Step 1: Clean the content (simulates existing logic)
  let cleanedContent = cleanMessageContent(content);
  console.log(`Step 1 - cleanMessageContent(): "${cleanedContent}"`);

  // Step 2: Apply the fix if content is empty but has structured questions
  if (!cleanedContent && hasStructuredQuestions) {
    console.log('Step 2 - Content empty but has structured questions, trying extraction...');
    cleanedContent = extractMessageFromJson(content);
    console.log(`Step 2 - extractMessageFromJson(): "${cleanedContent}"`);
  }

  // Step 3: Determine if message will be added to chat
  const willAddMessage = cleanedContent || hasStructuredQuestions;
  const messageContent = cleanedContent || '';

  console.log(`\nResult:`);
  console.log(`  - Will add message to chat: ${willAddMessage ? '✅ YES' : '❌ NO'}`);
  console.log(`  - Message content: "${messageContent}"`);
  console.log(`  - Has structured questions: ${hasStructuredQuestions ? 'Yes' : 'No'}`);

  // Verify expectation
  if (hasStructuredQuestions && !messageContent) {
    console.log(`  ⚠️  WARNING: Structured questions without message text!`);
    return false;
  }

  return true;
}

// Run tests
console.log('🚀 Testing Structured Questions Message Extraction Fix\n');
console.log('This test verifies that AI message text is preserved when');
console.log('structured questions are present in the response.\n');

const results = [];

// Test Case 1: Structured questions with message (main fix case)
results.push(
  testMessageExtraction(
    'Structured Questions (Naked JSON)',
    mockStreamResponses.withStructuredQuestions,
    true
  )
);

// Test Case 2: Regular message (should work as before)
results.push(
  testMessageExtraction(
    'Regular Message (No Questions)',
    mockStreamResponses.regularMessage,
    false
  )
);

// Test Case 3: Fenced JSON with structured questions
results.push(
  testMessageExtraction(
    'Structured Questions (Fenced JSON)',
    mockStreamResponses.fencedJsonMessage,
    true
  )
);

// Summary
console.log('\n' + '='.repeat(60));
const passed = results.filter(r => r).length;
const total = results.length;
console.log(`\n📊 Test Results: ${passed}/${total} passed`);

if (passed === total) {
  console.log('✅ All tests passed! Message text will be preserved.');
} else {
  console.log('❌ Some tests failed. Check the output above.');
  process.exit(1);
}

console.log('\n💡 Expected Behavior:');
console.log('   - AI message text appears in chat bubble');
console.log('   - Structured question buttons appear below');
console.log('   - Both are visible for full context\n');

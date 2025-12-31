/**
 * Test script to verify JSON cleaning in chat messages
 * Run with: node test-json-cleaning.mjs
 */

/**
 * Clean message content by removing JSON blocks and extracting just the message
 */
function cleanMessageContent(content) {
  if (!content) return '';

  let cleaned = content;

  // Step 1: Remove all fenced JSON blocks (```json ... ```)
  cleaned = cleaned.replace(/```json\s*[\s\S]*?```/g, '');

  // Step 2: Try to extract message from naked JSON object with "message" field
  const jsonObjectMatch = cleaned.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,[\s\S]*)?\}/);
  if (jsonObjectMatch) {
    try {
      // Try to parse the full JSON object
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed.message) {
        cleaned = cleaned.replace(jsonObjectMatch[0], parsed.message);
      }
    } catch (e) {
      // If parsing fails, try to extract just the message field value
      const messageValue = jsonObjectMatch[1];
      if (messageValue) {
        // Unescape JSON string escapes
        const unescaped = messageValue.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        cleaned = cleaned.replace(jsonObjectMatch[0], unescaped);
      }
    }
  }

  // Step 3: Remove any remaining JSON-like structures
  cleaned = cleaned.replace(/\{\s*"(?:message|structuredQuestions|type|id)"[\s\S]*?\}/g, '');

  // Step 4: Truncate at the start of any JSON block that wasn't fully removed
  const jsonMarkers = [
    cleaned.indexOf('```json'),
    cleaned.indexOf('\n{'),
    cleaned.indexOf(' {'),
  ].filter(idx => idx >= 0);

  if (jsonMarkers.length > 0) {
    const firstMarker = Math.min(...jsonMarkers);
    if (firstMarker > 0) {
      cleaned = cleaned.substring(0, firstMarker);
    } else if (firstMarker === 0) {
      const lines = cleaned.split('\n');
      const nonJsonLines = lines.filter(line =>
        !line.trim().startsWith('{') &&
        !line.trim().startsWith('```') &&
        line.trim().length > 0
      );
      if (nonJsonLines.length > 0) {
        cleaned = nonJsonLines.join('\n');
      }
    }
  }

  // Step 5: Clean up whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

// Test cases
const tests = [
  {
    name: 'Fenced JSON block with message',
    input: `Here is your response:
\`\`\`json
{
  "message": "I found some great options for you!",
  "structuredQuestions": [
    { "id": "1", "question": "Which do you prefer?" }
  ]
}
\`\`\``,
    expected: 'Here is your response:',
  },
  {
    name: 'Naked JSON object with message',
    input: `{"message": "Your itinerary has been updated!", "structuredQuestions": []}`,
    expected: 'Your itinerary has been updated!',
  },
  {
    name: 'Plain text (no JSON)',
    input: 'This is a normal message without any JSON.',
    expected: 'This is a normal message without any JSON.',
  },
  {
    name: 'Text followed by JSON block',
    input: `Let me help you with that.

\`\`\`json
{"message": "Done!"}
\`\`\``,
    expected: 'Let me help you with that.',
  },
  {
    name: 'Partial JSON during streaming',
    input: 'Here are your options {',
    expected: 'Here are your options',
  },
  {
    name: 'Multiple JSON blocks',
    input: `\`\`\`json
{"message": "First"}
\`\`\`
Some text
\`\`\`json
{"message": "Second"}
\`\`\``,
    expected: 'Some text',
  },
  {
    name: 'JSON with escaped quotes in message',
    input: `{"message": "She said \\"hello\\" to me"}`,
    expected: 'She said "hello" to me',
  },
  {
    name: 'Empty JSON block',
    input: `\`\`\`json
\`\`\`
Some text after`,
    expected: 'Some text after',
  },
];

console.log('🧪 Testing JSON Cleaning Function\n');

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
  const result = cleanMessageContent(test.input);
  const success = result === test.expected;

  if (success) {
    passed++;
    console.log(`✅ Test ${idx + 1}: ${test.name}`);
  } else {
    failed++;
    console.log(`❌ Test ${idx + 1}: ${test.name}`);
    console.log(`   Input:    ${JSON.stringify(test.input)}`);
    console.log(`   Expected: ${JSON.stringify(test.expected)}`);
    console.log(`   Got:      ${JSON.stringify(result)}`);
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✨ All tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed');
  process.exit(1);
}

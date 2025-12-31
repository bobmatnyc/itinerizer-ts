/**
 * Additional edge case tests for JSON cleaning
 */

function cleanMessageContent(content) {
  if (!content) return '';

  let cleaned = content;

  // Step 1: Remove all fenced JSON blocks
  cleaned = cleaned.replace(/```json\s*[\s\S]*?```/g, '');

  // Step 2: Extract message from naked JSON
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

  // Step 3: Remove remaining JSON structures
  cleaned = cleaned.replace(/\{\s*"(?:message|structuredQuestions|type|id)"[\s\S]*?\}/g, '');

  // Step 4: Truncate at JSON markers
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

const edgeCases = [
  {
    name: 'Real-world Trip Designer response',
    input: `I'll help you plan your trip to Tokyo!

{"message": "What dates are you thinking of traveling?", "structuredQuestions": [{"id": "q1", "type": "date_range", "question": "When do you want to travel?"}]}`,
    expected: `I'll help you plan your trip to Tokyo!\n\nWhat dates are you thinking of traveling?`,
  },
  {
    name: 'Streaming with partial message field',
    input: 'Let me search for flights {"mes',
    expected: 'Let me search for flights',
  },
  {
    name: 'Message with newlines',
    input: '{"message": "Here are your options:\\n1. Option A\\n2. Option B"}',
    expected: 'Here are your options:\n1. Option A\n2. Option B',
  },
  {
    name: 'JSON in middle of text',
    input: 'Start {"message": "middle"} end',
    expected: 'Start middle end',
  },
  {
    name: 'Empty message field',
    input: '{"message": ""}',
    expected: '',
  },
  {
    name: 'Nested JSON',
    input: '{"message": "Test", "data": {"nested": "value"}}',
    expected: 'Test',
  },
  {
    name: 'Unicode characters',
    input: '{"message": "Hello 世界 🌍"}',
    expected: 'Hello 世界 🌍',
  },
  {
    name: 'Message with colon',
    input: '{"message": "Time: 3:00 PM"}',
    expected: 'Time: 3:00 PM',
  },
];

console.log('🧪 Testing Edge Cases\n');

let passed = 0;
let failed = 0;

edgeCases.forEach((test, idx) => {
  const result = cleanMessageContent(test.input);
  const success = result === test.expected;

  if (success) {
    passed++;
    console.log(`✅ ${test.name}`);
  } else {
    failed++;
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: ${JSON.stringify(test.expected)}`);
    console.log(`   Got:      ${JSON.stringify(result)}`);
  }
});

console.log(`\n📊 Results: ${passed}/${edgeCases.length} passed`);
process.exit(failed === 0 ? 0 : 1);

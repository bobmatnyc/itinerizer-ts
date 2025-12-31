/**
 * Test script to demonstrate the JSON buffering logic
 * Run: node test-json-buffering.js
 */

function isStartingJsonBlock(content) {
  const trimmed = content.trim();
  return trimmed.startsWith('```json') ||
         trimmed.startsWith('{') ||
         trimmed.startsWith('{\n') ||
         trimmed.startsWith('{ ');
}

function hasCompleteJsonBlock(content) {
  const trimmed = content.trim();

  if (trimmed.startsWith('```json')) {
    return trimmed.includes('```\n') || trimmed.endsWith('```');
  }

  if (trimmed.startsWith('{')) {
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    return openBraces > 0 && openBraces === closeBraces;
  }

  return false;
}

function cleanMessageContent(content) {
  if (!content) return '';
  let cleaned = content;

  // Remove fenced JSON blocks
  cleaned = cleaned.replace(/```json\s*[\s\S]*?```/g, '');

  // Extract message from JSON object
  const jsonMatch = cleaned.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,[\s\S]*)?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.message) {
        cleaned = cleaned.replace(jsonMatch[0], parsed.message);
      }
    } catch (e) {
      // Fallback: extract just the message value
      const messageValue = jsonMatch[1];
      if (messageValue) {
        const unescaped = messageValue.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        cleaned = cleaned.replace(jsonMatch[0], unescaped);
      }
    }
  }

  return cleaned.trim();
}

function getStreamingDisplayContent(accumulatedContent) {
  const trimmed = accumulatedContent.trim();

  if (isStartingJsonBlock(trimmed)) {
    if (hasCompleteJsonBlock(trimmed)) {
      return cleanMessageContent(accumulatedContent);
    }
    return ''; // Don't display incomplete JSON
  }

  return cleanMessageContent(accumulatedContent);
}

// Test cases
console.log('=== JSON Streaming Buffer Test ===\n');

// Simulate streaming chunks of a JSON response
const chunks = [
  '{',
  '{"message": "He',
  '{"message": "Hello world", "structure',
  '{"message": "Hello world", "structuredQuestions": [{"id": "1", "question": "test"}]}'
];

console.log('Test 1: JSON response being streamed');
console.log('--------------------------------------');
chunks.forEach((chunk, i) => {
  const display = getStreamingDisplayContent(chunk);
  console.log(`Chunk ${i + 1}: "${chunk}"`);
  console.log(`Display: "${display}"`);
  console.log(`isStarting: ${isStartingJsonBlock(chunk)}, isComplete: ${hasCompleteJsonBlock(chunk)}`);
  console.log();
});

// Test with regular text
const textChunks = [
  'Hello',
  'Hello world',
  'Hello world, how are you?'
];

console.log('\nTest 2: Regular text being streamed');
console.log('------------------------------------');
textChunks.forEach((chunk, i) => {
  const display = getStreamingDisplayContent(chunk);
  console.log(`Chunk ${i + 1}: "${chunk}"`);
  console.log(`Display: "${display}"`);
  console.log();
});

// Test with fenced JSON
const fencedChunks = [
  '```json',
  '```json\n{"message": "Test"}',
  '```json\n{"message": "Test"}\n```'
];

console.log('\nTest 3: Fenced JSON being streamed');
console.log('-----------------------------------');
fencedChunks.forEach((chunk, i) => {
  const display = getStreamingDisplayContent(chunk);
  console.log(`Chunk ${i + 1}: "${chunk}"`);
  console.log(`Display: "${display}"`);
  console.log(`isStarting: ${isStartingJsonBlock(chunk)}, isComplete: ${hasCompleteJsonBlock(chunk)}`);
  console.log();
});

console.log('\n=== Expected Behavior ===');
console.log('✓ JSON chunks should show empty string until complete');
console.log('✓ Regular text chunks should display immediately');
console.log('✓ Complete JSON should show cleaned message');
console.log('✓ Fenced JSON should behave like naked JSON');

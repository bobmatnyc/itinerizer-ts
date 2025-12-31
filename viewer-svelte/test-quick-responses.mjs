#!/usr/bin/env node

/**
 * Test script for quick response pattern matching
 * Run: node test-quick-responses.mjs
 */

// Inline simplified version of the pattern matching logic
const QUESTION_PATTERNS = [
  {
    pattern: /would you like (me to )?(elaborate|help|book|add|suggest|find|show|provide|tell|explain|include)/i,
    responses: [
      { id: 'yes-elaborate', text: 'Yes, please', category: 'affirmative' },
      { id: 'no-thanks', text: 'No thanks', category: 'negative' },
    ],
  },
  {
    pattern: /is there anything (else|more|additional)/i,
    responses: [
      { id: 'yes-more', text: 'Yes, add more', category: 'affirmative' },
      { id: 'satisfied', text: "I'm satisfied", category: 'negative' },
    ],
  },
  {
    pattern: /would you like (more )?(details|information|info|specifics)/i,
    responses: [
      { id: 'yes-details', text: 'Yes, more details', category: 'affirmative' },
      { id: 'no-good', text: "I'm good", category: 'negative' },
    ],
  },
  {
    pattern: /should I (add|include|book|suggest|remove|move)/i,
    responses: [
      { id: 'yes-do', text: 'Yes, please do', category: 'affirmative' },
      { id: 'no-skip', text: 'No, skip that', category: 'negative' },
    ],
  },
];

const DEFAULT_RESPONSES = [
  { id: 'yes-generic', text: 'Yes, please', category: 'affirmative' },
  { id: 'no-generic', text: 'No thanks', category: 'negative' },
  { id: 'tell-more', text: 'Tell me more', category: 'clarification' },
];

function extractActionResponses(message) {
  const responses = [];

  const elaborateMatch = message.match(/elaborate on (any of )?(these |the )?([\w\s]+?)(?:\s+or\s+|\?|\.)/i);
  if (elaborateMatch && elaborateMatch[3]) {
    const topic = elaborateMatch[3].trim();
    responses.push({
      id: `elaborate-${topic.replace(/\s+/g, '-')}`,
      text: `Elaborate on ${topic}`,
      category: 'action',
    });
  }

  const bookMatch = message.match(/help you book (any of )?(these |the )?([\w\s]+?)(?:\s+or\s+|\?|\.)/i);
  if (bookMatch && bookMatch[3]) {
    const thing = bookMatch[3].trim();
    responses.push({
      id: `book-${thing.replace(/\s+/g, '-')}`,
      text: `Help book ${thing}`,
      category: 'action',
    });
  }

  return responses;
}

function generateQuickResponses(message) {
  if (!message.trim().endsWith('?')) {
    return null;
  }

  const sentences = message.split(/[.!]\s+/);
  const lastSentence = sentences[sentences.length - 1] || message;

  for (const { pattern, responses } of QUESTION_PATTERNS) {
    if (pattern.test(lastSentence)) {
      const actionResponses = extractActionResponses(lastSentence);
      return [...actionResponses, ...responses];
    }
  }

  return DEFAULT_RESPONSES;
}

// Test cases
const testMessages = [
  {
    name: 'Elaborate on suggestions',
    message: "Since you mentioned having flights and accommodations already, these activities should complement your existing plans. Would you like me to elaborate on any of these suggestions or help you book any specific experiences?",
  },
  {
    name: 'Anything else',
    message: "I've added these activities to your itinerary. Is there anything else you'd like me to add?",
  },
  {
    name: 'More details',
    message: "Here's a walking tour of the old town. Would you like more details about the route?",
  },
  {
    name: 'Should I add',
    message: "I found a great restaurant nearby. Should I add it to your schedule?",
  },
  {
    name: 'Not a question',
    message: "I've updated your itinerary with the new hotel.",
  },
  {
    name: 'Generic question',
    message: "Which city would you like to visit next?",
  },
];

console.log('🧪 Testing Quick Response Pattern Matching\n');
console.log('='.repeat(80));

for (const test of testMessages) {
  console.log(`\n📝 Test: ${test.name}`);
  console.log(`Message: "${test.message.substring(0, 80)}${test.message.length > 80 ? '...' : ''}"`);

  const responses = generateQuickResponses(test.message);

  if (responses) {
    console.log('✅ Quick Responses Generated:');
    responses.forEach((r, i) => {
      console.log(`   ${i + 1}. [${r.category}] "${r.text}"`);
    });
  } else {
    console.log('❌ No quick responses (not a question or no pattern match)');
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ All tests completed!\n');

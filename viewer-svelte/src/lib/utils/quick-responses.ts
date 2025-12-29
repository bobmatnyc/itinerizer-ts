/**
 * Quick response generator for Trip Designer follow-up questions
 * Parses AI messages to generate clickable response options
 */

export interface QuickResponse {
  id: string;
  text: string;
  category?: 'affirmative' | 'negative' | 'clarification' | 'action';
}

/**
 * Pattern definitions for common AI question types
 */
const QUESTION_PATTERNS = [
  {
    // "Would you like me to elaborate/help/book..."
    pattern: /would you like (me to )?(elaborate|help|book|add|suggest|find|show|provide|tell|explain|include)/i,
    responses: [
      { id: 'yes-elaborate', text: 'Yes, please', category: 'affirmative' as const },
      { id: 'no-thanks', text: 'No thanks', category: 'negative' as const },
    ],
  },
  {
    // "Is there anything else..."
    pattern: /is there anything (else|more|additional)/i,
    responses: [
      { id: 'yes-more', text: 'Yes, add more', category: 'affirmative' as const },
      { id: 'satisfied', text: "I'm satisfied", category: 'negative' as const },
    ],
  },
  {
    // "Would you like more details/information..."
    pattern: /would you like (more )?(details|information|info|specifics)/i,
    responses: [
      { id: 'yes-details', text: 'Yes, more details', category: 'affirmative' as const },
      { id: 'no-good', text: "I'm good", category: 'negative' as const },
    ],
  },
  {
    // "Should I..." questions
    pattern: /should I (add|include|book|suggest|remove|move)/i,
    responses: [
      { id: 'yes-do', text: 'Yes, please do', category: 'affirmative' as const },
      { id: 'no-skip', text: 'No, skip that', category: 'negative' as const },
    ],
  },
  {
    // "Do you want..." questions
    pattern: /do you (want|need) (me to )?/i,
    responses: [
      { id: 'yes-want', text: 'Yes', category: 'affirmative' as const },
      { id: 'no-want', text: 'No', category: 'negative' as const },
    ],
  },
  {
    // "Can I help..." questions
    pattern: /can I help (you )?(with|book|find|add)/i,
    responses: [
      { id: 'yes-help', text: 'Yes, help me', category: 'affirmative' as const },
      { id: 'no-help', text: 'No, just planning', category: 'negative' as const },
    ],
  },
  {
    // "What would you like..." - extract specific actions
    pattern: /what would you like (me to )?(do|help with|add|change)/i,
    responses: [
      { id: 'tell-more', text: 'Tell me more', category: 'clarification' as const },
      { id: 'something-else', text: 'Something else', category: 'clarification' as const },
    ],
  },
] as const;

/**
 * Default fallback responses when no specific pattern matches
 */
const DEFAULT_RESPONSES: QuickResponse[] = [
  { id: 'yes-generic', text: 'Yes, please', category: 'affirmative' },
  { id: 'no-generic', text: 'No thanks', category: 'negative' },
  { id: 'tell-more', text: 'Tell me more', category: 'clarification' },
];

/**
 * Extract action-specific quick responses from message content
 * e.g., "elaborate on X" or "help you book Y"
 */
function extractActionResponses(message: string): QuickResponse[] {
  const responses: QuickResponse[] = [];

  // Extract "elaborate on [topic]"
  const elaborateMatch = message.match(/elaborate on (any of )?(these |the )?([\w\s]+?)(?:\s+or\s+|\?|\.)/i);
  if (elaborateMatch && elaborateMatch[3]) {
    const topic = elaborateMatch[3].trim();
    responses.push({
      id: `elaborate-${topic.replace(/\s+/g, '-')}`,
      text: `Elaborate on ${topic}`,
      category: 'action',
    });
  }

  // Extract "help you book [thing]"
  const bookMatch = message.match(/help you book (any of )?(these |the )?([\w\s]+?)(?:\s+or\s+|\?|\.)/i);
  if (bookMatch && bookMatch[3]) {
    const thing = bookMatch[3].trim();
    responses.push({
      id: `book-${thing.replace(/\s+/g, '-')}`,
      text: `Help book ${thing}`,
      category: 'action',
    });
  }

  // Extract "add [thing]"
  const addMatch = message.match(/add (any of )?(these |the )?([\w\s]+?)(?:\s+or\s+|\?|\.)/i);
  if (addMatch && addMatch[3]) {
    const thing = addMatch[3].trim();
    responses.push({
      id: `add-${thing.replace(/\s+/g, '-')}`,
      text: `Add ${thing}`,
      category: 'action',
    });
  }

  return responses;
}

/**
 * Generate quick response options for an AI message
 * Returns null if message doesn't end with a question
 */
export function generateQuickResponses(message: string): QuickResponse[] | null {
  // Only generate responses for messages ending with a question mark
  if (!message.trim().endsWith('?')) {
    return null;
  }

  // Get the last sentence (the question)
  const sentences = message.split(/[.!]\s+/);
  const lastSentence = sentences[sentences.length - 1] || message;

  // Try to match against known patterns
  for (const { pattern, responses } of QUESTION_PATTERNS) {
    if (pattern.test(lastSentence)) {
      // Extract action-specific responses
      const actionResponses = extractActionResponses(lastSentence);

      // Combine pattern responses with action-specific ones
      return [...actionResponses, ...responses];
    }
  }

  // If ends with "?" but no pattern matched, return default responses
  return DEFAULT_RESPONSES;
}

/**
 * Check if quick responses should be shown
 * (only for AI messages ending with questions)
 */
export function shouldShowQuickResponses(
  message: string,
  hasStructuredQuestions: boolean
): boolean {
  // Don't show if there are already structured questions
  if (hasStructuredQuestions) {
    return false;
  }

  // Show only if message ends with a question
  return message.trim().endsWith('?');
}

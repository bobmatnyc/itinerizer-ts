/**
 * Promptfoo prompt function that properly constructs chat messages
 * with system prompt from file
 */

const fs = require('fs');
const path = require('path');

// Load system prompt at module initialization
const systemPromptPath = path.join(__dirname, '../src/prompts/trip-designer/system.md');
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

/**
 * Generate chat messages for Trip Designer evaluation
 * @param {Object} context - The context object containing variables
 * @returns {Array} Chat messages array with system and user messages
 */
function generatePrompt(context) {
  const { vars } = context;

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add context if provided (for follow-up scenarios)
  if (vars.context) {
    messages.push({ role: 'user', content: vars.context });
  }

  // Add main user message
  messages.push({ role: 'user', content: vars.user_message });

  return messages;
}

module.exports = generatePrompt;

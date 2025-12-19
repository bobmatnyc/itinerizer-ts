/**
 * Prompt loader utility for agent prompts
 * Loads prompts from external markdown files organized by agent ID
 * @module prompts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load a prompt from markdown file
 * @param agentId - The agent identifier (subdirectory name)
 * @param promptName - The prompt file name (without .md extension)
 * @returns The prompt content as a string
 * @throws Error if prompt file not found
 */
export function loadPrompt(agentId: string, promptName: string): string {
  const promptPath = join(__dirname, agentId, `${promptName}.md`);
  try {
    return readFileSync(promptPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to load prompt: ${agentId}/${promptName}.md - ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Pre-loaded prompts for Trip Designer Agent
 * Uses lazy evaluation (function) to load prompts on first access
 */
export const PROMPTS = {
  tripDesigner: {
    /**
     * Main system prompt for Trip Designer Agent
     * Defines personality, rules, capabilities, and conversation flow
     */
    system: () => loadPrompt('trip-designer', 'system'),

    /**
     * Context compaction prompt
     * Used when conversation history needs to be condensed to save tokens
     */
    compaction: () => loadPrompt('trip-designer', 'compaction'),

    /**
     * Profile extraction prompt
     * Extracts structured trip profile from conversation history
     */
    profileExtraction: () => loadPrompt('trip-designer', 'profile-extraction'),
  },
};

/**
 * Direct access to Trip Designer prompts (backwards compatibility)
 * These are the constants previously exported from services/trip-designer/prompts.ts
 */
export const TRIP_DESIGNER_SYSTEM_PROMPT = PROMPTS.tripDesigner.system();
export const COMPACTION_SYSTEM_PROMPT = PROMPTS.tripDesigner.compaction();
export const PROFILE_EXTRACTION_PROMPT = PROMPTS.tripDesigner.profileExtraction();

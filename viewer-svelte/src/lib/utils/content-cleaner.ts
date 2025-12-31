/**
 * Utilities for cleaning and processing message content from chat streams
 * Handles JSON block extraction, markdown formatting, and content sanitization
 */

/**
 * Check if content appears to be starting a JSON block
 * Returns true if we should buffer instead of displaying
 */
export function isStartingJsonBlock(content: string): boolean {
  const trimmed = content.trim();
  // Detect start of fenced JSON block or naked JSON object
  return trimmed.startsWith('```json') ||
         trimmed.startsWith('{') ||
         trimmed.startsWith('{\n') ||
         trimmed.startsWith('{ ');
}

/**
 * Check if content has a complete JSON block that can be cleaned
 * Returns true if JSON block is complete and ready for cleaning
 */
export function hasCompleteJsonBlock(content: string): boolean {
  const trimmed = content.trim();

  // Check for complete fenced JSON block
  if (trimmed.startsWith('```json')) {
    return trimmed.includes('```\n') || trimmed.endsWith('```');
  }

  // Check for complete naked JSON object
  if (trimmed.startsWith('{')) {
    // Simple heuristic: count braces
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    return openBraces > 0 && openBraces === closeBraces;
  }

  return false;
}

/**
 * Get displayable content during streaming, hiding incomplete JSON blocks
 */
export function getStreamingDisplayContent(accumulatedContent: string): string {
  const trimmed = accumulatedContent.trim();

  // If content starts with JSON markers, don't display until complete
  if (isStartingJsonBlock(trimmed)) {
    // Only display if the JSON block is complete
    if (hasCompleteJsonBlock(trimmed)) {
      return cleanMessageContent(accumulatedContent);
    }
    // JSON block incomplete - don't display anything yet
    return '';
  }

  // Content doesn't start with JSON - clean and display
  return cleanMessageContent(accumulatedContent);
}

/**
 * Clean message content by removing JSON blocks and extracting just the message
 */
export function cleanMessageContent(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // Step 1: Remove all fenced JSON blocks and extract message if present
  const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/);
  if (fencedMatch) {
    try {
      const parsed = JSON.parse(fencedMatch[1]);
      if (parsed.message) {
        // Return ONLY the message from JSON, ignore any text before/after
        return parsed.message.trim();
      }
    } catch (e) {
      // Failed to parse, continue with other cleaning
    }
    // Remove the fenced block even if we couldn't extract message
    cleaned = cleaned.replace(/```json\s*[\s\S]*?```/g, '');
  }

  // Step 2: Try to extract message from naked JSON object with "message" field
  // Match JSON objects that contain a "message" property
  const jsonObjectMatch = cleaned.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,[\s\S]*)?\}/);
  if (jsonObjectMatch) {
    try {
      // Try to parse the full JSON object
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed.message) {
        // Return ONLY the message from JSON, ignore any text before/after
        return parsed.message.trim();
      }
    } catch (e) {
      // If parsing fails, try to extract just the message field value
      const messageValue = jsonObjectMatch[1];
      if (messageValue) {
        // Unescape JSON string escapes and return ONLY this message
        const unescaped = messageValue.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        return unescaped.trim();
      }
    }
  }

  // Step 3: Remove any remaining JSON-like structures
  cleaned = cleaned.replace(/\{\s*"(?:message|structuredQuestions|type|id)"[\s\S]*?\}/g, '');

  // Step 4: Truncate at the start of any JSON block
  const jsonMarkers = [
    cleaned.indexOf('```json'),
    cleaned.indexOf('\n{'),
    cleaned.indexOf(' {'),
  ].filter(idx => idx >= 0);

  if (jsonMarkers.length > 0) {
    const firstMarker = Math.min(...jsonMarkers);
    if (firstMarker > 0) {
      cleaned = cleaned.substring(0, firstMarker);
    }
  }

  // Step 5: Clean up whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

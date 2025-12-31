/**
 * Format compliance metrics for evaluating LLM responses
 * Updated to match Trip Designer JSON format with structuredQuestions array
 */

interface TripDesignerResponse {
  message?: string;
  structuredQuestions?: Array<{
    id: string;
    type: string;
    question: string;
    options?: unknown[];
  }>;
}

/**
 * Evaluate if response contains valid JSON when expected
 * @param response - LLM response text
 * @returns 1.0 if JSON is valid, 0.0 if invalid, 0.5 if no JSON expected
 */
export function evaluateJsonCompliance(response: string): number {
  // Extract JSON blocks (looking for ```json or bare JSON objects)
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  const bareJsonRegex = /^(\{[\s\S]*\})$/m;

  const jsonBlocks = Array.from(response.matchAll(jsonBlockRegex));
  const bareJson = response.match(bareJsonRegex);

  // If no JSON found, assume it's not required
  if (jsonBlocks.length === 0 && !bareJson) {
    return 0.5;
  }

  // Try to parse all JSON blocks
  let validCount = 0;
  let totalCount = 0;

  for (const match of jsonBlocks) {
    totalCount++;
    try {
      JSON.parse(match[1]);
      validCount++;
    } catch {
      // Invalid JSON
    }
  }

  if (bareJson) {
    totalCount++;
    try {
      JSON.parse(bareJson[1]);
      validCount++;
    } catch {
      // Invalid JSON
    }
  }

  return totalCount > 0 ? validCount / totalCount : 0.5;
}

/**
 * Parse Trip Designer JSON response
 */
function parseTripDesignerResponse(
  response: string
): TripDesignerResponse | null {
  // Extract JSON from ```json code fence
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed as TripDesignerResponse;
  } catch {
    return null;
  }
}

/**
 * Evaluate ONE question rule compliance
 * @param response - LLM response text
 * @returns 1.0 if exactly one question OR no questions (valid), 0.0 if multiple
 */
export function evaluateOneQuestionRule(response: string): number {
  const parsed = parseTripDesignerResponse(response);

  if (!parsed) {
    // No valid JSON found - neutral score
    return 0.5;
  }

  const questionCount = parsed.structuredQuestions?.length ?? 0;

  // No questions is valid (agent providing info, not asking)
  if (questionCount === 0) {
    return 1.0;
  }

  // Exactly one question is perfect
  if (questionCount === 1) {
    return 1.0;
  }

  // Multiple questions is violation
  return 0.0;
}

/**
 * Get question count details
 */
export function getQuestionCount(response: string): {
  total: number;
  hasMessage: boolean;
  hasStructuredQuestions: boolean;
} {
  const parsed = parseTripDesignerResponse(response);

  if (!parsed) {
    return {
      total: 0,
      hasMessage: false,
      hasStructuredQuestions: false,
    };
  }

  return {
    total: parsed.structuredQuestions?.length ?? 0,
    hasMessage: !!parsed.message,
    hasStructuredQuestions: !!parsed.structuredQuestions,
  };
}

/**
 * Evaluate markdown formatting quality
 * @param response - LLM response text
 * @returns 0-1 score based on markdown quality
 */
export function evaluateMarkdownQuality(response: string): number {
  let score = 1.0;

  // Check for proper heading hierarchy (# then ##, not jumping to ###)
  const headings = response.match(/^#{1,6}\s/gm) || [];
  if (headings.length > 0) {
    let prevLevel = 0;
    for (const heading of headings) {
      const level = heading.match(/^#{1,6}/)?.[0].length || 0;
      if (level - prevLevel > 1) {
        score -= 0.1; // Penalty for skipping levels
      }
      prevLevel = level;
    }
  }

  // Check for proper list formatting
  const hasLists = /^[\s]*[-*+]\s/m.test(response);
  const hasNumberedLists = /^[\s]*\d+\.\s/m.test(response);

  // Check for code blocks with language specified
  const codeBlocks = response.match(/```(\w+)?/g) || [];
  const codeBlocksWithLang = codeBlocks.filter((cb) =>
    cb.match(/```\w+/)
  ).length;
  if (codeBlocks.length > 0) {
    score *= codeBlocksWithLang / codeBlocks.length;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Evaluate message length (should be short, under 250 chars)
 */
export function evaluateMessageLength(response: string): number {
  const parsed = parseTripDesignerResponse(response);

  if (!parsed || !parsed.message) {
    return 0.5; // No message field
  }

  const messageLength = parsed.message.length;

  // Perfect: under 200 chars
  if (messageLength < 200) {
    return 1.0;
  }

  // Good: under 250 chars
  if (messageLength < 250) {
    return 0.8;
  }

  // Acceptable: under 300 chars
  if (messageLength < 300) {
    return 0.6;
  }

  // Too long: 300+ chars
  return 0.3;
}

/**
 * Check if response has required fields (message and structuredQuestions)
 */
export function evaluateRequiredFields(response: string): number {
  const parsed = parseTripDesignerResponse(response);

  if (!parsed) {
    return 0.0; // No valid JSON
  }

  const hasMessage = 'message' in parsed;
  const hasStructuredQuestions = 'structuredQuestions' in parsed;

  if (hasMessage && hasStructuredQuestions) {
    return 1.0; // Perfect
  }

  if (hasMessage || hasStructuredQuestions) {
    return 0.5; // Partial
  }

  return 0.0; // Neither field
}

/**
 * Comprehensive format compliance check
 */
export function evaluateFormatCompliance(response: string): {
  jsonCompliance: number;
  oneQuestionCompliance: number;
  markdownQuality: number;
  messageLengthCompliance: number;
  requiredFieldsCompliance: number;
  overall: number;
  details: {
    hasValidJson: boolean;
    questionCount: number;
    hasMessage: boolean;
    hasStructuredQuestions: boolean;
  };
} {
  const jsonCompliance = evaluateJsonCompliance(response);
  const oneQuestionCompliance = evaluateOneQuestionRule(response);
  const markdownQuality = evaluateMarkdownQuality(response);
  const messageLengthCompliance = evaluateMessageLength(response);
  const requiredFieldsCompliance = evaluateRequiredFields(response);
  const questionInfo = getQuestionCount(response);

  // Overall score: weighted average
  // JSON compliance: 20%
  // Required fields: 20%
  // One question rule: 30%
  // Message length: 20%
  // Markdown: 10%
  const overall =
    jsonCompliance * 0.2 +
    requiredFieldsCompliance * 0.2 +
    oneQuestionCompliance * 0.3 +
    messageLengthCompliance * 0.2 +
    markdownQuality * 0.1;

  return {
    jsonCompliance,
    oneQuestionCompliance,
    markdownQuality,
    messageLengthCompliance,
    requiredFieldsCompliance,
    overall,
    details: {
      hasValidJson: jsonCompliance >= 0.5,
      questionCount: questionInfo.total,
      hasMessage: questionInfo.hasMessage,
      hasStructuredQuestions: questionInfo.hasStructuredQuestions,
    },
  };
}

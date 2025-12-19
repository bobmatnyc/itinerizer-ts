import { writable } from 'svelte/store';
import { apiClient } from '../api';
import type { ChatMessage, StructuredQuestion, AgentResponse, TokenUsage, CostData } from '../types';

// Chat session state
export const chatSessionId = writable<string | null>(null);
export const chatMessages = writable<ChatMessage[]>([]);
export const chatLoading = writable<boolean>(false);
export const chatError = writable<string | null>(null);
export const structuredQuestions = writable<StructuredQuestion[] | null>(null);

// Streaming state
export const streamingContent = writable<string>('');
export const isStreaming = writable<boolean>(false);
export const currentToolCall = writable<string | null>(null);
export const itineraryUpdated = writable<boolean>(false);

// Token and cost tracking
export const sessionTokens = writable<TokenUsage>({ input: 0, output: 0, total: 0 });
export const sessionCost = writable<CostData>({ input: 0, output: 0, total: 0 });

/**
 * Clean message content by removing JSON blocks and extracting just the message
 */
function cleanMessageContent(content: string): string {
  // Try to extract message from JSON block (code-fenced)
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1] || '{}');
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // Fall through
    }
    // Remove the JSON block from content
    return content.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
  }

  // Try naked JSON with structuredQuestions
  const nakedJsonMatch = content.match(/\{[\s\S]*"message"\s*:\s*"[\s\S]*?"[\s\S]*"structuredQuestions"\s*:\s*\[[\s\S]*?\]\s*\}/);
  if (nakedJsonMatch) {
    try {
      const parsed = JSON.parse(nakedJsonMatch[0]);
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // Fall through
    }
    // Remove naked JSON from content
    return content.replace(nakedJsonMatch[0], '').trim();
  }

  // Check if content starts with JSON-like pattern and truncate before it
  const jsonStartIndex = content.indexOf('```json');
  if (jsonStartIndex > 0) {
    return content.substring(0, jsonStartIndex).trim();
  }

  // Check for naked JSON starting
  const nakedStart = content.match(/\n\s*\{\s*\n?\s*"message"/);
  if (nakedStart && nakedStart.index !== undefined && nakedStart.index > 0) {
    return content.substring(0, nakedStart.index).trim();
  }

  return content;
}

/**
 * Create a new chat session for an itinerary
 */
export async function createChatSession(itineraryId: string): Promise<void> {
  chatLoading.set(true);
  chatError.set(null);

  try {
    const { sessionId } = await apiClient.createChatSession(itineraryId);
    chatSessionId.set(sessionId);
    chatMessages.set([]);
    structuredQuestions.set(null);
  } catch (error) {
    console.error('Failed to create chat session:', error);
    chatError.set(error instanceof Error ? error.message : 'Failed to create chat session');
    throw error;
  } finally {
    chatLoading.set(false);
  }
}

/**
 * Send a message to the chat session
 */
export async function sendMessage(message: string): Promise<AgentResponse | null> {
  let sessionId: string | null = null;
  chatSessionId.subscribe((id) => (sessionId = id))();

  if (!sessionId) {
    chatError.set('No active chat session');
    return null;
  }

  chatLoading.set(true);
  chatError.set(null);

  try {
    // Add user message immediately
    chatMessages.update((messages) => [
      ...messages,
      {
        role: 'user',
        content: message,
        timestamp: new Date(),
      },
    ]);

    // Send to API
    const response = await apiClient.sendChatMessage(sessionId, message);

    // Add assistant response
    chatMessages.update((messages) => [
      ...messages,
      {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      },
    ]);

    // Update structured questions if present
    structuredQuestions.set(response.structuredQuestions || null);

    return response;
  } catch (error) {
    console.error('Failed to send message:', error);
    chatError.set(error instanceof Error ? error.message : 'Failed to send message');
    return null;
  } finally {
    chatLoading.set(false);
  }
}

/**
 * Send a message with streaming support
 */
export async function sendMessageStreaming(message: string): Promise<void> {
  let sessionId: string | null = null;
  chatSessionId.subscribe((id) => (sessionId = id))();

  if (!sessionId) {
    chatError.set('No active chat session');
    return;
  }

  chatLoading.set(true);
  chatError.set(null);
  isStreaming.set(true);
  streamingContent.set('');
  currentToolCall.set(null);
  structuredQuestions.set(null);

  try {
    // Add user message immediately
    chatMessages.update((messages) => [
      ...messages,
      {
        role: 'user',
        content: message,
        timestamp: new Date(),
      },
    ]);

    let accumulatedContent = '';
    let didUpdateItinerary = false;

    // Iterate over stream events
    for await (const event of apiClient.sendChatMessageStream(sessionId, message)) {
      switch (event.type) {
        case 'connected':
          console.log('Stream connected:', event.sessionId);
          break;

        case 'text':
          accumulatedContent += event.content;
          // Clean content to remove JSON blocks while streaming
          streamingContent.set(cleanMessageContent(accumulatedContent));
          break;

        case 'tool_call':
          currentToolCall.set(event.name);
          break;

        case 'tool_result':
          currentToolCall.set(null);
          break;

        case 'structured_questions':
          structuredQuestions.set(event.questions);
          break;

        case 'done':
          // Finalize the assistant message with cleaned content
          const cleanedContent = cleanMessageContent(accumulatedContent);
          if (cleanedContent) {
            chatMessages.update((messages) => [
              ...messages,
              {
                role: 'assistant',
                content: cleanedContent,
                timestamp: new Date(),
              },
            ]);
          }

          didUpdateItinerary = event.itineraryUpdated;
          itineraryUpdated.set(event.itineraryUpdated);

          // Update token and cost tracking
          if (event.tokens) {
            sessionTokens.update((current) => ({
              input: current.input + event.tokens!.input,
              output: current.output + event.tokens!.output,
              total: current.total + event.tokens!.total,
            }));
          }

          if (event.cost) {
            sessionCost.update((current) => ({
              input: current.input + event.cost!.input,
              output: current.output + event.cost!.output,
              total: current.total + event.cost!.total,
            }));
          }

          // Clear streaming state
          isStreaming.set(false);
          streamingContent.set('');
          currentToolCall.set(null);
          break;

        case 'error':
          chatError.set(event.message);
          isStreaming.set(false);
          streamingContent.set('');
          currentToolCall.set(null);
          break;
      }
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    chatError.set(error instanceof Error ? error.message : 'Failed to send message');
    isStreaming.set(false);
    streamingContent.set('');
    currentToolCall.set(null);
  } finally {
    chatLoading.set(false);
  }
}

/**
 * Reset chat state
 */
export function resetChat(): void {
  chatSessionId.set(null);
  chatMessages.set([]);
  chatLoading.set(false);
  chatError.set(null);
  structuredQuestions.set(null);
  streamingContent.set('');
  isStreaming.set(false);
  currentToolCall.set(null);
  itineraryUpdated.set(false);
  sessionTokens.set({ input: 0, output: 0, total: 0 });
  sessionCost.set({ input: 0, output: 0, total: 0 });
}

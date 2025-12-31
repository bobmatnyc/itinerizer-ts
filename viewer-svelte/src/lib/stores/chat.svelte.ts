/**
 * Chat Store - Svelte 5 Runes
 *
 * Manages chat session state, message streaming, and LLM interactions
 * with SSR-safe operations and visualization integration.
 */

import { writable, get, type Writable } from 'svelte/store';
import { apiClient } from '../api';
import type { ChatMessage, StructuredQuestion, AgentResponse, TokenUsage, CostData } from '../types';
import { settingsStore } from './settings.svelte';
import { visualizationStore, extractVisualizationFromToolResult } from './visualization.svelte';
import { cleanMessageContent, getStreamingDisplayContent, isStartingJsonBlock, hasCompleteJsonBlock } from '$lib/utils/content-cleaner';
import { detectLocationsInText } from '$lib/utils/location-detector';

/**
 * Chat state using class-based pattern with Svelte stores
 */
class ChatStore {
  // Session state
  sessionId: Writable<string | null> = writable(null);
  messages: Writable<ChatMessage[]> = writable([]);

  // Loading/streaming state
  loading: Writable<boolean> = writable(false);
  error: Writable<string | null> = writable(null);
  isStreaming: Writable<boolean> = writable(false);
  isThinking: Writable<boolean> = writable(false);
  streamingContent: Writable<string> = writable('');
  currentToolCall: Writable<string | null> = writable(null);

  // UI state
  structuredQuestions: Writable<StructuredQuestion[] | null> = writable(null);
  itineraryUpdated: Writable<boolean> = writable(false);
  pendingPrompt: Writable<string | null> = writable(null);

  // Token tracking
  sessionTokens: Writable<TokenUsage> = writable({ input: 0, output: 0, total: 0 });
  sessionCost: Writable<CostData> = writable({ input: 0, output: 0, total: 0 });

  /**
   * Create a new chat session for an itinerary or help mode
   * @param itineraryId - Optional itinerary ID (required for trip-designer mode)
   * @param mode - Agent mode: 'trip-designer' or 'help'
   * @returns Session ID or null on error
   */
  async createSession(itineraryId?: string, mode: 'trip-designer' | 'help' = 'trip-designer'): Promise<string | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { sessionId } = await apiClient.createChatSession(itineraryId, mode);
      this.sessionId.set(sessionId);
      this.messages.set([]);
      this.structuredQuestions.set(null);
      return sessionId;
    } catch (error) {
      console.error('Failed to create chat session:', error);
      // Don't set error for "Session not found" - this is normal when no session exists yet
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chat session';
      if (!errorMessage.includes('Session not found')) {
        this.error.set(errorMessage);
      }
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Send a message to the chat session (non-streaming)
   */
  async sendMessage(message: string): Promise<AgentResponse | null> {
    const sessionId = get(this.sessionId);

    if (!sessionId) {
      this.error.set('No active chat session');
      return null;
    }

    // Check if API key is configured
    const apiKey = settingsStore.openRouterKey;
    if (!apiKey || apiKey.trim() === '') {
      this.error.set('No OpenRouter API key configured. Please add your API key in Profile settings.');
      return null;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Add user message immediately
      this.messages.update((messages) => [
        ...messages,
        {
          role: 'user',
          content: message,
          timestamp: new Date(),
        },
      ]);

      // Send to API
      const response = await apiClient.sendChatMessage(sessionId, message);

      // Add assistant response with cleaned content
      this.messages.update((messages) => [
        ...messages,
        {
          role: 'assistant',
          content: cleanMessageContent(response.message),
          timestamp: new Date(),
        },
      ]);

      // Update structured questions if present
      this.structuredQuestions.set(response.structuredQuestions || null);

      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to send message');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Send a message with streaming support
   */
  async sendMessageStreaming(message: string): Promise<void> {
    const sessionId = get(this.sessionId);

    if (!sessionId) {
      this.error.set('No active chat session');
      return;
    }

    // Check if API key is configured
    const apiKey = settingsStore.openRouterKey;
    if (!apiKey || apiKey.trim() === '') {
      this.error.set('No OpenRouter API key configured. Please add your API key in Profile settings.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.isThinking.set(true);
    this.isStreaming.set(false);
    this.streamingContent.set('');
    this.currentToolCall.set(null);
    // Don't clear structured questions yet - wait for stream to complete
    // They will be cleared only if the new response doesn't have questions

    try {
      // Add user message immediately
      this.messages.update((messages) => [
        ...messages,
        {
          role: 'user',
          content: message,
          timestamp: new Date(),
        },
      ]);

      let accumulatedContent = '';
      let didUpdateItinerary = false;
      let receivedStructuredQuestions = false;

      // Iterate over stream events
      for await (const event of apiClient.sendChatMessageStream(sessionId, message)) {
        switch (event.type) {
          case 'connected':
            console.log('Stream connected:', event.sessionId);
            // Clear thinking state when first response arrives
            this.isThinking.set(false);
            this.isStreaming.set(true);
            break;

          case 'text':
            // Ensure thinking is cleared and streaming is active
            this.isThinking.set(false);
            this.isStreaming.set(true);
            accumulatedContent += event.content;
            // Use smart display logic to hide incomplete JSON blocks
            this.streamingContent.set(getStreamingDisplayContent(accumulatedContent));
            break;

          case 'tool_call':
            this.currentToolCall.set(event.name);
            break;

          case 'tool_result':
            this.currentToolCall.set(null);

            // Extract and trigger visualizations from tool results
            try {
              const vizData = extractVisualizationFromToolResult(event.name, event.result);
              if (vizData) {
                visualizationStore.addVisualization(vizData.type, vizData.data, vizData.label);
              }
            } catch (vizError) {
              console.warn('Failed to extract visualization from tool result:', vizError);
            }
            break;

          case 'structured_questions':
            this.structuredQuestions.set(event.questions);
            receivedStructuredQuestions = true;
            break;

          case 'done':
            // Clear structured questions if we didn't receive new ones
            if (!receivedStructuredQuestions) {
              this.structuredQuestions.set(null);
            }

            // Finalize the assistant message with cleaned content
            let cleanedContent = cleanMessageContent(accumulatedContent);

            // If content is empty but we have structured questions, extract message from JSON
            if (!cleanedContent && receivedStructuredQuestions && accumulatedContent) {
              // Try to extract message field from JSON
              const jsonMatch = accumulatedContent.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              if (jsonMatch) {
                // Unescape JSON string
                cleanedContent = jsonMatch[1]
                  .replace(/\\"/g, '"')
                  .replace(/\\n/g, '\n')
                  .replace(/\\\\/g, '\\');
              } else {
                // Fall back to first structured question's text
                const currentQuestions = get(this.structuredQuestions);
                if (currentQuestions && currentQuestions.length > 0) {
                  cleanedContent = currentQuestions[0].question;
                }
              }
            }

            // CRITICAL: Clear streaming state BEFORE adding final message to prevent
            // visual overlap where both streaming bubble and final message render together
            this.isThinking.set(false);
            this.isStreaming.set(false);
            this.streamingContent.set('');
            this.currentToolCall.set(null);

            // Allow Svelte's reactivity to process the cleared streaming state
            // before adding the final message (prevents race condition causing ghost text)
            await new Promise(resolve => setTimeout(resolve, 0));

            // Always add assistant message if we have content OR structured questions
            if (cleanedContent || receivedStructuredQuestions) {
              const messageContent = cleanedContent || ''; // Use empty string if still no content
              this.messages.update((messages) => [
                ...messages,
                {
                  role: 'assistant',
                  content: messageContent,
                  timestamp: new Date(),
                },
              ]);
            }

            didUpdateItinerary = event.itineraryUpdated;
            this.itineraryUpdated.set(event.itineraryUpdated);

            // Update token and cost tracking
            if (event.tokens) {
              this.sessionTokens.update((current) => ({
                input: current.input + event.tokens!.input,
                output: current.output + event.tokens!.output,
                total: current.total + event.tokens!.total,
              }));
            }

            if (event.cost) {
              this.sessionCost.update((current) => ({
                input: current.input + event.cost!.input,
                output: current.output + event.cost!.output,
                total: current.total + event.cost!.total,
              }));
            }

            break;

          case 'error':
            this.error.set(event.message);
            this.isThinking.set(false);
            this.isStreaming.set(false);
            this.streamingContent.set('');
            this.currentToolCall.set(null);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to send message');
      this.isThinking.set(false);
      this.isStreaming.set(false);
      this.streamingContent.set('');
      this.currentToolCall.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Send a context message that won't be visible in the chat history.
   * Only the assistant's response will be added to the chat.
   * Used for sending initial context or system messages to the LLM.
   */
  async sendContextMessage(message: string): Promise<void> {
    const sessionId = get(this.sessionId);

    if (!sessionId) {
      this.error.set('No active chat session');
      return;
    }

    // Check if API key is configured
    const apiKey = settingsStore.openRouterKey;
    if (!apiKey || apiKey.trim() === '') {
      this.error.set('No OpenRouter API key configured. Please add your API key in Profile settings.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.isStreaming.set(true);
    this.streamingContent.set('');
    this.currentToolCall.set(null);
    // Don't clear structured questions yet - wait for stream to complete
    // They will be cleared only if the new response doesn't have questions

    try {
      // NOTE: Unlike sendMessageStreaming, we do NOT add the user message to messages
      // This keeps the context message hidden from the user

      let accumulatedContent = '';
      let receivedStructuredQuestions = false;

      // Iterate over stream events
      for await (const event of apiClient.sendChatMessageStream(sessionId, message)) {
        switch (event.type) {
          case 'connected':
            console.log('Stream connected (context):', event.sessionId);
            break;

          case 'text':
            accumulatedContent += event.content;
            // Use smart display logic to hide incomplete JSON blocks
            this.streamingContent.set(getStreamingDisplayContent(accumulatedContent));
            break;

          case 'tool_call':
            this.currentToolCall.set(event.name);
            break;

          case 'tool_result':
            this.currentToolCall.set(null);

            // Extract and trigger visualizations from tool results
            try {
              const vizData = extractVisualizationFromToolResult(event.name, event.result);
              if (vizData) {
                visualizationStore.addVisualization(vizData.type, vizData.data, vizData.label);
              }
            } catch (vizError) {
              console.warn('Failed to extract visualization from tool result:', vizError);
            }
            break;

          case 'structured_questions':
            this.structuredQuestions.set(event.questions);
            receivedStructuredQuestions = true;
            break;

          case 'done':
            // Clear structured questions if we didn't receive new ones
            if (!receivedStructuredQuestions) {
              this.structuredQuestions.set(null);
            }

            // Finalize the assistant message with cleaned content
            let cleanedContent = cleanMessageContent(accumulatedContent);

            // If content is empty but we have structured questions, extract message from JSON
            if (!cleanedContent && receivedStructuredQuestions && accumulatedContent) {
              // Try to extract message field from JSON
              const jsonMatch = accumulatedContent.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              if (jsonMatch) {
                // Unescape JSON string
                cleanedContent = jsonMatch[1]
                  .replace(/\\"/g, '"')
                  .replace(/\\n/g, '\n')
                  .replace(/\\\\/g, '\\');
              } else {
                // Fall back to first structured question's text
                const currentQuestions = get(this.structuredQuestions);
                if (currentQuestions && currentQuestions.length > 0) {
                  cleanedContent = currentQuestions[0].question;
                }
              }
            }

            // CRITICAL: Clear streaming state BEFORE adding final message to prevent
            // visual overlap where both streaming bubble and final message render together
            this.isThinking.set(false);
            this.isStreaming.set(false);
            this.streamingContent.set('');
            this.currentToolCall.set(null);

            // Allow Svelte's reactivity to process the cleared streaming state
            // before adding the final message (prevents race condition causing ghost text)
            await new Promise(resolve => setTimeout(resolve, 0));

            // Always add assistant message if we have content OR structured questions
            if (cleanedContent || receivedStructuredQuestions) {
              const messageContent = cleanedContent || ''; // Use empty string if still no content
              this.messages.update((messages) => [
                ...messages,
                {
                  role: 'assistant',
                  content: messageContent,
                  timestamp: new Date(),
                },
              ]);
            }

            this.itineraryUpdated.set(event.itineraryUpdated);

            // Update token and cost tracking
            if (event.tokens) {
              this.sessionTokens.update((current) => ({
                input: current.input + event.tokens!.input,
                output: current.output + event.tokens!.output,
                total: current.total + event.tokens!.total,
              }));
            }

            if (event.cost) {
              this.sessionCost.update((current) => ({
                input: current.input + event.cost!.input,
                output: current.output + event.cost!.output,
                total: current.total + event.cost!.total,
              }));
            }

            break;

          case 'error':
            this.error.set(event.message);
            this.isThinking.set(false);
            this.isStreaming.set(false);
            this.streamingContent.set('');
            this.currentToolCall.set(null);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to send context message:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to send message');
      this.isStreaming.set(false);
      this.streamingContent.set('');
      this.currentToolCall.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Delete a session on the backend
   * @param sessionId - Session ID to delete
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await apiClient.deleteChatSession(sessionId);
    } catch (error) {
      console.warn('Failed to delete session:', error);
      // Don't throw - session deletion is cleanup, not critical
    }
  }

  /**
   * Reset chat state completely
   * Use this when switching between itineraries or clearing the session
   * @param deleteBackendSession - If true, also delete the session on the backend
   * @returns Promise that resolves when reset is complete (including backend deletion)
   */
  async reset(deleteBackendSession = false): Promise<void> {
    const currentSessionId = get(this.sessionId);

    // CRITICAL: Delete backend session FIRST and AWAIT completion
    // This ensures orphaned sessions with stale context are fully removed
    // before any new session is created
    if (deleteBackendSession && currentSessionId) {
      console.log('[ChatStore] Deleting backend session:', currentSessionId);
      try {
        await this.deleteSession(currentSessionId);
        console.log('[ChatStore] Backend session deleted successfully');
      } catch (err) {
        console.warn('[ChatStore] Failed to delete session during reset:', err);
        // Continue with reset even if delete fails - don't leave frontend in bad state
      }
    }

    // Clear all frontend state AFTER backend cleanup
    this.sessionId.set(null);
    this.messages.set([]);
    this.loading.set(false);
    this.error.set(null);
    this.structuredQuestions.set(null);
    this.streamingContent.set('');
    this.isThinking.set(false);
    this.isStreaming.set(false);
    this.currentToolCall.set(null);
    this.itineraryUpdated.set(false);
    this.sessionTokens.set({ input: 0, output: 0, total: 0 });
    this.sessionCost.set({ input: 0, output: 0, total: 0 });
    // NOTE: pendingPrompt is NOT cleared during reset - it represents user intent
    // (e.g., clicking a checklist item) that should survive session resets
  }
}

// Export singleton instance
export const chatStore = new ChatStore();

// Export individual stores for backward compatibility with $ syntax
export const chatSessionId = chatStore.sessionId;
export const chatMessages = chatStore.messages;
export const chatLoading = chatStore.loading;
export const chatError = chatStore.error;
export const structuredQuestions = chatStore.structuredQuestions;
export const streamingContent = chatStore.streamingContent;
export const isStreaming = chatStore.isStreaming;
export const isThinking = chatStore.isThinking;
export const currentToolCall = chatStore.currentToolCall;
export const itineraryUpdated = chatStore.itineraryUpdated;
export const sessionTokens = chatStore.sessionTokens;
export const sessionCost = chatStore.sessionCost;
export const pendingPrompt = chatStore.pendingPrompt;

// Export standalone functions for backward compatibility
export async function createChatSession(itineraryId?: string, mode: 'trip-designer' | 'help' = 'trip-designer'): Promise<void> {
  await chatStore.createSession(itineraryId, mode);
}

export async function sendMessage(message: string): Promise<AgentResponse | null> {
  return await chatStore.sendMessage(message);
}

export async function sendMessageStreaming(message: string): Promise<void> {
  await chatStore.sendMessageStreaming(message);
}

export async function sendContextMessage(message: string): Promise<void> {
  await chatStore.sendContextMessage(message);
}

export async function resetChat(deleteBackendSession = false): Promise<void> {
  await chatStore.reset(deleteBackendSession);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await chatStore.deleteSession(sessionId);
}

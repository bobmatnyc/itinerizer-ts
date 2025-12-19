/**
 * Example frontend client for SSE streaming chat
 * This demonstrates how to consume the streaming endpoint from a browser or Node.js
 */

export interface ChatStreamOptions {
  onText?: (content: string) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: unknown, success: boolean) => void;
  onStructuredQuestions?: (questions: unknown[]) => void;
  onDone?: (data: { itineraryUpdated: boolean; segmentsModified?: string[] }) => void;
  onError?: (message: string) => void;
  onConnected?: () => void;
}

/**
 * Stream a chat message using SSE
 */
export async function streamChatMessage(
  sessionId: string,
  message: string,
  options: ChatStreamOptions = {},
  baseUrl: string = 'http://localhost:3000'
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/chat/sessions/${sessionId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let currentEvent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        // Parse SSE format
        if (line.startsWith('event: ')) {
          currentEvent = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
          const dataStr = line.substring(6);

          try {
            const data = JSON.parse(dataStr);

            // Dispatch based on event type
            switch (currentEvent) {
              case 'connected':
                options.onConnected?.();
                break;

              case 'text':
                options.onText?.(data.content);
                break;

              case 'tool_call':
                options.onToolCall?.(data.name, data.arguments);
                break;

              case 'tool_result':
                options.onToolResult?.(data.name, data.result, data.success);
                break;

              case 'structured_questions':
                options.onStructuredQuestions?.(data.questions);
                break;

              case 'done':
                options.onDone?.(data);
                break;

              case 'error':
                options.onError?.(data.message);
                break;
            }
          } catch (parseError) {
            console.error('Failed to parse SSE data:', dataStr, parseError);
          }

          // Reset event type
          currentEvent = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Example usage in a UI component
 */
export async function exampleUsage() {
  const sessionId = 'your-session-id';
  const message = 'I want to plan a trip to Tokyo for 5 days';

  let fullMessage = '';

  await streamChatMessage(sessionId, message, {
    onConnected: () => {
      console.log('Connected to stream');
    },

    onText: (content) => {
      // Append text to message display
      fullMessage += content;
      console.log('Received text chunk:', content);
      // Update UI: updateMessageDisplay(fullMessage);
    },

    onToolCall: (name, args) => {
      console.log(`Tool called: ${name}`, args);
      // Update UI: showToolExecution(name, args);
    },

    onToolResult: (name, result, success) => {
      console.log(`Tool ${name} ${success ? 'succeeded' : 'failed'}:`, result);
      // Update UI: showToolResult(name, result, success);
    },

    onStructuredQuestions: (questions) => {
      console.log('Structured questions:', questions);
      // Update UI: renderQuestions(questions);
    },

    onDone: (data) => {
      console.log('Stream complete', data);

      if (data.itineraryUpdated) {
        console.log('Itinerary was updated!');
        console.log('Modified segments:', data.segmentsModified);
        // Update UI: refreshItinerary();
      }
    },

    onError: (message) => {
      console.error('Stream error:', message);
      // Update UI: showError(message);
    },
  });
}

/**
 * Svelte 5 component example
 */
export const SvelteExample = `
<script lang="ts">
  import { streamChatMessage } from './streaming-chat-client';

  let sessionId = $state('');
  let message = $state('');
  let fullResponse = $state('');
  let isStreaming = $state(false);
  let error = $state('');
  let questions = $state<unknown[]>([]);

  async function sendMessage() {
    if (!message.trim() || !sessionId) return;

    isStreaming = true;
    fullResponse = '';
    error = '';
    questions = [];

    try {
      await streamChatMessage(sessionId, message, {
        onText: (content) => {
          fullResponse += content;
        },

        onToolCall: (name, args) => {
          console.log('Executing tool:', name, args);
        },

        onStructuredQuestions: (qs) => {
          questions = qs;
        },

        onDone: (data) => {
          isStreaming = false;
          if (data.itineraryUpdated) {
            // Refresh itinerary view
          }
        },

        onError: (msg) => {
          error = msg;
          isStreaming = false;
        }
      });

      // Clear input after successful send
      message = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      isStreaming = false;
    }
  }
</script>

<div class="chat-container">
  <div class="messages">
    {#if fullResponse}
      <div class="assistant-message">
        {fullResponse}
      </div>
    {/if}

    {#if questions.length > 0}
      <div class="questions">
        <h3>Answer these questions:</h3>
        {#each questions as question}
          <div class="question">{question.question}</div>
        {/each}
      </div>
    {/if}

    {#if error}
      <div class="error">{error}</div>
    {/if}
  </div>

  <form onsubmit={sendMessage}>
    <input
      type="text"
      bind:value={message}
      placeholder="Ask me about your trip..."
      disabled={isStreaming}
    />
    <button type="submit" disabled={isStreaming || !message.trim()}>
      {isStreaming ? 'Sending...' : 'Send'}
    </button>
  </form>
</div>
`;

/**
 * React example
 */
export const ReactExample = `
import { useState } from 'react';
import { streamChatMessage } from './streaming-chat-client';

export function ChatComponent({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState('');
  const [fullResponse, setFullResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<unknown[]>([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsStreaming(true);
    setFullResponse('');
    setError('');
    setQuestions([]);

    try {
      await streamChatMessage(sessionId, message, {
        onText: (content) => {
          setFullResponse((prev) => prev + content);
        },

        onToolCall: (name, args) => {
          console.log('Executing tool:', name, args);
        },

        onStructuredQuestions: (qs) => {
          setQuestions(qs);
        },

        onDone: (data) => {
          setIsStreaming(false);
          if (data.itineraryUpdated) {
            // Refresh itinerary view
          }
        },

        onError: (msg) => {
          setError(msg);
          setIsStreaming(false);
        }
      });

      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {fullResponse && (
          <div className="assistant-message">{fullResponse}</div>
        )}

        {questions.length > 0 && (
          <div className="questions">
            <h3>Answer these questions:</h3>
            {questions.map((q, i) => (
              <div key={i} className="question">{q.question}</div>
            ))}
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask me about your trip..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !message.trim()}>
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
`;

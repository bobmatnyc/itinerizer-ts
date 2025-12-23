import { writable } from 'svelte/store';
import { apiClient } from '../api';
import type { ChatMessage, StructuredQuestion, AgentResponse, TokenUsage, CostData } from '../types';
import { settingsStore } from './settings.svelte';
import { visualizationStore, extractVisualizationFromToolResult, type MapMarker } from './visualization.svelte';

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

// Pending prompt for quick prompt injection
export const pendingPrompt = writable<string | null>(null);

// Known airport codes with coordinates
const KNOWN_AIRPORTS: Record<string, { lat: number; lng: number; city: string }> = {
  'JFK': { lat: 40.6413, lng: -73.7781, city: 'New York JFK' },
  'LAX': { lat: 33.9425, lng: -118.4081, city: 'Los Angeles' },
  'NRT': { lat: 35.7720, lng: 140.3929, city: 'Tokyo Narita' },
  'HND': { lat: 35.5494, lng: 139.7798, city: 'Tokyo Haneda' },
  'SFO': { lat: 37.6213, lng: -122.3790, city: 'San Francisco' },
  'ORD': { lat: 41.9742, lng: -87.9073, city: 'Chicago O\'Hare' },
  'LHR': { lat: 51.4700, lng: -0.4543, city: 'London Heathrow' },
  'CDG': { lat: 49.0097, lng: 2.5479, city: 'Paris Charles de Gaulle' },
  'DXB': { lat: 25.2532, lng: 55.3657, city: 'Dubai' },
  'SIN': { lat: 1.3644, lng: 103.9915, city: 'Singapore Changi' },
  'ICN': { lat: 37.4602, lng: 126.4407, city: 'Seoul Incheon' },
  'BKK': { lat: 13.6900, lng: 100.7501, city: 'Bangkok Suvarnabhumi' },
  'HKG': { lat: 22.3080, lng: 113.9185, city: 'Hong Kong' },
  'SYD': { lat: -33.9399, lng: 151.1753, city: 'Sydney' },
  'MEL': { lat: -37.6690, lng: 144.8410, city: 'Melbourne' },
  'YVR': { lat: 49.1967, lng: -123.1815, city: 'Vancouver' },
  'YYZ': { lat: 43.6777, lng: -79.6248, city: 'Toronto Pearson' },
  'AMS': { lat: 52.3105, lng: 4.7683, city: 'Amsterdam Schiphol' },
  'FRA': { lat: 50.0379, lng: 8.5622, city: 'Frankfurt' },
  'MUC': { lat: 48.3538, lng: 11.7861, city: 'Munich' },
  'FCO': { lat: 41.8003, lng: 12.2389, city: 'Rome Fiumicino' },
  'MAD': { lat: 40.4983, lng: -3.5676, city: 'Madrid' },
  'BCN': { lat: 41.2974, lng: 2.0833, city: 'Barcelona' },
};

// Known cities with coordinates
const KNOWN_CITIES: Record<string, { lat: number; lng: number }> = {
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Yokohama': { lat: 35.4437, lng: 139.6380 },
  'Kyoto': { lat: 35.0116, lng: 135.7681 },
  'Osaka': { lat: 34.6937, lng: 135.5023 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Munich': { lat: 48.1351, lng: 11.5820 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
};

/**
 * Detect geographic locations in text and return map markers
 * @param text - The text content to analyze
 * @returns Array of map markers representing detected locations
 */
function detectLocationsInText(text: string): MapMarker[] {
  const markers: MapMarker[] = [];
  const seen = new Set<string>(); // Track to avoid duplicates

  // Check for airport codes (3 uppercase letters, word boundary)
  const airportMatches = text.match(/\b([A-Z]{3})\b/g);
  if (airportMatches) {
    for (const code of airportMatches) {
      if (KNOWN_AIRPORTS[code] && !seen.has(code)) {
        const airport = KNOWN_AIRPORTS[code];
        markers.push({
          lat: airport.lat,
          lng: airport.lng,
          label: `${code} (${airport.city})`,
          type: 'flight' as any
        });
        seen.add(code);
      }
    }
  }

  // Check for known city names (case-sensitive to avoid false positives)
  for (const [city, coords] of Object.entries(KNOWN_CITIES)) {
    if (text.includes(city) && !seen.has(city)) {
      // Avoid duplicate if airport already added for this city
      const isDuplicate = markers.some(m =>
        Math.abs(m.lat - coords.lat) < 0.5 && Math.abs(m.lng - coords.lng) < 0.5
      );

      if (!isDuplicate) {
        markers.push({
          lat: coords.lat,
          lng: coords.lng,
          label: city,
          type: 'destination'
        });
        seen.add(city);
      }
    }
  }

  return markers;
}

/**
 * Check if content appears to be starting a JSON block
 * Returns true if we should buffer instead of displaying
 */
function isStartingJsonBlock(content: string): boolean {
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
function hasCompleteJsonBlock(content: string): boolean {
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
function getStreamingDisplayContent(accumulatedContent: string): string {
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
function cleanMessageContent(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // Step 1: Remove all fenced JSON blocks (```json ... ```)
  // Use global flag to remove all occurrences
  cleaned = cleaned.replace(/```json\s*[\s\S]*?```/g, '');

  // Step 2: Try to extract message from naked JSON object with "message" field
  // Match JSON objects that contain a "message" property
  const jsonObjectMatch = cleaned.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,[\s\S]*)?\}/);
  if (jsonObjectMatch) {
    try {
      // Try to parse the full JSON object
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed.message) {
        // Replace the JSON object with just the message content
        cleaned = cleaned.replace(jsonObjectMatch[0], parsed.message);
      }
    } catch (e) {
      // If parsing fails, try to extract just the message field value
      const messageValue = jsonObjectMatch[1];
      if (messageValue) {
        // Unescape JSON string escapes
        const unescaped = messageValue.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        cleaned = cleaned.replace(jsonObjectMatch[0], unescaped);
      }
    }
  }

  // Step 3: Remove any remaining JSON-like structures
  // Remove standalone curly braces with common JSON patterns
  cleaned = cleaned.replace(/\{\s*"(?:message|structuredQuestions|type|id)"[\s\S]*?\}/g, '');

  // Step 4: Truncate at the start of any JSON block that wasn't fully removed
  // This handles partial JSON during streaming
  const jsonMarkers = [
    cleaned.indexOf('```json'),
    cleaned.indexOf('\n{'),
    cleaned.indexOf(' {'),
  ].filter(idx => idx >= 0);

  if (jsonMarkers.length > 0) {
    const firstMarker = Math.min(...jsonMarkers);
    if (firstMarker > 0) {
      cleaned = cleaned.substring(0, firstMarker);
    } else if (firstMarker === 0) {
      // If content starts with JSON, try to preserve any text before it
      const lines = cleaned.split('\n');
      const nonJsonLines = lines.filter(line =>
        !line.trim().startsWith('{') &&
        !line.trim().startsWith('```') &&
        line.trim().length > 0
      );
      if (nonJsonLines.length > 0) {
        cleaned = nonJsonLines.join('\n');
      }
    }
  }

  // Step 5: Clean up whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Create a new chat session for an itinerary or help mode
 * @param itineraryId - Optional itinerary ID (required for trip-designer mode)
 * @param mode - Agent mode: 'trip-designer' or 'help'
 */
export async function createChatSession(itineraryId?: string, mode: 'trip-designer' | 'help' = 'trip-designer'): Promise<void> {
  chatLoading.set(true);
  chatError.set(null);

  try {
    const { sessionId } = await apiClient.createChatSession(itineraryId, mode);
    chatSessionId.set(sessionId);
    chatMessages.set([]);
    structuredQuestions.set(null);
  } catch (error) {
    console.error('Failed to create chat session:', error);
    // Don't set error for "Session not found" - this is normal when no session exists yet
    const errorMessage = error instanceof Error ? error.message : 'Failed to create chat session';
    if (!errorMessage.includes('Session not found')) {
      chatError.set(errorMessage);
    }
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

  // Check if API key is configured
  const apiKey = settingsStore.openRouterKey;
  if (!apiKey || apiKey.trim() === '') {
    chatError.set('No OpenRouter API key configured. Please add your API key in Profile settings.');
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

    // Add assistant response with cleaned content
    chatMessages.update((messages) => [
      ...messages,
      {
        role: 'assistant',
        content: cleanMessageContent(response.message),
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

  // Check if API key is configured
  const apiKey = settingsStore.openRouterKey;
  if (!apiKey || apiKey.trim() === '') {
    chatError.set('No OpenRouter API key configured. Please add your API key in Profile settings.');
    return;
  }

  chatLoading.set(true);
  chatError.set(null);
  isStreaming.set(true);
  streamingContent.set('');
  currentToolCall.set(null);
  // Don't clear structured questions yet - wait for stream to complete
  // They will be cleared only if the new response doesn't have questions

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
    let receivedStructuredQuestions = false;

    // Iterate over stream events
    for await (const event of apiClient.sendChatMessageStream(sessionId, message)) {
      switch (event.type) {
        case 'connected':
          console.log('Stream connected:', event.sessionId);
          break;

        case 'text':
          accumulatedContent += event.content;
          // Use smart display logic to hide incomplete JSON blocks
          streamingContent.set(getStreamingDisplayContent(accumulatedContent));
          break;

        case 'tool_call':
          currentToolCall.set(event.name);
          break;

        case 'tool_result':
          currentToolCall.set(null);

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
          structuredQuestions.set(event.questions);
          receivedStructuredQuestions = true;
          break;

        case 'done':
          // Clear structured questions if we didn't receive new ones
          if (!receivedStructuredQuestions) {
            structuredQuestions.set(null);
          }

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

            // Detect locations in the finalized message and trigger map visualization
            try {
              const detectedMarkers = detectLocationsInText(cleanedContent);
              if (detectedMarkers.length >= 2) {
                // Only show map if we found at least 2 locations (makes a route)
                visualizationStore.addVisualization('map', {
                  markers: detectedMarkers,
                  polylines: [{
                    points: detectedMarkers.map(m => ({ lat: m.lat, lng: m.lng })),
                    color: '#3b82f6'
                  }]
                }, `Route: ${detectedMarkers.map(m => m.label).join(' → ')}`);
              }
            } catch (locationError) {
              console.warn('Failed to detect locations in message:', locationError);
            }
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
 * Send a context message that won't be visible in the chat history.
 * Only the assistant's response will be added to the chat.
 * Used for sending initial context or system messages to the LLM.
 */
export async function sendContextMessage(message: string): Promise<void> {
  let sessionId: string | null = null;
  chatSessionId.subscribe((id) => (sessionId = id))();

  if (!sessionId) {
    chatError.set('No active chat session');
    return;
  }

  // Check if API key is configured
  const apiKey = settingsStore.openRouterKey;
  if (!apiKey || apiKey.trim() === '') {
    chatError.set('No OpenRouter API key configured. Please add your API key in Profile settings.');
    return;
  }

  chatLoading.set(true);
  chatError.set(null);
  isStreaming.set(true);
  streamingContent.set('');
  currentToolCall.set(null);
  // Don't clear structured questions yet - wait for stream to complete
  // They will be cleared only if the new response doesn't have questions

  try {
    // NOTE: Unlike sendMessageStreaming, we do NOT add the user message to chatMessages
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
          streamingContent.set(getStreamingDisplayContent(accumulatedContent));
          break;

        case 'tool_call':
          currentToolCall.set(event.name);
          break;

        case 'tool_result':
          currentToolCall.set(null);

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
          structuredQuestions.set(event.questions);
          receivedStructuredQuestions = true;
          break;

        case 'done':
          // Clear structured questions if we didn't receive new ones
          if (!receivedStructuredQuestions) {
            structuredQuestions.set(null);
          }

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

            // Detect locations in the finalized message and trigger map visualization
            try {
              const detectedMarkers = detectLocationsInText(cleanedContent);
              if (detectedMarkers.length >= 2) {
                // Only show map if we found at least 2 locations (makes a route)
                visualizationStore.addVisualization('map', {
                  markers: detectedMarkers,
                  polylines: [{
                    points: detectedMarkers.map(m => ({ lat: m.lat, lng: m.lng })),
                    color: '#3b82f6'
                  }]
                }, `Route: ${detectedMarkers.map(m => m.label).join(' → ')}`);
              }
            } catch (locationError) {
              console.warn('Failed to detect locations in message:', locationError);
            }
          }

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
    console.error('Failed to send context message:', error);
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

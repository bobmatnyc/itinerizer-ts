# Streaming Chat API Reference

Quick reference for the streaming chat implementation.

## API Client

### `apiClient.sendChatMessageStream(sessionId: string, message: string)`

Returns an `AsyncGenerator<ChatStreamEvent>` that yields SSE events.

**Usage:**
```typescript
for await (const event of apiClient.sendChatMessageStream(sessionId, message)) {
  switch (event.type) {
    case 'text':
      console.log(event.content);
      break;
    case 'tool_call':
      console.log(`Calling ${event.name}`);
      break;
    case 'done':
      console.log('Stream complete');
      break;
  }
}
```

## Store API

### State Stores

```typescript
import {
  chatSessionId,        // string | null - current session ID
  chatMessages,         // ChatMessage[] - message history
  chatLoading,          // boolean - general loading state
  chatError,            // string | null - error message
  structuredQuestions,  // StructuredQuestion[] | null - active questions
  streamingContent,     // string - accumulating text
  isStreaming,          // boolean - streaming in progress
  currentToolCall,      // string | null - active tool name
  itineraryUpdated,     // boolean - triggers reload
} from '$lib/stores/chat';
```

### Actions

```typescript
// Create session
await createChatSession(itineraryId: string): Promise<void>

// Send message with streaming
await sendMessageStreaming(message: string): Promise<void>

// Legacy non-streaming (still supported)
await sendMessage(message: string): Promise<AgentResponse | null>

// Reset all state
resetChat(): void
```

## Event Types

### Connected
```typescript
{ type: 'connected'; sessionId: string }
```
Emitted when stream establishes connection.

### Text
```typescript
{ type: 'text'; content: string }
```
Incremental text content. Accumulate in `streamingContent`.

### Tool Call
```typescript
{
  type: 'tool_call';
  name: string;
  arguments: Record<string, unknown>;
}
```
Agent is executing a tool. Show indicator in UI.

### Tool Result
```typescript
{
  type: 'tool_result';
  name: string;
  result: unknown;
  success: boolean;
}
```
Tool execution completed.

### Structured Questions
```typescript
{
  type: 'structured_questions';
  questions: StructuredQuestion[];
}
```
Agent is asking structured questions.

### Done
```typescript
{
  type: 'done';
  itineraryUpdated: boolean;
  segmentsModified?: string[];
}
```
Stream complete. Reload itinerary if `itineraryUpdated` is true.

### Error
```typescript
{
  type: 'error';
  message: string;
  retryable?: boolean;
}
```
Error occurred. Display message and optionally allow retry.

## Question Types

### Single Choice
```typescript
{
  id: string;
  type: 'single_choice';
  question: string;
  context?: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
    imageUrl?: string;
  }>;
}
```

**Behavior**: Auto-submit on click

### Multiple Choice
```typescript
{
  id: string;
  type: 'multiple_choice';
  question: string;
  context?: string;
  options: QuestionOption[];
}
```

**Behavior**: Toggle selection, confirm button

### Scale
```typescript
{
  id: string;
  type: 'scale';
  question: string;
  context?: string;
  scale: {
    min: number;
    max: number;
    step?: number;
    minLabel?: string;
    maxLabel?: string;
  };
  validation?: {
    required?: boolean;
  };
}
```

**Behavior**: Slider with real-time value display

### Date Range
```typescript
{
  id: string;
  type: 'date_range';
  question: string;
  context?: string;
  validation?: {
    required?: boolean;
  };
}
```

**Behavior**: Two date pickers, both required

### Text
```typescript
{
  id: string;
  type: 'text';
  question: string;
  context?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
  };
}
```

**Behavior**: Free-form input, Enter to submit

## Component Props

### ChatBox

```typescript
interface ChatBoxProps {
  itineraryId: string;   // Required
  disabled?: boolean;    // Optional, default: false
}
```

**Usage:**
```svelte
<ChatBox itineraryId="123" />
```

## Styling Classes

### Message States
- `.chatbox-message-user` - User messages
- `.chatbox-message-assistant` - Assistant messages
- `.chatbox-streaming` - Streaming text with cursor
- `.chatbox-tool-call` - Tool execution indicator
- `.chatbox-typing` - Loading dots

### Question Types
- `.chatbox-question` - Question container
- `.chatbox-question-text` - Question text
- `.chatbox-question-context` - Context/hint text
- `.chatbox-option-button` - Single/multiple choice button
- `.chatbox-option-selected` - Selected multiple choice
- `.chatbox-scale-question` - Scale slider container
- `.chatbox-date-range-question` - Date range container
- `.chatbox-text-question` - Text input container

### Interactive Elements
- `.chatbox-confirm-button` - Confirm selection
- `.chatbox-scale-input` - Range slider
- `.chatbox-date-input` - Date picker
- `.chatbox-text-input` - Text input
- `.chatbox-send-button` - Send message

## SSE Format

The backend sends events in this format:

```
event: text
data: {"content":"Hello"}

event: tool_call
data: {"name":"search_flights","arguments":{}}

event: done
data: {"itineraryUpdated":true}
```

Each event consists of:
1. `event:` line - event type
2. `data:` line - JSON payload
3. Empty line - event boundary

The API client parses this automatically.

## Error Handling

```typescript
try {
  await sendMessageStreaming(message);
} catch (error) {
  // Network error, stream closed, etc.
  console.error('Stream failed:', error);
}
```

Errors are also delivered via `error` events in the stream.

## Auto-Scroll Behavior

The chat auto-scrolls when:
- User is within 100px of bottom
- New message arrives
- Streaming content updates
- Questions appear

Manual scroll disables auto-scroll until user scrolls back to bottom.

## Tool Call Labels

Default labels for common tools:
- `search_flights` → "Searching flights"
- `search_hotels` → "Searching hotels"
- `search_activities` → "Searching activities"
- `get_weather` → "Checking weather"
- `add_segment` → "Adding to itinerary"
- `update_segment` → "Updating itinerary"
- Others → "Running [tool_name]"

Customize in `getToolCallLabel()` function.

## Performance Tips

1. **Use streaming for all chat interactions** - Better UX than waiting for complete response
2. **Auto-scroll optimization** - Only scrolls when user is near bottom
3. **Debounce rapid events** - If needed, batch multiple `text` events
4. **Clean up on unmount** - Stream reader auto-releases but verify in dev tools

## Debugging

Enable verbose logging:
```typescript
// In chat.ts, uncomment debug logs:
console.log('Stream event:', event);
```

Check stream connection:
```typescript
// In browser console:
$chatSessionId // Should show session ID
$isStreaming   // Should be true during streaming
$streamingContent // Should accumulate text
```

## Migration from Non-Streaming

Old code:
```typescript
const response = await sendMessage(message);
if (response?.itineraryUpdated) {
  await loadItinerary(itineraryId);
}
```

New code:
```typescript
await sendMessageStreaming(message);
// Auto-reloads via $effect in ChatBox
```

The streaming version handles itinerary reloading automatically via reactive effects.

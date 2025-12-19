# Streaming Chat Implementation

This document describes the Server-Sent Events (SSE) streaming implementation for the Trip Designer chat feature.

## Overview

The streaming chat allows real-time text responses while processing tool calls and structured questions. This provides a better user experience compared to waiting for the entire response to complete.

## Architecture

### Backend Components

1. **StreamEvent Types** (`src/domain/types/trip-designer.ts`)
   - Defines all possible streaming events
   - Type-safe event structure for SSE

2. **TripDesignerService.chatStream()** (`src/services/trip-designer/trip-designer.service.ts`)
   - AsyncGenerator that yields StreamEvent objects
   - Handles OpenAI streaming API
   - Processes tool calls and structured questions
   - Manages session state

3. **SSE Endpoint** (`src/server/api.ts`)
   - `POST /api/chat/sessions/:sessionId/messages/stream`
   - Converts StreamEvent objects to SSE format
   - Handles connection lifecycle

## Event Types

The streaming endpoint emits the following event types:

### 1. `connected`
Sent immediately when connection is established.

```
event: connected
data: {"status":"connected"}
```

### 2. `text`
Streamed text content from the AI response.

```
event: text
data: {"content": "This is a chunk of text..."}
```

### 3. `tool_call`
Indicates a tool is being called (e.g., add_flight, search_hotels).

```
event: tool_call
data: {"name": "add_flight", "arguments": {"from": "LAX", "to": "NRT"}}
```

### 4. `tool_result`
Result of a tool execution.

```
event: tool_result
data: {"name": "add_flight", "result": {...}, "success": true}
```

### 5. `structured_questions`
Structured questions for UI rendering (sent at the end).

```
event: structured_questions
data: {"questions": [...]}
```

### 6. `done`
Final event indicating the stream is complete.

```
event: done
data: {"itineraryUpdated": true, "segmentsModified": ["seg-123"]}
```

### 7. `error`
Error occurred during processing.

```
event: error
data: {"message": "Error description"}
```

## Implementation Details

### Service Layer

The `chatStream()` method in `TripDesignerService`:

1. Validates session exists
2. Adds user message to session
3. Calls OpenAI with `stream: true`
4. Yields text chunks as they arrive
5. Accumulates tool calls from streaming chunks
6. Executes tool calls when complete
7. Makes second streaming call for natural language response
8. Parses and yields structured questions
9. Yields final `done` event

**Key Features:**
- Type-safe AsyncGenerator
- Proper error handling with `error` events
- Session state management
- Tool call accumulation and execution
- Support for two-phase streaming (tool call + response)

### API Layer

The SSE endpoint (`/api/chat/sessions/:sessionId/messages/stream`):

1. Sets SSE headers:
   - `Content-Type: text/event-stream`
   - `Cache-Control: no-cache`
   - `Connection: keep-alive`
   - `X-Accel-Buffering: no` (disables nginx buffering)

2. Sends initial `connected` event
3. Iterates over `chatStream()` generator
4. Maps StreamEvent objects to SSE format
5. Handles errors gracefully
6. Closes connection on completion

**SSE Format:**
```
event: <event_type>\n
data: <json_payload>\n\n
```

## Usage Examples

### Backend Testing

```bash
# Create a session first
curl -X POST http://localhost:3000/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"itineraryId": "your-itinerary-id"}'

# Stream a message
curl -N -X POST http://localhost:3000/api/chat/sessions/SESSION_ID/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to plan a trip to Tokyo for 5 days"}'
```

Or use the provided test script:
```bash
./test-streaming.sh
```

### Frontend Integration (Svelte)

```typescript
async function sendStreamingMessage(sessionId: string, message: string) {
  const response = await fetch(
    `/api/chat/sessions/${sessionId}/messages/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }
  );

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const eventType = line.substring(7);
        continue;
      }

      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));

        // Handle different event types
        switch (eventType) {
          case 'text':
            // Append text to UI
            appendText(data.content);
            break;

          case 'tool_call':
            // Show tool execution indicator
            showToolCall(data.name);
            break;

          case 'structured_questions':
            // Render structured questions UI
            renderQuestions(data.questions);
            break;

          case 'done':
            // Refresh itinerary if modified
            if (data.itineraryUpdated) {
              refreshItinerary();
            }
            break;

          case 'error':
            // Show error message
            showError(data.message);
            break;
        }
      }
    }
  }
}
```

### Using EventSource (Alternative)

```typescript
function streamChat(sessionId: string, message: string) {
  // First send the message via POST
  fetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  }).then(response => {
    // EventSource doesn't support POST, so we use fetch above
    // Then process the stream manually (see example above)
  });
}
```

## Backward Compatibility

The non-streaming endpoint remains available:

```
POST /api/chat/sessions/:sessionId/messages
```

This endpoint returns the complete response as JSON:

```json
{
  "message": "Full response text",
  "structuredQuestions": [...],
  "itineraryUpdated": true,
  "segmentsModified": ["seg-123"],
  "toolCallsMade": [...]
}
```

## Error Handling

### Session Not Found
```
event: error
data: {"message": "Session not found"}
```

### API Error
```
event: error
data: {"message": "Rate limit exceeded. Please try again later."}
```

### Stream Error
If an error occurs mid-stream, an `error` event is sent followed by stream closure.

## Performance Considerations

1. **Memory Usage**: Streaming reduces memory usage by processing chunks incrementally
2. **Time to First Byte**: Users see text immediately rather than waiting for full response
3. **Tool Calls**: Non-streaming to avoid partial tool execution
4. **Connection Keepalive**: SSE maintains persistent connection

## Testing

### Unit Tests

Test the `chatStream()` method:
```typescript
test('chatStream yields text events', async () => {
  const events: StreamEvent[] = [];

  for await (const event of service.chatStream(sessionId, 'Hello')) {
    events.push(event);
  }

  expect(events.some(e => e.type === 'text')).toBe(true);
  expect(events[events.length - 1].type).toBe('done');
});
```

### Integration Tests

Test the SSE endpoint:
```bash
# Use curl with -N flag to disable buffering
curl -N -X POST http://localhost:3000/api/chat/sessions/SESSION_ID/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

### Load Testing

SSE connections are persistent. Monitor:
- Concurrent connections
- Memory usage per connection
- Response time for first chunk

## Future Enhancements

1. **Resume Support**: Allow resuming interrupted streams
2. **Compression**: Support gzip compression for text events
3. **Heartbeat**: Periodic ping to detect dead connections
4. **Metrics**: Track streaming performance metrics
5. **Backpressure**: Handle slow clients gracefully

## Related Files

- `/src/domain/types/trip-designer.ts` - StreamEvent types
- `/src/services/trip-designer/trip-designer.service.ts` - chatStream() method
- `/src/server/api.ts` - SSE endpoint
- `/test-streaming.sh` - Test script

## References

- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [OpenAI Streaming API](https://platform.openai.com/docs/api-reference/streaming)
- [Express.js Response Streaming](https://expressjs.com/en/api.html#res.write)

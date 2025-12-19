# Streaming Chat Implementation

This document describes the streaming chat functionality implementation for the Svelte 5 viewer.

## Overview

The frontend now supports real-time streaming chat with the backend SSE (Server-Sent Events) endpoint at `POST /api/chat/sessions/:sessionId/messages/stream`.

## Features Implemented

### 1. SSE Stream Processing
- Manual SSE parsing from fetch response body (supports POST method)
- Async generator pattern for clean stream iteration
- Proper error handling and stream cleanup
- Event buffering for partial messages

### 2. Streaming UI
- Real-time text streaming with cursor animation
- Tool call indicators (e.g., "🔧 Searching flights...")
- Auto-scroll as content streams in
- Smooth transitions between streaming states

### 3. Enhanced Structured Questions
All question types from backend are now supported:

#### Single Choice
- Click to select and auto-submit
- Image support with `imageUrl` field
- Description tooltips

#### Multiple Choice
- Toggle selection for multiple options
- Confirm button shows selection count
- Clear selection after submission

#### Scale (NEW)
- Range slider with min/max labels
- Real-time value display
- Custom step intervals
- Optional label text (e.g., "Not at all" to "Very much")

#### Date Range (NEW)
- Start and end date pickers
- Validation (both dates required)
- Formatted submission text

#### Text (NEW)
- Free-form text input
- Enter to submit
- Validation support

### 4. Context and Validation
- Question context field for additional guidance
- Validation rules (required, min/max)
- Image URLs for visual options

## File Changes

### `/src/lib/types.ts`
Added:
- `QuestionOption` interface with `imageUrl` field
- Enhanced `StructuredQuestion` with `context`, `scale`, `validation` fields
- `ChatStreamEvent` union type for all SSE event types

### `/src/lib/api.ts`
Added:
- `sendChatMessageStream()` async generator function
- Manual SSE parsing logic
- Event buffering and line processing

### `/src/lib/stores/chat.ts`
Added:
- `streamingContent` store - accumulates text as it streams
- `isStreaming` store - streaming state flag
- `currentToolCall` store - active tool name
- `itineraryUpdated` store - triggers reload
- `sendMessageStreaming()` function - handles all stream events

### `/src/lib/components/ChatBox.svelte`
Added:
- Streaming message display with cursor animation
- Tool call indicator with friendly labels
- Scale question UI (slider + labels)
- Date range question UI (two date pickers)
- Text question UI (input field)
- Auto-scroll effect for streaming content
- Auto-reload itinerary on update

Enhanced:
- Question rendering with context display
- Image support for options
- Better state management for all question types

## Event Flow

```
User sends message
  ↓
sendMessageStreaming() called
  ↓
Stream events received:
  1. 'connected' - Log session ID
  2. 'text' - Accumulate in streamingContent
  3. 'tool_call' - Show tool indicator
  4. 'tool_result' - Hide tool indicator
  5. 'structured_questions' - Display questions
  6. 'done' - Finalize message, reload if needed
  7. 'error' - Show error message
  ↓
Clear streaming state
```

## SSE Event Types

```typescript
type ChatStreamEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: unknown; success: boolean }
  | { type: 'structured_questions'; questions: StructuredQuestion[] }
  | { type: 'done'; itineraryUpdated: boolean; segmentsModified?: string[] }
  | { type: 'error'; message: string; retryable?: boolean };
```

## UI States

1. **Empty** - No messages, show placeholder
2. **Loading** - Typing indicator dots
3. **Streaming** - Text with blinking cursor
4. **Tool Call** - "🔧 [Tool name]..." indicator
5. **Questions** - Structured question UI
6. **Complete** - Finalized message in chat history

## Styling Features

### Animations
- **Cursor blink**: 1s interval for streaming text
- **Typing dots**: Staggered bounce animation
- **Smooth scroll**: Auto-scroll to bottom on new content

### Responsive Design
- Scale sliders adapt to container width
- Question options wrap on small screens
- Date pickers stack vertically on mobile

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Focus states for all interactive elements
- Semantic HTML structure

## Testing Checklist

- [ ] Stream connects and displays text progressively
- [ ] Cursor animation appears during streaming
- [ ] Tool calls show friendly labels
- [ ] Single choice auto-submits on click
- [ ] Multiple choice requires confirmation
- [ ] Scale slider updates value display
- [ ] Date range requires both dates
- [ ] Text input submits on Enter
- [ ] Auto-scroll works during streaming
- [ ] Itinerary reloads when updated
- [ ] Errors display properly
- [ ] Stream cleanup on unmount

## Usage Example

```svelte
<ChatBox itineraryId={currentItinerary.id} />
```

The component automatically:
1. Creates a chat session on mount
2. Streams responses in real-time
3. Shows tool execution progress
4. Renders structured questions
5. Reloads itinerary when modified
6. Handles errors gracefully

## Performance Considerations

- **Incremental rendering**: Text streams character-by-character without blocking
- **Auto-scroll optimization**: Only scrolls when near bottom
- **State updates**: Batched via Svelte's reactive system
- **Memory cleanup**: Stream reader released on completion

## Future Enhancements

Potential improvements:
- [ ] Markdown rendering for text content
- [ ] Rich media support (images, videos)
- [ ] Message reactions/feedback
- [ ] Conversation history persistence
- [ ] Export conversation to PDF
- [ ] Voice input support
- [ ] Multi-language support

## LOC Delta

- **Added**: ~400 lines
  - types.ts: +15
  - api.ts: +60
  - chat.ts: +110
  - ChatBox.svelte: +215
- **Removed**: ~30 lines (simplified legacy code)
- **Net Change**: +370 lines

The implementation adds significant functionality (streaming, 3 new question types, tool indicators) with clean, maintainable code following Svelte 5 best practices.

# ChatBox Component Usage Guide

## Quick Start

```svelte
<script>
  import ChatBox from '$lib/components/ChatBox.svelte';

  // Get your itinerary ID from your app state
  let itineraryId = 'your-itinerary-id';
</script>

<ChatBox {itineraryId} />
```

## Component Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `itineraryId` | `string` | Yes | - | The ID of the itinerary to chat about |
| `disabled` | `boolean` | No | `false` | Disable user input |

## State Management

The ChatBox uses shared stores from `$lib/stores/chat.ts`:

```typescript
import {
  chatSessionId,      // string | null - Current session ID
  chatMessages,       // ChatMessage[] - Message history
  chatLoading,        // boolean - Loading state
  chatError,          // string | null - Error message
  structuredQuestions // StructuredQuestion[] | null - Current questions
} from '$lib/stores/chat';
```

## Session Lifecycle

1. **Auto-Creation**: Session is automatically created when component mounts
2. **Persistence**: Session ID is maintained in the store
3. **Reset**: Call `resetChat()` to clear session and start fresh

```typescript
import { resetChat } from '$lib/stores/chat';

// Clear chat and start fresh
resetChat();
```

## Handling Structured Questions

The agent can return structured questions to guide the conversation:

### Single Choice Question

```json
{
  "id": "trip-type",
  "type": "single_choice",
  "question": "What type of trip are you planning?",
  "options": [
    {
      "id": "leisure",
      "label": "Leisure",
      "description": "Vacation and relaxation"
    },
    {
      "id": "business",
      "label": "Business",
      "description": "Work-related travel"
    }
  ]
}
```

User clicks an option → Message sent immediately with label text

### Multiple Choice Question

```json
{
  "id": "activities",
  "type": "multiple_choice",
  "question": "What activities interest you?",
  "options": [
    { "id": "museums", "label": "Museums" },
    { "id": "hiking", "label": "Hiking" },
    { "id": "dining", "label": "Fine Dining" }
  ]
}
```

User selects multiple options → Clicks "Confirm" → Message sent with comma-separated labels

## Itinerary Updates

When the agent modifies the itinerary, the component automatically reloads it:

```typescript
// In agent response
{
  "message": "I've added a flight to Paris",
  "itineraryUpdated": true,  // Triggers reload
  "segmentsModified": ["segment-id-123"]
}
```

The ChatBox calls `loadItinerary(itineraryId)` to refresh the data.

## Styling Customization

The ChatBox uses scoped styles. To customize:

1. **Override CSS variables** (if we add them):
```css
.chatbox {
  --chatbox-bg: #ffffff;
  --chatbox-user-msg: #3b82f6;
  --chatbox-assistant-msg: #f3f4f6;
}
```

2. **Use global styles**:
```css
:global(.chatbox-message-user .chatbox-message-content) {
  background-color: #10b981; /* Custom green */
}
```

## Error Handling

Errors are displayed in a banner at the top:

```typescript
// Errors are automatically shown
chatError.set('Failed to send message');

// Clear errors manually
chatError.set(null);
```

## Accessibility

- **Keyboard Navigation**: Enter to send, Shift+Enter for newline
- **Screen Readers**: Semantic HTML and ARIA labels
- **Focus Management**: Auto-focus on mount
- **Color Contrast**: WCAG AA compliant

## Performance Tips

1. **Debounce User Input**: For real-time typing indicators
2. **Virtualize Messages**: For very long conversations
3. **Lazy Load History**: Only load recent messages initially

## Common Patterns

### Reset Chat on New Itinerary

```svelte
<script>
  import { resetChat } from '$lib/stores/chat';

  $: if (itineraryId) {
    resetChat(); // Clear previous conversation
  }
</script>

<ChatBox {itineraryId} />
```

### Show Typing Indicator

```svelte
{#if $chatLoading}
  <div class="typing-indicator">Agent is typing...</div>
{/if}
```

### Custom Empty State

```svelte
<script>
  import { chatMessages } from '$lib/stores/chat';
</script>

{#if $chatMessages.length === 0}
  <div class="custom-empty-state">
    <h3>Welcome!</h3>
    <p>Ask me about your trip</p>
  </div>
{/if}
```

## Testing

### Unit Tests

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import ChatBox from './ChatBox.svelte';

test('sends message on Enter key', async () => {
  const { getByPlaceholderText } = render(ChatBox, {
    props: { itineraryId: 'test-123' }
  });

  const input = getByPlaceholderText('Type a message...');
  await fireEvent.input(input, { target: { value: 'Hello' } });
  await fireEvent.keyDown(input, { key: 'Enter' });

  // Assert message was sent
});
```

### Integration Tests

```typescript
test('creates session on mount', async () => {
  const mockCreate = vi.fn().mockResolvedValue({ sessionId: 'session-123' });
  apiClient.createChatSession = mockCreate;

  render(ChatBox, { props: { itineraryId: 'test-123' } });

  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith('test-123');
  });
});
```

## Troubleshooting

### ChatBox Not Appearing

- Check that `itineraryId` prop is provided
- Verify API server is running
- Check browser console for errors

### Messages Not Sending

- Check `$chatLoading` state
- Verify session was created (check `$chatSessionId`)
- Check API endpoint is accessible

### Structured Questions Not Showing

- Verify agent response includes `structuredQuestions` array
- Check browser console for parsing errors
- Ensure question `type` is one of: `single_choice`, `multiple_choice`, `scale`, `date_range`, `text`

### Auto-scroll Not Working

- Check that messages container has fixed height
- Verify scroll position detection logic
- Check for CSS overflow issues

## Advanced Usage

### Custom Message Rendering

Extend the message display to support rich content:

```svelte
{#each $chatMessages as msg}
  <div class="chatbox-message chatbox-message-{msg.role}">
    {#if msg.content.startsWith('http')}
      <a href={msg.content} target="_blank">{msg.content}</a>
    {:else}
      {@html marked(msg.content)} <!-- Render markdown -->
    {/if}
  </div>
{/each}
```

### Session Persistence

Save session to localStorage:

```typescript
import { chatSessionId } from '$lib/stores/chat';

chatSessionId.subscribe(id => {
  if (id) {
    localStorage.setItem('chatSessionId', id);
  }
});

// Restore on load
onMount(() => {
  const savedSessionId = localStorage.getItem('chatSessionId');
  if (savedSessionId) {
    chatSessionId.set(savedSessionId);
  }
});
```

## API Reference

See full API documentation in [CHATBOX_IMPLEMENTATION.md](../CHATBOX_IMPLEMENTATION.md)

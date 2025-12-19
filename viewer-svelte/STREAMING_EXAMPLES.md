# Streaming Chat Examples

Real-world usage examples for the streaming chat implementation.

## Basic Chat Flow

```svelte
<script lang="ts">
  import ChatBox from '$lib/components/ChatBox.svelte';

  let itineraryId = '123';
</script>

<ChatBox {itineraryId} />
```

That's it! The ChatBox component handles everything:
- Session creation
- Message streaming
- Question rendering
- Itinerary reloading

## Manual Stream Handling

If you need custom stream processing:

```typescript
import { apiClient } from '$lib/api';

async function customStreamHandler(sessionId: string, message: string) {
  let fullText = '';

  for await (const event of apiClient.sendChatMessageStream(sessionId, message)) {
    switch (event.type) {
      case 'text':
        fullText += event.content;
        console.log('Current text:', fullText);
        break;

      case 'tool_call':
        console.log(`🔧 Running ${event.name}...`);
        break;

      case 'structured_questions':
        console.log('Questions received:', event.questions);
        break;

      case 'done':
        console.log('Stream complete!');
        if (event.itineraryUpdated) {
          console.log('Itinerary was modified');
        }
        break;

      case 'error':
        console.error('Error:', event.message);
        break;
    }
  }

  return fullText;
}
```

## Question Type Examples

### Example 1: Single Choice (Cabin Class)

Backend sends:
```json
{
  "type": "structured_questions",
  "questions": [{
    "id": "cabin-1",
    "type": "single_choice",
    "question": "What cabin class do you prefer?",
    "context": "This helps us find the best flight options for you",
    "options": [
      { "id": "economy", "label": "Economy", "description": "Budget-friendly" },
      { "id": "premium", "label": "Premium Economy", "description": "More legroom" },
      { "id": "business", "label": "Business", "description": "Lie-flat seats" },
      { "id": "first", "label": "First Class", "description": "Ultimate luxury" }
    ]
  }]
}
```

User clicks "Business" → Auto-submits "Business" as message.

### Example 2: Multiple Choice (Activities)

Backend sends:
```json
{
  "type": "structured_questions",
  "questions": [{
    "id": "activities-1",
    "type": "multiple_choice",
    "question": "What activities interest you?",
    "options": [
      { "id": "museums", "label": "Museums & Culture" },
      { "id": "food", "label": "Food & Dining" },
      { "id": "outdoor", "label": "Outdoor Adventures" },
      { "id": "nightlife", "label": "Nightlife" },
      { "id": "shopping", "label": "Shopping" }
    ]
  }]
}
```

User selects: Museums, Food, Outdoor → Clicks confirm → Submits "Museums & Culture, Food & Dining, Outdoor Adventures".

### Example 3: Scale (Budget)

Backend sends:
```json
{
  "type": "structured_questions",
  "questions": [{
    "id": "budget-1",
    "type": "scale",
    "question": "What's your budget level?",
    "context": "This helps us suggest appropriate accommodations",
    "scale": {
      "min": 1,
      "max": 5,
      "step": 1,
      "minLabel": "Budget",
      "maxLabel": "Luxury"
    }
  }]
}
```

User drags slider to 4 → Clicks confirm → Submits "4".

### Example 4: Date Range (Trip Dates)

Backend sends:
```json
{
  "type": "structured_questions",
  "questions": [{
    "id": "dates-1",
    "type": "date_range",
    "question": "When are you planning to travel?",
    "validation": {
      "required": true
    }
  }]
}
```

User selects: Start = 2025-06-15, End = 2025-06-22 → Clicks confirm → Submits "From 2025-06-15 to 2025-06-22".

### Example 5: Text (Dietary Restrictions)

Backend sends:
```json
{
  "type": "structured_questions",
  "questions": [{
    "id": "dietary-1",
    "type": "text",
    "question": "Do you have any dietary restrictions?",
    "context": "We'll note this for restaurant recommendations",
    "validation": {
      "required": false,
      "max": 200
    }
  }]
}
```

User types: "Vegetarian, no dairy" → Presses Enter → Submits "Vegetarian, no dairy".

## Streaming Event Sequences

### Sequence 1: Simple Question

```
→ User: "I need a hotel in Paris"
← event: connected
← event: text "I can help you find a hotel in Paris. "
← event: text "First, let me ask a few questions."
← event: structured_questions (dates, budget, preferences)
← event: done
→ User selects dates and confirms
← event: connected
← event: tool_call (search_hotels)
← event: tool_result
← event: text "I found 3 great options..."
← event: done (itineraryUpdated: true)
```

### Sequence 2: Multi-Step Planning

```
→ User: "Plan a weekend trip to Tokyo"
← event: connected
← event: text "Great! Let's plan your Tokyo trip. "
← event: structured_questions (dates)
← event: done
→ User: "June 15-17, 2025"
← event: connected
← event: text "Perfect. Now let me find flights..."
← event: tool_call (search_flights)
← event: tool_result
← event: text "Found flights. Which cabin class?"
← event: structured_questions (cabin_class)
← event: done
→ User: "Economy"
← event: connected
← event: tool_call (add_segment)
← event: tool_result
← event: text "Flight added! Now for hotels..."
← event: tool_call (search_hotels)
← event: tool_result
← event: structured_questions (hotel_options)
← event: done
→ User selects hotel
← event: connected
← event: tool_call (add_segment)
← event: tool_result
← event: text "All set! Your trip is ready."
← event: done (itineraryUpdated: true)
```

## Custom Question Rendering

Override default question rendering:

```svelte
<script lang="ts">
  import { structuredQuestions } from '$lib/stores/chat';
  import type { StructuredQuestion } from '$lib/types';

  function renderCustomQuestion(q: StructuredQuestion) {
    if (q.type === 'single_choice' && q.id === 'special-case') {
      // Custom rendering logic
      return customComponent;
    }
    return defaultRendering;
  }
</script>

{#if $structuredQuestions}
  {#each $structuredQuestions as question}
    {#if question.id === 'special-case'}
      <!-- Custom UI -->
    {:else}
      <!-- Default ChatBox rendering -->
    {/if}
  {/each}
{/if}
```

## Error Recovery

### Retryable Errors

```typescript
import { chatError, sendMessageStreaming } from '$lib/stores/chat';
import { derived } from 'svelte/store';

// Detect retryable errors
const canRetry = derived(chatError, $error => {
  // Check if error message suggests retry
  return $error?.includes('timeout') || $error?.includes('network');
});

// Retry logic
async function retryLastMessage(lastMessage: string) {
  await sendMessageStreaming(lastMessage);
}
```

### Stream Interruption

```svelte
<script lang="ts">
  import { isStreaming, chatLoading } from '$lib/stores/chat';

  let streamTimeout: NodeJS.Timeout;

  $effect(() => {
    if ($isStreaming) {
      // Timeout if no updates for 30 seconds
      streamTimeout = setTimeout(() => {
        console.error('Stream timeout');
        // Handle timeout
      }, 30000);
    } else {
      clearTimeout(streamTimeout);
    }
  });
</script>
```

## Advanced Features

### Conversation History Export

```typescript
import { chatMessages } from '$lib/stores/chat';

function exportConversation() {
  const messages = get(chatMessages);
  const text = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chat-history.txt';
  a.click();
  URL.revokeObjectURL(url);
}
```

### Live Typing Indicator

```svelte
<script lang="ts">
  import { isStreaming, currentToolCall } from '$lib/stores/chat';

  let statusText = $derived(() => {
    if ($currentToolCall) return `Running ${$currentToolCall}...`;
    if ($isStreaming) return 'Typing...';
    return '';
  });
</script>

{#if statusText}
  <div class="status-indicator">
    {statusText}
  </div>
{/if}
```

### Question Analytics

```typescript
import { structuredQuestions } from '$lib/stores/chat';

// Track question interactions
let questionMetrics: Record<string, {
  shown: number;
  answered: number;
  avgTimeToAnswer: number;
}> = {};

structuredQuestions.subscribe(questions => {
  if (questions) {
    questions.forEach(q => {
      if (!questionMetrics[q.id]) {
        questionMetrics[q.id] = {
          shown: 0,
          answered: 0,
          avgTimeToAnswer: 0,
        };
      }
      questionMetrics[q.id].shown++;
    });
  }
});
```

## Testing Examples

### Unit Test - Stream Parser

```typescript
import { describe, it, expect } from 'vitest';
import { apiClient } from '$lib/api';

describe('SSE Stream Parser', () => {
  it('should parse text events', async () => {
    const mockResponse = new Response(
      'event: text\ndata: {"content":"Hello"}\n\n',
      { status: 200 }
    );

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const events = [];
    for await (const event of apiClient.sendChatMessageStream('123', 'test')) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'text', content: 'Hello' });
  });
});
```

### Integration Test - Full Flow

```typescript
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import ChatBox from '$lib/components/ChatBox.svelte';

test('streaming message flow', async () => {
  const { getByPlaceholderText, getByText } = render(ChatBox, {
    props: { itineraryId: '123' }
  });

  const input = getByPlaceholderText('Type a message...');
  await fireEvent.input(input, { target: { value: 'Hello' } });
  await fireEvent.click(getByText('Send'));

  // Wait for streaming to start
  await waitFor(() => {
    expect(getByText(/Hello/, { exact: false })).toBeInTheDocument();
  });

  // Wait for streaming to complete
  await waitFor(() => {
    expect(getByText('Send')).not.toBeDisabled();
  });
});
```

## Best Practices

1. **Always use sendMessageStreaming()** for better UX
2. **Handle all event types** - don't assume only 'text' events
3. **Show tool indicators** - users want to know what's happening
4. **Auto-scroll intelligently** - only when user is at bottom
5. **Clear questions after answer** - prevent duplicate submissions
6. **Reload itinerary on updates** - keep UI in sync
7. **Provide visual feedback** - cursor animation, typing dots
8. **Handle errors gracefully** - show messages, allow retry
9. **Test stream interruptions** - network issues, timeouts
10. **Clean up resources** - release stream readers

## Troubleshooting

### Issue: Stream never completes
**Solution**: Check for 'done' event in backend, ensure connection stays open

### Issue: Questions not showing
**Solution**: Verify `structuredQuestions` store is set, check event parsing

### Issue: Auto-scroll not working
**Solution**: Check `messagesContainer` ref, verify scroll threshold

### Issue: Tool call stuck
**Solution**: Ensure 'tool_result' event is sent after 'tool_call'

### Issue: Itinerary not reloading
**Solution**: Check `itineraryUpdated` flag in 'done' event, verify effect

### Issue: Duplicate messages
**Solution**: Don't add message in both stream handler and store action

### Issue: Cursor not blinking
**Solution**: Check `.chatbox-cursor` CSS animation, verify streaming state

### Issue: Memory leak
**Solution**: Verify stream reader is released in finally block

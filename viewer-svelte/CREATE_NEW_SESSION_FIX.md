# Create New Itinerary - Chat Session Fix

## Problem

When clicking the "Create New" button to create a new itinerary, the chat session from the previous itinerary was retained. Users would see old messages and context from the previous trip instead of starting with a fresh, empty chat session.

## Root Cause

The `handleBuildClick()` function in `+page.svelte` was:
1. Creating a new itinerary
2. Selecting the new itinerary
3. Switching to the chat view

However, it was **NOT** clearing the chat session state. The ChatPanel component has an effect that resets chat when switching between different itineraries, but this didn't trigger when creating a brand new itinerary because:
- There was no "previous itinerary" to compare against initially
- The chat state (messages, session ID, pending prompts) persisted across itinerary creation

## Solution

Added a call to `resetChat()` before selecting the newly created itinerary in `handleBuildClick()`.

### Code Changes

**File**: `viewer-svelte/src/routes/itineraries/+page.svelte`

```typescript
// Added imports
import {
  pendingPrompt,
  chatMessages,
  chatSessionId,
  isStreaming,
  resetChat  // ← Added this
} from '$lib/stores/chat';

// Modified handleBuildClick()
async function handleBuildClick() {
  try {
    const newItinerary = await createItinerary({
      title: 'New Itinerary',
      description: '',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // ✨ NEW: Clear the chat session completely before selecting
    resetChat();

    selectItinerary(newItinerary.id);
    leftPaneTab = 'chat';
    mainView = 'new-trip-helper';
  } catch (error) {
    console.error('Failed to create itinerary:', error);
    alert(error instanceof Error ? error.message : 'Failed to create new itinerary.');
  }
}
```

### What `resetChat()` Does

The `resetChat()` function (from `chat.ts`) clears all chat-related state:

```typescript
export function resetChat(): void {
  chatSessionId.set(null);          // Clear session ID
  chatMessages.set([]);             // Clear all messages
  chatLoading.set(false);
  chatError.set(null);
  structuredQuestions.set(null);    // Clear any pending questions
  streamingContent.set('');
  isStreaming.set(false);
  currentToolCall.set(null);
  itineraryUpdated.set(false);
  sessionTokens.set({ input: 0, output: 0, total: 0 });
  sessionCost.set({ input: 0, output: 0, total: 0 });
  pendingPrompt.set(null);          // Clear any pending prompts
}
```

## User Flow After Fix

1. User clicks **"Create New"** button
2. `resetChat()` clears all previous chat state
3. New itinerary is created and selected
4. ChatPanel switches to empty state with welcome message
5. `ChatPanel.onMount` creates a fresh session for the new itinerary
6. Initial context is sent with new itinerary details
7. User starts conversation with a clean slate

## Testing

### Manual Test
1. Create an itinerary and start a conversation
2. Click "Create New" button
3. Verify:
   - Chat panel shows empty state
   - No messages from previous itinerary
   - New session is created when you send first message
   - Context is fresh for the new trip

### Automated Test
Run: `node test-create-new-session-fix.mjs`

This test verifies that:
- resetChat() properly clears session state
- New itinerary gets fresh session
- No data leaks between conversations

## Related Files

- `viewer-svelte/src/routes/itineraries/+page.svelte` - Main page with "Create New" button
- `viewer-svelte/src/lib/stores/chat.ts` - Chat state management with `resetChat()`
- `viewer-svelte/src/lib/components/ChatPanel.svelte` - Chat UI component

## Impact

- **Before**: Clicking "Create New" kept old chat messages, causing confusion
- **After**: Each new itinerary starts with a fresh, empty chat session
- **Side effects**: None - this is a pure improvement to session management

## LOC Delta

- Added: 3 lines (import + resetChat() call + comment)
- Removed: 0 lines
- Net Change: +3 lines
- Phase: Bug Fix

---

**Status**: ✅ Complete
**Date**: 2025-12-23

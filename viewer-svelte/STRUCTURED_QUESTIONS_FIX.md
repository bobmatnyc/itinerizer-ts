# Structured Questions Flash/Disappear Bug Fix

## Problem

Structured questions (button choices) in the Trip Designer chat were flashing briefly and then disappearing. The server was correctly sending the data, but the UI wasn't persisting it.

## Root Cause

The `structuredQuestions` store in `/viewer-svelte/src/lib/stores/chat.ts` was being cleared prematurely at the start of every message send operation.

### Original Flow (Buggy)

1. User sends message → `sendMessageStreaming()` called
2. **Line 185**: `structuredQuestions.set(null)` - **Cleared immediately**
3. Stream starts, events arrive
4. `structured_questions` event → Questions are set
5. Questions appear briefly in UI
6. Any subsequent state change or re-render → Questions disappear

### Why This Happened

The clearing logic was too aggressive:
- Questions were cleared at the **start** of every message send
- This meant existing questions would be cleared even if they should persist
- The only time questions were set was during the `structured_questions` event
- But if that event didn't fire (or if there was any delay), questions would remain null

## Solution

### Changes Made

Modified both `sendMessageStreaming()` and `sendContextMessage()` functions:

1. **Removed premature clearing**: Don't clear `structuredQuestions` at the start
2. **Added tracking**: Track whether new questions were received via `receivedStructuredQuestions` flag
3. **Conditional clearing**: Only clear questions in the `done` event if no new questions were received

### New Flow (Fixed)

1. User sends message → `sendMessageStreaming()` called
2. **Questions are NOT cleared immediately** - existing questions persist
3. Stream starts, events arrive
4. If `structured_questions` event arrives:
   - Questions are set
   - `receivedStructuredQuestions = true`
5. When `done` event fires:
   - Check `if (!receivedStructuredQuestions)` → Only then clear questions
   - This ensures questions persist unless explicitly replaced or cleared

## Code Changes

### `/viewer-svelte/src/lib/stores/chat.ts`

**In `sendMessageStreaming()`:**

```typescript
// BEFORE (line 185):
structuredQuestions.set(null);

// AFTER:
// Don't clear structured questions yet - wait for stream to complete
// They will be cleared only if the new response doesn't have questions

// Added tracking variable:
let receivedStructuredQuestions = false;

// In structured_questions event handler:
case 'structured_questions':
  structuredQuestions.set(event.questions);
  receivedStructuredQuestions = true;  // NEW
  break;

// In done event handler:
case 'done':
  // Clear structured questions if we didn't receive new ones
  if (!receivedStructuredQuestions) {  // NEW
    structuredQuestions.set(null);
  }
  // ... rest of done handling
```

**Same changes applied to `sendContextMessage()`**

## Testing

To verify the fix:

1. Start a Trip Designer chat session
2. Send a message that triggers structured questions (e.g., "Help me plan a trip")
3. Wait for the response with button choices
4. **Expected**: Questions should remain visible until:
   - User interacts with them (clicks a button)
   - A new response arrives without questions
5. **Bug would have caused**: Questions flash and disappear immediately

## Impact

- **No breaking changes**: Existing functionality preserved
- **Improved UX**: Structured questions now persist correctly
- **No performance impact**: Only added a boolean flag
- **Consistent behavior**: Questions clear only when appropriate

## Related Files

- `/viewer-svelte/src/lib/stores/chat.ts` - State management (MODIFIED)
- `/viewer-svelte/src/lib/components/ChatPanel.svelte` - UI rendering (NO CHANGES NEEDED)
- Server-side SSE streaming - Correctly sends events (NO CHANGES NEEDED)

## Future Improvements

Consider:
- Adding explicit logging when questions are set/cleared for debugging
- Implementing a timeout to auto-clear questions after X minutes of inactivity
- Adding visual indicators when questions are being replaced

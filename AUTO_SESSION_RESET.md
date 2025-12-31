# Automatic Session Reset on Login

## Summary
Implemented automatic Trip Designer session reset when users log in to ensure they always start with a fresh conversation.

## Changes

### File: `viewer-svelte/src/routes/login/+page.svelte`

**Import added (line 6):**
```typescript
import { resetChat } from '$lib/stores/chat';
```

**Session reset added (line 51):**
```typescript
// IMPORTANT: Clear any cached itinerary data and chat session
// This ensures the list refreshes with the new user's itineraries
// and they start with a fresh Trip Designer session
resetChat();
```

## How It Works

1. User submits login credentials
2. After successful authentication, the login handler:
   - Sets authentication state
   - **Calls `resetChat()`** to clear all session data
   - Redirects to appropriate page

3. The `resetChat()` function (from `chat.ts`) clears:
   - Session ID
   - Chat messages
   - Streaming state
   - Structured questions
   - Token/cost tracking
   - Loading/error states

## Benefits

- **Clean slate**: Every login starts with no previous session data
- **User separation**: Prevents session leakage between different users
- **Fresh start**: No confusion from old conversations
- **Minimal change**: Single function call, leverages existing infrastructure

## Testing

Build verified successfully with no TypeScript errors.

To test:
1. Log in as a user
2. Verify no old session ID exists in chat store
3. Send first message - should create new session
4. Log out and log in again
5. Verify session was reset (no previous messages)

## LOC Delta
- **Added**: 2 lines (1 import, 1 function call)
- **Modified**: 1 comment block
- **Net Change**: +2 lines

This minimal implementation achieves the requirement without adding complexity.

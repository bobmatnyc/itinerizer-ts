# Session Cleanup Implementation

## Problem
Chat sessions were not being deleted when:
1. User switched between itineraries
2. Itineraries were deleted

This caused sessions to accumulate in memory with stale/incorrect context, leading to the "cached context bug" where the agent would reference data from a different itinerary.

## Solution
Implemented comprehensive session cleanup at multiple levels:

### 1. Storage Layer (`src/services/trip-designer/session.ts`)

**Added `deleteByItineraryId()` to `InMemorySessionStorage`:**
```typescript
deleteByItineraryId(itineraryId: ItineraryId): void {
  for (const [sessionId, session] of this.sessions) {
    if (session.itineraryId === itineraryId) {
      this.sessions.delete(sessionId);
    }
  }
}
```

**Added `deleteByItineraryId()` to `SessionManager`:**
```typescript
deleteByItineraryId(itineraryId: ItineraryId): void {
  // Remove from active sessions
  for (const [sessionId, session] of this.activeSessions.entries()) {
    if (session.itineraryId === itineraryId) {
      this.activeSessions.delete(sessionId);
    }
  }

  // Delete from storage
  if ('deleteByItineraryId' in this.storage) {
    (this.storage as InMemorySessionStorage).deleteByItineraryId(itineraryId);
  }
}
```

### 2. Service Layer (`src/services/trip-designer/trip-designer.service.ts`)

**Exposed session deletion methods:**
```typescript
async deleteSession(sessionId: SessionId): Promise<Result<void, StorageError>> {
  return this.sessionManager.deleteSession(sessionId);
}

deleteSessionsByItineraryId(itineraryId: ItineraryId): void {
  this.sessionManager.deleteByItineraryId(itineraryId);
}
```

### 3. API Endpoint (`viewer-svelte/src/routes/api/v1/designer/sessions/[sessionId]/+server.ts`)

**Updated DELETE handler to actually delete sessions:**
```typescript
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
  const sessionId = params.sessionId as SessionId;
  const deleteResult = await tripDesignerService.deleteSession(sessionId);

  if (!deleteResult.success) {
    // If session not found, still return success (idempotent delete)
    if (deleteResult.error.code === 'NOT_FOUND') {
      return new Response(null, { status: 204 });
    }
    throw error(500, { message: `Failed to delete session: ${deleteResult.error.message}` });
  }

  return new Response(null, { status: 204 });
};
```

### 4. Itinerary Deletion (`viewer-svelte/src/routes/api/v1/itineraries/[id]/+server.ts`)

**Added automatic session cleanup when itinerary is deleted:**
```typescript
export const DELETE: RequestHandler = async ({ params, locals }) => {
  // ... ownership verification ...

  const result = await collectionService.deleteItinerary(id);

  // Clean up any associated chat sessions to prevent orphaned sessions with stale context
  if (tripDesignerService) {
    tripDesignerService.deleteSessionsByItineraryId(id);
  }

  return new Response(null, { status: 204 });
};
```

### 5. Frontend API Client (`viewer-svelte/src/lib/api.ts`)

**Added `deleteChatSession()` method:**
```typescript
async deleteChatSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${API_V1.DESIGNER.SESSIONS}/${sessionId}`, {
    method: 'DELETE',
    headers: getAIHeaders(),
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete session: ${response.status} ${response.statusText}`);
  }
}
```

### 6. Frontend Chat Store (`viewer-svelte/src/lib/stores/chat.svelte.ts`)

**Added session deletion support:**
```typescript
async deleteSession(sessionId: string): Promise<void> {
  try {
    await apiClient.deleteChatSession(sessionId);
  } catch (error) {
    console.warn('Failed to delete session:', error);
    // Don't throw - session deletion is cleanup, not critical
  }
}

reset(deleteBackendSession = false): void {
  const currentSessionId = get(this.sessionId);

  // Delete backend session if requested and we have a session ID
  if (deleteBackendSession && currentSessionId) {
    this.deleteSession(currentSessionId).catch(err =>
      console.warn('Failed to delete session during reset:', err)
    );
  }

  // ... reset all state ...
}
```

**Exported helper functions:**
```typescript
export function resetChat(deleteBackendSession = false): void {
  chatStore.reset(deleteBackendSession);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await chatStore.deleteSession(sessionId);
}
```

### 7. ChatPanel Component (`viewer-svelte/src/lib/components/ChatPanel.svelte`)

**Updated to delete old session when switching itineraries:**
```typescript
$effect(() => {
  if (agent.mode === 'trip-designer' && itineraryId && previousItineraryId && itineraryId !== previousItineraryId) {
    // ... API key check ...

    // CRITICAL: Clear old session state completely AND delete backend session
    // This ensures NO cached context from previous trip leaks into new session
    // The deleteBackendSession=true parameter ensures orphaned sessions don't accumulate
    resetChat(true);

    // Clear visualization history when switching itineraries
    visualizationStore.clearHistory();

    // Create new session for current itinerary
    createChatSession(itineraryId, agent.mode).then(() => {
      previousItineraryId = itineraryId;
      sendInitialContext();
    });
  }
});
```

## Key Benefits

1. **Prevents Context Leakage**: Sessions are immediately deleted when switching itineraries, preventing stale context from being reused
2. **Memory Cleanup**: Orphaned sessions are cleaned up when itineraries are deleted
3. **Idempotent Deletes**: DELETE endpoint returns success even if session not found (safe to call multiple times)
4. **Async Non-Blocking**: Frontend session deletion is fire-and-forget (doesn't block UI)
5. **Multiple Cleanup Paths**:
   - Frontend triggers cleanup when user switches itineraries
   - Backend triggers cleanup when itinerary is deleted
   - Both active sessions (in-memory) and storage are cleaned up

## Testing Recommendations

1. **Switch Itineraries**: Open chat for itinerary A, then switch to itinerary B - verify no context leakage
2. **Delete Itinerary**: Create chat session for itinerary, then delete itinerary - verify session is cleaned up
3. **Multiple Sessions**: Create multiple sessions, verify they're all cleaned up properly
4. **Network Failure**: Test session cleanup when backend is unreachable (should fail gracefully)

## LOC Delta

- **Added**: ~90 lines (session cleanup logic, API endpoints, frontend integration)
- **Modified**: ~15 lines (existing methods updated)
- **Deleted**: 0 lines
- **Net Change**: +105 lines

## Files Modified

1. `src/services/trip-designer/session.ts` - Added deleteByItineraryId methods
2. `src/services/trip-designer/trip-designer.service.ts` - Exposed session deletion
3. `viewer-svelte/src/routes/api/v1/designer/sessions/[sessionId]/+server.ts` - Implemented DELETE
4. `viewer-svelte/src/routes/api/v1/itineraries/[id]/+server.ts` - Added cleanup on delete
5. `viewer-svelte/src/lib/api.ts` - Added deleteChatSession client method
6. `viewer-svelte/src/lib/stores/chat.svelte.ts` - Added session deletion support
7. `viewer-svelte/src/lib/components/ChatPanel.svelte` - Trigger cleanup on itinerary change

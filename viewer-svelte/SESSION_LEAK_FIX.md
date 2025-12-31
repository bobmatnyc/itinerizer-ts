# Session Leak Bug Fix

## Problem
When a trip is deleted and a new one created, the agent remembers the previous trip's dates and context, even though the frontend resets the chat session.

## Root Cause
1. **Backend Session Caching**: `InMemorySessionStorage` stores sessions in a Map that persists across HTTP requests
2. **No Cleanup on Itinerary Delete**: When an itinerary is deleted, associated sessions are NOT deleted
3. **Context Injection**: Initial context (dates, destinations) is injected into `session.messages[]` on creation
4. **Session Reuse**: Even though frontend creates a "new" session, the backend may reference old cached sessions

## Evidence Trail

### Frontend (ChatPanel.svelte)
```typescript
// Lines 185-209: This correctly resets frontend state
resetChat(); // Clears sessionId, messages, everything
createChatSession(itineraryId, agent.mode).then(() => {
  // Creates NEW session
  sendInitialContext(); // Sends fresh context
});
```

### Frontend Store (chat.svelte.ts)
```typescript
// Lines 475-489: reset() clears ALL state
reset(): void {
  this.sessionId.set(null);
  this.messages.set([]);
  this.sessionTokens.set({ input: 0, output: 0, total: 0 });
  // ... everything cleared
}
```

### Backend Session Storage (session.ts)
```typescript
// Lines 40-94: InMemorySessionStorage
export class InMemorySessionStorage implements SessionStorage {
  private sessions = new Map<SessionId, TripDesignerSession>(); // <-- PERSISTS!

  async save(session: TripDesignerSession): Promise<Result<void, StorageError>> {
    this.sessions.set(session.id, session); // <-- CACHED FOREVER
    return ok(undefined);
  }
}
```

### Backend Service (trip-designer.service.ts)
```typescript
// Lines 188-234: createSession() injects initial context
async createSession(itineraryId?: ItineraryId, mode: 'trip-designer' | 'help' = 'trip-designer') {
  // ... create session

  // Check if itinerary has content
  if (hasContent) {
    const contextMessage = `The user is working on an existing itinerary...

${summary}  // <-- INCLUDES DATES, DESTINATIONS, EVERYTHING

Important: Since the itinerary already has content, skip any questions...`;

    await this.sessionManager.addMessage(session.id, {
      role: 'system',
      content: contextMessage, // <-- THIS IS CACHED IN session.messages[]
    });
  }
}
```

## Solution Options

### Option 1: Delete Sessions on Itinerary Delete (Recommended)
When an itinerary is deleted, cascade delete all associated sessions.

**Implementation:**
1. Add `deleteByItineraryId(itineraryId)` to SessionStorage interface
2. Call it in itinerary DELETE endpoint

**Pros:**
- Clean, proper lifecycle management
- No orphaned sessions
- Prevents memory leaks

**Cons:**
- Requires API endpoint changes

### Option 2: Session ID Scoping by Itinerary
Include itinerary ID in session lookup to prevent cross-contamination.

**Implementation:**
1. When creating session, check if old sessions exist for different itinerary
2. Delete or ignore old sessions

**Pros:**
- Prevents cross-trip contamination
- No API changes needed

**Cons:**
- Doesn't solve memory leak
- More complex logic

### Option 3: Frontend Forces New Session on Itinerary Switch
Frontend explicitly deletes old session before creating new one.

**Implementation:**
1. Add DELETE /api/v1/designer/sessions/:id endpoint
2. Frontend calls delete before create

**Pros:**
- Simple, explicit cleanup
- Frontend controls lifecycle

**Cons:**
- Extra API call
- Coordination complexity

## Recommended Fix: Option 1 + Option 3

### Step 1: Add Session Cleanup to InMemorySessionStorage
```typescript
// In session.ts
export class InMemorySessionStorage implements SessionStorage {
  private sessions = new Map<SessionId, TripDesignerSession>();

  async deleteByItineraryId(itineraryId: ItineraryId): Promise<Result<void, StorageError>> {
    let deletedCount = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.itineraryId === itineraryId) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }
    return ok(undefined);
  }
}
```

### Step 2: Clean Up Sessions on Itinerary Delete
```typescript
// In routes/api/v1/itineraries/[id]/+server.ts DELETE handler
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const { itineraryService, tripDesignerService } = locals.services;
  const { id } = params;

  // Delete associated sessions FIRST
  if (tripDesignerService) {
    await tripDesignerService.deleteSessionsByItinerary(id as ItineraryId);
  }

  // Then delete itinerary
  const result = await itineraryService.delete(id as ItineraryId);
  // ...
};
```

### Step 3: Add Session Delete Endpoint
```typescript
// In routes/api/v1/designer/sessions/[id]/+server.ts
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const { tripDesignerService } = locals.services;
  const { id } = params;

  const result = await tripDesignerService.deleteSession(id as SessionId);
  if (!result.success) {
    throw error(404, { message: 'Session not found' });
  }

  return json({ success: true });
};
```

### Step 4: Frontend Cleanup on Session Reset
```typescript
// In ChatPanel.svelte effect
$effect(() => {
  if (agent.mode === 'trip-designer' && itineraryId && previousItineraryId && itineraryId !== previousItineraryId) {
    // DELETE old session BEFORE creating new one
    if ($chatSessionId) {
      apiClient.deleteChatSession($chatSessionId).catch(console.warn);
    }

    resetChat();
    createChatSession(itineraryId, agent.mode).then(() => {
      previousItineraryId = itineraryId;
      sendInitialContext();
    });
  }
});
```

## Testing Checklist
- [ ] Create Trip A with dates Dec 22-30
- [ ] Chat with agent → Agent mentions Dec 22-30
- [ ] Delete Trip A
- [ ] Create NEW Trip B (blank)
- [ ] Open chat → Agent should NOT mention Dec 22-30
- [ ] Agent should ask about dates (blank state)

## Files to Modify
1. `/src/services/trip-designer/session.ts` - Add deleteByItineraryId
2. `/src/services/trip-designer/trip-designer.service.ts` - Add deleteSessionsByItinerary
3. `/viewer-svelte/src/routes/api/v1/designer/sessions/[id]/+server.ts` - DELETE endpoint
4. `/viewer-svelte/src/routes/api/v1/itineraries/[id]/+server.ts` - Cascade delete sessions
5. `/viewer-svelte/src/lib/components/ChatPanel.svelte` - Delete old session on reset
6. `/viewer-svelte/src/lib/api.ts` - Add deleteChatSession method

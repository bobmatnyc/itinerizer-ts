# Test Plan: HMR Session Persistence

## Objective
Verify that Trip Designer sessions survive HMR reloads in development.

## Prerequisites
- SvelteKit dev server running (`npm run dev` in viewer-svelte/)
- OpenRouter API key configured
- User logged in

## Test Steps

### Test 1: Basic HMR Session Persistence

1. **Start a chat session**:
   - Navigate to Trip Designer
   - Send first message: "I want to plan a trip to Paris"
   - Wait for response
   - Note the session ID in the URL: `/designer/{sessionId}`

2. **Trigger HMR**:
   - Open `viewer-svelte/src/hooks.server.ts`
   - Add a comment or space (any change)
   - Save the file
   - Watch console for: `[HMR] Clearing TripDesigner service cache (sessions preserved)`

3. **Continue conversation**:
   - Send another message in the same chat: "What should I see in 3 days?"
   - **Expected**: Response received successfully
   - **Previous bug**: "Session not found" error

4. **Verify session state**:
   - Check that conversation history is intact
   - Check that previous messages are still visible
   - Check that context is preserved

### Test 2: Multiple Sessions

1. **Create multiple sessions**:
   - Open Session 1: "Trip to Paris"
   - Open Session 2: "Trip to Tokyo"
   - Send messages in both

2. **Trigger HMR** (save hooks.server.ts)

3. **Switch between sessions**:
   - Go to Session 1, send message
   - Go to Session 2, send message
   - **Expected**: Both sessions work correctly

### Test 3: API Key Change

1. **Start session with API key A**:
   - Set API key in Profile
   - Start chat session
   - Send message

2. **Change API key to B**:
   - Update API key in Profile
   - **Note**: This will create a NEW TripDesignerService

3. **Try to continue old session**:
   - **Expected**: Session still works (uses global storage)
   - **Previous bug**: Session lost because new service = new storage

### Test 4: Dev Server Restart

1. **Start session**:
   - Create chat session
   - Send several messages

2. **Restart dev server**:
   - Stop server (Ctrl+C)
   - Start server (`npm run dev`)

3. **Try to access old session**:
   - **Expected**: Session not found (this is correct behavior)
   - **Reason**: Sessions are in-memory, not persisted to disk
   - **Note**: This is intentional - sessions are ephemeral

## Console Output to Watch

### Successful HMR (sessions preserved)
```
[HMR] Clearing TripDesigner service cache (sessions preserved)
[vite] page reload viewer-svelte/src/hooks.server.ts
Initializing services...
Using cached services instance
Request: POST /api/v1/designer/sessions/{sessionId}/messages/stream
[createTripDesignerWithKey] Creating new TripDesignerService for API key
✅ Global session storage initialized (createTripDesignerWithKey)
[chatStream] Calling LLM for session {sessionId}, model: anthropic/claude-sonnet-4
```

### Failed HMR (old bug - session lost)
```
[HMR] Clearing TripDesigner cache
[vite] page reload viewer-svelte/src/hooks.server.ts
Initializing services...
Request: POST /api/v1/designer/sessions/{sessionId}/messages/stream
[createTripDesignerWithKey] Creating new TripDesignerService for API key
Error: Session not found ❌
```

## Success Criteria

- ✅ Sessions survive HMR reloads
- ✅ Multiple sessions coexist
- ✅ Sessions work across API key changes
- ✅ Console shows "sessions preserved" message
- ✅ No "Session not found" errors after HMR

## Known Limitations

- Sessions do NOT survive server restarts (by design)
- Sessions are in-memory only
- Sessions are shared globally (all users see all sessions in dev)
  - This is fine for development
  - Production would need user-scoped session storage

## Future Enhancements

If session persistence across restarts is needed:
1. Implement `FileSessionStorage`
2. Store sessions in `./data/sessions/`
3. Load sessions on startup
4. Expire old sessions (> 24h)

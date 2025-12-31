# Session Not Found - Fix Summary

## Problem
Users were experiencing "Session not found" errors when sending messages to the Trip Designer chat after creating a session.

## Root Cause
The `createTripDesignerWithKey()` function in `hooks.server.ts` was creating a **new TripDesignerService instance** for each request when using a custom API key (via `X-OpenRouter-API-Key` header).

Each TripDesignerService instance has its own `SessionManager` with an independent in-memory `Map` of sessions.

**Flow that caused the bug:**
1. **POST /api/v1/designer/sessions**
   - Creates TripDesignerService instance #1
   - SessionManager #1 stores the new session
   - Returns session ID to client

2. **POST /api/v1/designer/sessions/{id}/messages/stream**
   - Creates TripDesignerService instance #2 (NEW instance!)
   - SessionManager #2 has an empty sessions Map
   - Looks up session → Not found!
   - Returns error: "Session not found"

## Solution
Implemented a **module-level cache** for TripDesignerService instances keyed by API key.

### Changes Made
In `viewer-svelte/src/hooks.server.ts`:

1. **Added module-level cache:**
```typescript
/**
 * Cache for TripDesignerService instances keyed by API key
 * Ensures session persistence across requests with the same API key
 */
const tripDesignerCache = new Map<string, TripDesignerService>();
```

2. **Modified `createTripDesignerWithKey()` to use cache:**
```typescript
export async function createTripDesignerWithKey(
  apiKey: string,
  services: Services
): Promise<TripDesignerService> {
  // Check cache first - reuse existing service instance to preserve sessions
  const cached = tripDesignerCache.get(apiKey);
  if (cached) {
    console.log('[createTripDesignerWithKey] Using cached TripDesignerService for API key');
    return cached;
  }

  console.log('[createTripDesignerWithKey] Creating new TripDesignerService for API key');
  // ... create service ...

  // Cache the service instance to preserve SessionManager across requests
  tripDesignerCache.set(apiKey, service);

  return service;
}
```

## Benefits
✅ Sessions persist across requests with the same API key
✅ No "Session not found" errors
✅ Performance improvement (reuses service instances)
✅ Maintains session state in SessionManager's in-memory Map

## How It Works Now
1. **First request with API key:** Creates and caches TripDesignerService
2. **Subsequent requests with same API key:** Reuses cached service instance
3. **Same SessionManager:** All requests share the same session storage
4. **Sessions found:** Sessions created in one request are visible in all subsequent requests

## Testing
The fix can be verified by:
1. Creating a new chat session
2. Sending messages to the session
3. Verifying no "Session not found" errors occur
4. Checking server logs for cache hit messages

## Files Modified
- `viewer-svelte/src/hooks.server.ts`

## LOC Delta
- Added: 14 lines (cache declaration + comments + cache logic)
- Removed: 0 lines
- Net Change: +14 lines

## Phase
Enhancement - Bug fix for session management

# Trip Designer Session Reset Bug Analysis

## Summary
**Bug**: Session resets unexpectedly when user adds preferences like "travel as a couple"
**Root Cause**: The `loadItinerary()` function updates `selectedItineraryId`, which triggers a reactive effect in ChatPanel that resets the session
**Severity**: High - Breaks user experience and loses conversation context

## Root Cause Analysis

### The Reset Chain

1. **User adds preference** → "travel as a couple"
2. **Trip Designer updates itinerary** → Sets `itineraryUpdated = true`
3. **ChatPanel reacts to update** (line 405-418):
   ```typescript
   $effect(() => {
     if (agent.mode === 'trip-designer' && $itineraryUpdated && itineraryId) {
       showUpdatingIndicator = true;
       loadItinerary(itineraryId);  // ⚠️ THIS IS THE PROBLEM
       itineraryUpdated.set(false);
       // ... show success indicator
     }
   });
   ```

4. **`loadItinerary()` updates store** (`itineraries.svelte.ts` line 80-85):
   ```typescript
   async loadDetail(id: string): Promise<void> {
     selectedItineraryLoading.set(true);
     try {
       const data = await apiClient.getItinerary(id);
       selectedItinerary.set(data);
       selectedItineraryId.set(id);  // ⚠️ TRIGGERS NEXT EFFECT
     }
   }
   ```

5. **ChatPanel detects "itinerary change"** (line 186-235):
   ```typescript
   $effect(() => {
     if (agent.mode === 'trip-designer' && itineraryId &&
         previousItineraryId && itineraryId !== previousItineraryId) {
       // ⚠️ This effect thinks the itinerary changed!
       await resetChat(true);  // 💥 SESSION RESET
       await createChatSession(itineraryId, agent.mode);
       await sendInitialContext();
     }
   });
   ```

### Why Does This Happen?

The bug occurs because:

1. **`loadItinerary(id)` always calls `selectedItineraryId.set(id)`** - even when loading the **same** itinerary
2. **Svelte 5 effects are very sensitive** - Any store update triggers reactive effects
3. **Race condition between effects**:
   - Effect 1 (line 405): Reloads itinerary data → updates `selectedItineraryId`
   - Effect 2 (line 186): Watches for itinerary changes → sees store update → resets session

The second effect **cannot distinguish** between:
- Loading fresh data for the **same** itinerary (should NOT reset)
- Switching to a **different** itinerary (should reset)

Because `selectedItineraryId.set(id)` is called in both cases, the effect always fires.

## Files Involved

### 1. ChatPanel.svelte (lines 186-235)
**Issue**: Reactive effect resets session when `itineraryId !== previousItineraryId`

```typescript
// Reset chat when itinerary changes (trip-designer mode only)
$effect(() => {
  if (agent.mode === 'trip-designer' && itineraryId &&
      previousItineraryId && itineraryId !== previousItineraryId) {

    // This condition SHOULD prevent resets when itineraryId hasn't changed
    // BUT it fails because:
    // 1. loadItinerary() updates selectedItineraryId store
    // 2. Store update triggers Svelte reactivity
    // 3. Effect re-runs even though itineraryId prop hasn't changed

    await resetChat(true);
    await createChatSession(itineraryId, agent.mode);
    await sendInitialContext();
  }
});
```

### 2. ChatPanel.svelte (lines 405-418)
**Trigger**: Calls `loadItinerary()` after every itinerary update

```typescript
// Reload itinerary when updated (trip-designer only)
$effect(() => {
  if (agent.mode === 'trip-designer' && $itineraryUpdated && itineraryId) {
    showUpdatingIndicator = true;
    loadItinerary(itineraryId);  // Reloads same itinerary
    itineraryUpdated.set(false);
    // ...
  }
});
```

### 3. itineraries.svelte.ts (lines 80-85)
**Amplifier**: Always updates `selectedItineraryId` even when loading same itinerary

```typescript
async loadDetail(id: string): Promise<void> {
  selectedItineraryLoading.set(true);
  try {
    const data = await apiClient.getItinerary(id);
    selectedItinerary.set(data);
    selectedItineraryId.set(id);  // Always sets, even if id unchanged
  }
}
```

## Why The Guard Condition Fails

The guard condition `itineraryId !== previousItineraryId` **should** prevent unwanted resets.

**However**, it fails because of Svelte 5's reactivity model:

```typescript
// What we expect:
// - itineraryId (prop) doesn't change
// - previousItineraryId doesn't change
// - Condition is false → effect doesn't run

// What actually happens:
// - loadItinerary() updates selectedItineraryId store
// - Store update triggers reactivity system
// - Effect re-evaluates its dependencies
// - Even though the VALUES haven't changed, the store UPDATE triggers re-run
```

The issue is that **any reactive dependency update** (even with same value) can trigger effects in Svelte 5.

## Recommended Fixes

### Option 1: Remove Store Update in loadDetail (SAFEST)
**File**: `viewer-svelte/src/lib/stores/itineraries.svelte.ts`

```typescript
async loadDetail(id: string): Promise<void> {
  selectedItineraryLoading.set(true);
  try {
    const data = await apiClient.getItinerary(id);
    selectedItinerary.set(data);
    // Only update selectedItineraryId if it actually changed
    if (get(selectedItineraryId) !== id) {
      selectedItineraryId.set(id);
    }
  } catch (err) {
    console.error('Failed to load itinerary:', err);
    selectedItinerary.set(null);
  } finally {
    selectedItineraryLoading.set(false);
  }
}
```

**Pros**:
- Minimal change (2 lines)
- Prevents unnecessary store updates
- Fixes root cause
- No side effects

**Cons**:
- None

### Option 2: Add Stronger Guard in ChatPanel
**File**: `viewer-svelte/src/lib/components/ChatPanel.svelte`

```typescript
// Add a flag to prevent resets during reload operations
let isReloadingCurrentItinerary = $state(false);

// Reload itinerary when updated
$effect(() => {
  if (agent.mode === 'trip-designer' && $itineraryUpdated && itineraryId) {
    showUpdatingIndicator = true;
    isReloadingCurrentItinerary = true;  // Set flag
    loadItinerary(itineraryId);
    itineraryUpdated.set(false);

    setTimeout(() => {
      showUpdatingIndicator = false;
      showUpdateSuccess = true;
      isReloadingCurrentItinerary = false;  // Clear flag after reload
    }, 1000);
  }
});

// Reset chat when itinerary changes - now with reload guard
$effect(() => {
  if (agent.mode === 'trip-designer' && itineraryId &&
      previousItineraryId && itineraryId !== previousItineraryId &&
      !isReloadingCurrentItinerary) {  // Don't reset during reloads

    await resetChat(true);
    await createChatSession(itineraryId, agent.mode);
    await sendInitialContext();
  }
});
```

**Pros**:
- Explicitly prevents resets during reload operations
- Clear intent in code

**Cons**:
- More complex (adds state variable)
- Timing-dependent (relies on setTimeout)
- Doesn't fix root cause

### Option 3: Use untrack() for Reload Effect
**File**: `viewer-svelte/src/lib/components/ChatPanel.svelte`

```typescript
import { untrack } from 'svelte';

// Reload itinerary when updated
$effect(() => {
  if (agent.mode === 'trip-designer' && $itineraryUpdated && itineraryId) {
    showUpdatingIndicator = true;

    // Use untrack to prevent triggering other effects
    untrack(() => loadItinerary(itineraryId));

    itineraryUpdated.set(false);
    // ...
  }
});
```

**Pros**:
- Uses Svelte 5's built-in solution for this problem
- Clean and intentional

**Cons**:
- May have other unintended side effects
- Still doesn't fix root cause

## Recommendation

**Use Option 1** (conditional update in loadDetail) because:

1. **Fixes root cause**: Prevents unnecessary store updates
2. **Simple**: Only 2 lines of code
3. **Safe**: No timing issues or complex state management
4. **Performance**: Reduces unnecessary reactivity
5. **Best practice**: Stores should only update when values actually change

## Testing Checklist

After implementing the fix:

- [ ] Start a trip designer session
- [ ] Add preference "travel as a couple"
- [ ] Verify session is NOT reset (messages remain visible)
- [ ] Verify itinerary IS updated with preference
- [ ] Switch to different itinerary
- [ ] Verify session IS reset (fresh conversation)
- [ ] Go back to original itinerary
- [ ] Verify session IS reset (not cached from before)

## Additional Notes

### Why Auto-Reset on Login is Different

The `AUTO_SESSION_RESET.md` file describes intentional session reset on login. This is **correct behavior** because:

1. **User context change**: Different user should get fresh session
2. **Security**: Prevents session leakage between users
3. **Explicit event**: Login is a clear "new session" trigger

The bug we're fixing is **unintentional reset** during normal conversation flow within the same session.

### Related Issues

This bug affects any interaction that updates the itinerary:
- Adding preferences/travelers
- Modifying segments (flights, hotels, activities)
- Updating trip metadata
- Any tool call that modifies itinerary data

All of these trigger the same `itineraryUpdated` → `loadItinerary()` → store update → session reset chain.

# Checklist View Switch Fix

## Problem
When users clicked on checklist items (e.g., "📍 Destination", "🗓️ Travel Dates") to start trip planning, the main pane would remain on the helper/welcome screen instead of switching to the itinerary detail view where they could see the itinerary being built in real-time.

## Root Cause
The `handleQuickPrompt` function was relying on the auto-switch effects to change views, but these effects only triggered when there was chat activity (`chatMessages.length > 0 || isStreaming`). Since checklist clicks set a `pendingPrompt` that hasn't been sent yet, there were no messages to trigger the auto-switch.

Additionally, when there was an existing itinerary, the function would check if it had content and switch to helper view for empty itineraries - but users wanted to see the detail view immediately to watch the itinerary being populated.

## Solution
Modified `handleQuickPrompt` to explicitly call `navigationStore.goToItineraryDetail()` after creating or selecting an itinerary, regardless of whether it has content.

### Code Changes

**File**: `viewer-svelte/src/routes/itineraries/+page.svelte`

**Before**:
```typescript
async function handleQuickPrompt(prompt: string) {
  pendingPrompt.set(prompt);

  if (!$selectedItinerary) {
    await handleBuildClick();
  } else {
    const hasContent = hasItineraryContent($selectedItinerary);
    navigationStore.goToItinerary(hasContent); // Would show helper for empty
  }
}
```

**After**:
```typescript
async function handleQuickPrompt(prompt: string) {
  pendingPrompt.set(prompt);

  if (!$selectedItinerary) {
    await handleBuildClick();
  }

  // Always switch to itinerary detail view when using quick prompts
  // This shows the itinerary being built in real-time
  navigationStore.goToItineraryDetail();
}
```

## Impact
- ✅ Main pane now switches to itinerary-detail view immediately after checklist click
- ✅ Users can see the itinerary being populated in real-time as Trip Designer responds
- ✅ Better UX - no confusing stay on helper screen when planning starts
- ✅ Works for both home view and new-trip-helper view checklist items
- ✅ Works whether creating new itinerary or using existing one

## Testing
See `viewer-svelte/TEST_CHECKLIST_VIEW_SWITCH.md` for detailed test plan.

### Quick Test
1. Start dev server: `cd viewer-svelte && npm run dev`
2. Open http://localhost:5176
3. Click any checklist item (e.g., "📍 Destination")
4. Verify main pane shows itinerary detail view (not helper screen)
5. Verify chat panel is active with Trip Designer

## LOC Delta
- Added: 3 lines (comment + navigation call)
- Removed: 4 lines (conditional navigation logic)
- Net Change: -1 line ✅

## Related Files
- `viewer-svelte/src/lib/stores/navigation.svelte.ts` - Navigation store with `goToItineraryDetail()`
- `viewer-svelte/src/lib/components/HomeView.svelte` - Home view with checklist
- `viewer-svelte/src/lib/components/NewTripHelperView.svelte` - Helper view with checklist
- `viewer-svelte/src/lib/components/MainPane.svelte` - Main pane that switches views

## Notes
- The auto-switch effects (lines 125-159) remain in place for other scenarios (e.g., when chat activity starts from manual input)
- This change only affects the flow when users click checklist items
- The `handleBuildClick()` function still calls `navigationStore.goToItinerary(false)` but this is now overridden by the explicit call to `goToItineraryDetail()`

# View Switch Fix Summary

## Problem
When the AI responded with "I'll update the itinerary with the destination" (triggering an `update_itinerary` tool call), the view stayed on `NewTripHelperView` instead of switching to the itinerary detail view.

## Root Cause
The view switching logic only checked for **segments** but didn't check for **destinations** or **dates**. When the AI updated the itinerary metadata (destination, dates, title), the view remained on the helper because there were no segments yet.

## Solution
Updated the view switching logic to detect when the itinerary has **meaningful content**:

### New Helper Function
```typescript
function hasItineraryContent(itinerary: Itinerary | null): boolean {
  if (!itinerary) return false;
  const hasSegments = itinerary.segments && itinerary.segments.length > 0;
  const hasDestinations = itinerary.destinations && itinerary.destinations.length > 0;
  const hasDates = !!(itinerary.startDate || itinerary.endDate); // !! converts to boolean
  return hasSegments || hasDestinations || hasDates;
}
```

### Updated Locations
1. **Auto-switch on home view** (line 162-183): When chat activity starts, check for content
2. **Auto-switch from helper view** (line 185-196): When content is added, switch to detail view
3. **Handle quick prompt** (line 232-245): Determine initial view based on content

## Changes Made

### `/viewer-svelte/src/routes/itineraries/+page.svelte`

**Added:**
- Import `Itinerary` type from `$lib/types`
- `hasItineraryContent()` helper function (line 146-153)

**Modified:**
- Auto-switch effect (line 162-183): Uses `hasItineraryContent()` instead of just checking segments
- Helper-to-detail switch effect (line 185-196): Uses `hasItineraryContent()`
- `handleQuickPrompt()` function (line 232-245): Uses `hasItineraryContent()`

## Testing

### Expected Behavior
1. **User creates new itinerary** → Starts on `NewTripHelperView` (empty itinerary)
2. **User asks: "Plan a trip to Paris"** → AI responds with destination update
3. **Destination is set** → View automatically switches to `ItineraryDetail`
4. **User continues chatting** → Stays on `ItineraryDetail` view

### Test Scenario
```typescript
// Before fix: View stays on NewTripHelperView even after destination is set
itinerary = {
  id: '123',
  title: 'Paris Trip',
  destinations: [{ name: 'Paris', city: 'Paris', country: 'France' }],
  segments: [], // No segments yet
  startDate: '2024-06-01',
  endDate: '2024-06-07'
}
// Expected: Should switch to ItineraryDetail (NOW WORKS!)

// After fix: View switches to ItineraryDetail as soon as destinations or dates are set
```

## Benefits
1. **Better UX**: View switches as soon as AI starts planning (not just when segments are added)
2. **More responsive**: Detects metadata updates (destination, dates) in addition to segments
3. **Cleaner code**: Single helper function used in 3 places (DRY principle)
4. **Type-safe**: Uses proper `Itinerary` type with TypeScript

## LOC Delta
- **Added**: 10 lines (helper function + import)
- **Modified**: 15 lines (refactored 3 locations)
- **Net Change**: +10 lines
- **Rationale**: Adds essential feature detection logic with better UX

## Related Files
- `/viewer-svelte/src/routes/itineraries/+page.svelte` - Main view switching logic
- `/viewer-svelte/src/lib/types.ts` - Type definitions (Itinerary type)
- `/viewer-svelte/src/lib/stores/itineraries.ts` - Itinerary store

# Checklist View Switch Fix - Test Plan

## Issue Fixed
Main pane now switches to itinerary-detail view when trip planning starts from checklist items.

## Changes Made
**File**: `viewer-svelte/src/routes/itineraries/+page.svelte`

**Change**: Modified `handleQuickPrompt` function to always switch to itinerary-detail view after creating/selecting itinerary.

```typescript
// OLD: Used goToItinerary() which switches based on content
if (!$selectedItinerary) {
  await handleBuildClick();
} else {
  const hasContent = hasItineraryContent($selectedItinerary);
  navigationStore.goToItinerary(hasContent);
}

// NEW: Always switch to itinerary-detail view
if (!$selectedItinerary) {
  await handleBuildClick();
}
navigationStore.goToItineraryDetail();
```

## Test Scenarios

### Scenario 1: New User (No Itineraries)
1. Open app (no itineraries exist)
2. See home view with "Let's Plan Your Trip!" checklist
3. Click "📍 Destination" checklist item
4. **Expected**: Main pane switches to itinerary-detail view (empty itinerary)
5. **Expected**: Chat panel on left shows Trip Designer waiting for input
6. **Expected**: Prompt "Where would you like to go?" is sent automatically

### Scenario 2: Existing User (Has Itineraries)
1. Open app (has existing itineraries)
2. Click "Create New" button
3. See new-trip-helper view with checklist
4. Click "🗓️ Travel Dates" checklist item
5. **Expected**: Main pane switches to itinerary-detail view
6. **Expected**: Prompt "When are you traveling?" is sent automatically

### Scenario 3: From Home View
1. Navigate to home view
2. Click any checklist item (e.g., "✈️ Flight Details")
3. **Expected**: Main pane switches to itinerary-detail view
4. **Expected**: Chat starts with selected prompt

## Verification Steps

1. Start dev server:
   ```bash
   cd viewer-svelte
   npm run dev
   ```

2. Open browser to http://localhost:5176

3. For each scenario:
   - Check console logs for `[handleQuickPrompt] Switching to itinerary-detail view`
   - Verify main pane shows itinerary detail (not helper view)
   - Verify chat panel is visible on left
   - Verify prompt is sent to Trip Designer

## Expected Console Output

```
[handleQuickPrompt] 📍 START - Received prompt: Where would you like to go?
[handleQuickPrompt] Current selectedItinerary: undefined
[handleQuickPrompt] Current pendingPrompt before set: null
[handleQuickPrompt] ✅ pendingPrompt set to: Where would you like to go?
[handleQuickPrompt] No itinerary selected, creating new one...
[handleQuickPrompt] ✅ Itinerary created, selectedItinerary: <uuid>
[handleQuickPrompt] ChatPanel should mount and pick up pendingPrompt
[handleQuickPrompt] Switching to itinerary-detail view
[handleQuickPrompt] 📍 END - pendingPrompt should still be: Where would you like to go?
```

## Success Criteria

- ✅ Main pane switches to itinerary-detail view immediately after checklist click
- ✅ Chat panel is visible and active
- ✅ Trip Designer receives and processes the prompt
- ✅ Itinerary detail view shows the (initially empty) itinerary
- ✅ As Trip Designer adds content, it appears in real-time in the detail view

## Rollback Plan

If this causes issues, revert to previous behavior:
```typescript
// In handleQuickPrompt:
if (!$selectedItinerary) {
  await handleBuildClick();
} else {
  const hasContent = hasItineraryContent($selectedItinerary);
  navigationStore.goToItinerary(hasContent);
}
```

# Manual Test: View Switch on Destination Update

## Test Setup
1. Start the dev server: `cd viewer-svelte && npm run dev`
2. Open browser to http://localhost:5176
3. Login and navigate to itineraries

## Test Case 1: New Itinerary with Destination Update

### Steps:
1. Click "Create New" to create a blank itinerary
2. **Verify**: View shows `NewTripHelperView` (helper text and prompt suggestions)
3. In chat, type: "I want to plan a trip to Paris in June"
4. **Verify**: AI responds with something like "I'll update the itinerary with Paris as the destination"
5. **Expected**: View automatically switches to `ItineraryDetail` view
6. **Check Console**: Should see log message:
   ```
   [Auto-switch] Switching from helper to itinerary-detail (itinerary has content)
   ```

### Expected Behavior:
- ✅ View switches from `NewTripHelperView` to `ItineraryDetail` when destination is set
- ✅ User sees the itinerary detail view with Paris as destination
- ✅ Chat continues in the same session

## Test Case 2: New Itinerary with Date Update

### Steps:
1. Click "Create New" to create a blank itinerary
2. **Verify**: View shows `NewTripHelperView`
3. In chat, type: "Let's plan a trip from June 1 to June 7"
4. **Expected**: View automatically switches to `ItineraryDetail` view
5. **Verify**: Dates are shown in the detail view

## Test Case 3: Existing Itinerary with Content

### Steps:
1. Select an existing itinerary that already has destinations or dates
2. **Verify**: View shows `ItineraryDetail` view (not helper view)
3. Chat should be available for further editing

## Test Case 4: Empty Itinerary Stays on Helper

### Steps:
1. Click "Create New" to create a blank itinerary
2. **Verify**: View shows `NewTripHelperView`
3. Type a message that doesn't trigger destination/date update: "What can you help me with?"
4. **Expected**: View stays on `NewTripHelperView`

## Console Logs to Watch For:

### When switching from home to helper view:
```
[Auto-switch] Switching to new-trip-helper view (empty itinerary)
```

### When switching from helper to detail view:
```
[Auto-switch] Switching from helper to itinerary-detail (itinerary has content)
```

### When switching from home to detail view:
```
[Auto-switch] Switching to itinerary-detail view (has content)
```

## Success Criteria:
- ✅ View switches as soon as destination is set (not just when segments are added)
- ✅ View switches as soon as dates are set
- ✅ View switches as soon as segments are added
- ✅ Console logs show correct switching behavior
- ✅ No TypeScript errors in browser console
- ✅ Chat session persists across view switches

## Debugging Tips:

If the view doesn't switch:
1. Check browser console for errors
2. Look for the `[Auto-switch]` log messages
3. Inspect the itinerary object in DevTools to verify destinations/dates are set
4. Verify the effect is running (check React DevTools or console logs)

If the view switches too early:
1. Check if the helper function is detecting false positives
2. Verify the itinerary content detection logic

## Related Files:
- `/viewer-svelte/src/routes/itineraries/+page.svelte` - View switching logic
- `/viewer-svelte/src/lib/stores/itineraries.ts` - Itinerary store
- `/viewer-svelte/src/lib/types.ts` - Type definitions

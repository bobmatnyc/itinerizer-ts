# Auto-Switch to Itinerary View Feature

## Summary
Implemented automatic view switching from Home to Itinerary after the first chat message is sent and a response is received.

## Changes Made

### File: `src/routes/itineraries/+page.svelte`

**Imports:**
- Added `chatMessages` to the imports from `$lib/stores/chat`

**New Effect Block (lines 141-147):**
```typescript
// Auto-switch to itinerary view after first chat message response
$effect(() => {
  // When chat messages arrive and we're on the home view, switch to itinerary view
  if (mainView === 'home' && $chatMessages.length > 0 && $selectedItinerary) {
    mainView = 'itinerary-detail';
  }
});
```

## How It Works

1. **User sends a message**: User enters a message in the chat while on the Home view
2. **Message is processed**: The chat system processes the message via streaming API
3. **Response arrives**: When the assistant responds, the `chatMessages` store is updated
4. **View switches**: The `$effect` detects the message update and automatically switches `mainView` from `'home'` to `'itinerary-detail'`

## Conditions for Auto-Switch

The view will only switch when ALL of these conditions are met:
- Currently on the `'home'` view
- At least one chat message exists (`$chatMessages.length > 0`)
- An itinerary is selected (`$selectedItinerary` is truthy)

## User Experience

**Before:**
1. User on Home view
2. User sends chat message
3. Response arrives
4. **User still sees Home view** (manual navigation required)

**After:**
1. User on Home view
2. User sends chat message
3. Response arrives
4. **View automatically switches to Itinerary Detail** (showing the updated itinerary)

## LOC Delta

- **Added**: 9 lines (1 import update + 8 lines for effect block)
- **Removed**: 0 lines
- **Net Change**: +9 lines

## Testing Recommendations

1. Navigate to Home view
2. Create or select an itinerary
3. Send a chat message (e.g., "Add a flight to Paris")
4. Verify that after the response arrives, the view automatically switches to Itinerary Detail
5. Verify that the selected itinerary is visible in the detail view

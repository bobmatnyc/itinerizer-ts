# Trip Designer - Existing Itinerary Context

## Overview

The Trip Designer now detects when a session is started for an itinerary that already has content (segments, preferences, destinations, etc.) and automatically injects a summary of the existing itinerary into the conversation context.

This allows the AI to skip redundant discovery questions and instead focus on helping users refine, modify, or extend their existing trip.

## How It Works

### Session Creation Flow

1. **User opens chat** for an existing itinerary
2. **System checks** if itinerary has meaningful content:
   - Has segments (flights, hotels, activities, etc.)
   - Has a custom title (not "New Itinerary")
   - Has destinations specified
   - Has trip preferences set

3. **If content exists**, system:
   - Generates a concise summary using `summarizeItinerary()`
   - Injects summary as initial system message
   - AI receives context about existing trip

4. **AI responds** with awareness of existing content:
   - Acknowledges what's already planned
   - Skips questions about information in the summary
   - Offers modification/enhancement options

### Example Flow

**Itinerary**: "Portugal Couple Trip" with 24 segments, dates Jan 3-12, 2025

**System message injected**:
```
The user is working on an existing itinerary. Here's the current state:

**Trip**: Portugal Couple Trip
**Dates**: Jan 3-12, 2025 (10 days)
**Travelers**: John Doe
**Destinations**: Lisbon, Porto

**Preferences**:
- Style: moderate budget, balanced pace
- Interests: Food & Wine, History & Culture

**Segments**: 2 flights, 3 hotels, 15 activities, 4 other segments (24 total)
- Flight: Jan 3 (SFO → LIS)
- Hotel: Jan 3 (3 nights, Hotel Avenida Palace)
- Activity: Jan 4 - Pastéis de Belém Tour
  ... and 21 more segments

Important: Since the itinerary already has content, skip any questions about information that's already provided in the summary above. Instead, acknowledge what's already planned and offer to help refine, modify, or extend the itinerary.
```

**AI's first response**:
```json
{
  "message": "I see you have a 10-day Portugal trip planned from Jan 3-12, 2025, with flights, hotels, and activities already booked. What would you like me to help with?",
  "structuredQuestions": [{
    "id": "modification_type",
    "type": "single_choice",
    "question": "How can I help you with this trip?",
    "options": [
      {"id": "add_activities", "label": "Add Activities", "description": "Suggest and add more things to do"},
      {"id": "add_restaurants", "label": "Add Restaurants", "description": "Find dining recommendations"},
      {"id": "optimize_schedule", "label": "Optimize Schedule", "description": "Improve timing and flow"},
      {"id": "make_changes", "label": "Make Changes", "description": "Modify existing bookings"}
    ]
  }]
}
```

## Implementation Details

### Files Modified

1. **`src/services/trip-designer/trip-designer.service.ts`**
   - Modified `createSession()` to check for existing itinerary content
   - Injects system message with itinerary summary when content exists

2. **`src/prompts/trip-designer/system.md`**
   - Added **RULE 0**: Check for existing itinerary context first
   - Added section "Existing Itinerary Detection" with specific guidance
   - Modified discovery phase to clarify it's "for NEW itineraries only"

3. **`tests/services/trip-designer/trip-designer.service.test.ts`**
   - Added tests for existing itinerary context injection
   - Added test for blank itinerary (no context injection)

### Key Functions

#### `createSession(itineraryId: ItineraryId)`

```typescript
// Check if itinerary has meaningful content
const hasContent =
  itinerary.segments.length > 0 ||
  itinerary.title !== 'New Itinerary' ||
  (itinerary.destinations && itinerary.destinations.length > 0) ||
  (itinerary.tripPreferences && Object.keys(itinerary.tripPreferences).length > 0);

if (hasContent) {
  const summary = summarizeItinerary(itinerary);

  // Inject as initial system message
  await this.sessionManager.addMessage(session.id, {
    role: 'system',
    content: contextMessage,
  });
}
```

#### `summarizeItinerary(itinerary: Itinerary)`

Already existed in `src/services/trip-designer/itinerary-summarizer.ts`:
- Formats trip details (dates, travelers, destinations)
- Summarizes preferences (style, pace, interests)
- Counts and lists segments by type
- Shows first 8 segments with details

## Benefits

1. **Better UX**: Users aren't asked questions about information they already provided
2. **Faster workflow**: Skip discovery phase when editing existing trips
3. **Context awareness**: AI understands trip structure and can make smarter suggestions
4. **Continuity**: Conversations feel more natural when editing existing content

## Edge Cases

### Blank Itinerary
- Title is "New Itinerary"
- No segments
- No destinations
- No preferences

**Behavior**: No context injected, standard discovery flow starts

### Partially Complete Itinerary
- Has title and dates but no segments
- Or has segments but no preferences

**Behavior**: Context injected, AI acknowledges what exists and fills gaps

### Very Large Itinerary
- Many segments (50+)

**Behavior**: Summary shows first 8 segments with "... and X more segments" message

## Testing

```bash
npm test -- tests/services/trip-designer/trip-designer.service.test.ts
```

Two new tests added:
- `should inject context when itinerary has segments`
- `should NOT inject context for blank itinerary`

Both tests verify:
- Session creation succeeds
- Context message is/isn't present in session messages
- Context contains expected itinerary details

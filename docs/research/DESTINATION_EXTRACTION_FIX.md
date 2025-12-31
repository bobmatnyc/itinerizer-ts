# Destination Extraction Fix

## Problem
When importing itineraries from emails/PDFs, the `destinations` array was often empty even though flight and hotel segments contained destination information. This caused the Trip Designer AI to not know where the user was traveling.

**Example:**
- St. Maarten trip had empty `destinations: []`
- But flight segments had `destination: { name: "St. Maarten (SXM)", code: "SXM" }`
- LLM context did not include destination information

## Solution
Added fallback logic to extract destinations from segments when the destinations array is empty.

### Changes Made
**File:** `src/services/trip-designer/itinerary-summarizer.ts`

1. **New Helper Function:** `extractDestinationsFromSegments()`
   - Extracts unique destinations from flight segments (`destination` field)
   - Extracts unique locations from hotel segments (`location` field)
   - Prefers `address.city` > `name` > `code` for display
   - Returns deduplicated array of destination names

2. **Updated Functions:**
   - `summarizeItinerary()` - Main summary for context injection
   - `summarizeItineraryMinimal()` - Minimal summary for session compression
   - `summarizeItineraryForTool()` - Tool result summary

### Logic Flow
```typescript
// Destinations - try array first, then extract from segments
let destinationNames: string[] = [];
if (itinerary.destinations && itinerary.destinations.length > 0) {
  // Use destinations array if available
  destinationNames = itinerary.destinations
    .map(d => d.address?.city || d.name)
    .filter(Boolean);
} else if (itinerary.segments && itinerary.segments.length > 0) {
  // Fallback: Extract from flight/hotel segments
  destinationNames = extractDestinationsFromSegments(itinerary.segments);
}

if (destinationNames.length > 0) {
  lines.push(`**Destinations**: ${destinationNames.join(', ')}`);
}
```

## Test Results

### Test Case 1: Empty Destinations Array
**Input:** St. Maarten itinerary with `destinations: []`
**Output:**
```
**Destinations**: St. Maarten (SXM), New York, NY (JFK)
```
✅ Successfully extracted destinations from flight segments

### Test Case 2: Populated Destinations Array
**Input:** Itinerary with destinations array populated
**Output:**
```
**Destinations**: Paris, London
```
✅ Uses destinations array, doesn't extract from segments

## Benefits
1. **Better AI Context:** LLM now knows destination even when array is empty
2. **Backward Compatible:** Prefers destinations array when available
3. **Robust Extraction:** Handles both flights and hotels
4. **Deduplication:** Uses Set to avoid duplicate destination names

## Files Modified
- `src/services/trip-designer/itinerary-summarizer.ts`

## LOC Delta
- Added: 26 lines (helper function)
- Modified: 21 lines (3 functions updated)
- Net Change: +47 lines

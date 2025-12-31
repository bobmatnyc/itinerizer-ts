# Trip Designer Destination Context Bug - Executive Summary

## Problem
Trip Designer LLM responds with generic "I see you're planning a week-long trip from January 8-15" **without knowing the destination** (St. Maarten).

## Root Cause ✅ VERIFIED

The `itinerary.destinations` array is **empty** even though flight segments contain destination information.

**Example from actual data:**
```json
{
  "title": "New York Winter Getaway",
  "startDate": "2026-01-08",
  "endDate": "2026-01-15",
  "destinations": [],  // ❌ EMPTY!
  "segments": [
    {
      "type": "FLIGHT",
      "destination": { "name": "St. Maarten (SXM)", "code": "SXM" }  // ✅ Data exists here
    }
  ]
}
```

## Why This Breaks Trip Designer

1. **Session creation** calls `summarizeItinerary()`
2. **Summarizer checks**: `if (itinerary.destinations.length > 0)` → FALSE
3. **Summary generated WITHOUT destination section**
4. **System prompt** includes: dates ✅, flights ✅, travelers ✅... but NO destination ❌
5. **LLM responds** knowing WHEN but not WHERE

## The Fix (Immediate Impact)

**File**: `src/services/trip-designer/itinerary-summarizer.ts`
**Location**: Lines 270-277 (before checking destinations)

Add fallback to extract destinations from segments:

```typescript
/**
 * Extract destinations from flight/hotel segments when destinations array is empty
 */
function extractDestinationsFromSegments(segments: Segment[]): Location[] {
  const destMap = new Map<string, Location>();

  for (const seg of segments) {
    if (seg.type === 'FLIGHT') {
      const flight = seg as FlightSegment;
      if (flight.destination?.code) {
        destMap.set(flight.destination.code, {
          name: flight.destination.name,
          code: flight.destination.code,
        });
      }
    } else if (seg.type === 'HOTEL') {
      const hotel = seg as HotelSegment;
      if (hotel.location) {
        const key = hotel.location.code || hotel.location.name || '';
        if (key) destMap.set(key, hotel.location);
      }
    }
  }

  return Array.from(destMap.values());
}

// In summarizeItinerary() function:
// BEFORE line 271 "if (itinerary.destinations.length > 0)"
let destinations = itinerary.destinations;
if (destinations.length === 0 && itinerary.segments.length > 0) {
  destinations = extractDestinationsFromSegments(itinerary.segments);
}

// Then use 'destinations' instead of 'itinerary.destinations':
if (destinations.length > 0) {
  const destNames = destinations
    .map(d => d.address?.city || d.name)
    .filter(Boolean)
    .join(', ');
  lines.push(`**Destinations**: ${destNames}`);
}
```

## Expected Result After Fix

**System prompt will include:**
```
**Destinations**: St. Maarten

## Current Itinerary Context
You are editing an existing itinerary. Here's the current state:

**Trip**: New York Winter Getaway
**Dates**: Jan 8-15, 2026 (7 days)
**Destinations**: St. Maarten  ✅ NOW INCLUDED!
**Segments**: 2 flights (2 total)
- Flight: Jan 8 (JFK → SXM)
- Flight: Jan 15 (SXM → JFK)
```

**LLM will respond:**
"I see you're planning a trip to **St. Maarten** from January 8-15! How can I help you plan your week in the Caribbean?"

## Additional Recommendations

### Short-term: Update Import Service
Populate `destinations` when importing flights/hotels so future itineraries don't have this issue.

### Long-term: Auto-derive Destinations
Add utility method to ItineraryService that automatically keeps `destinations` in sync with segments.

## Files Affected

1. **src/services/trip-designer/itinerary-summarizer.ts** - Add fallback (immediate fix)
2. **src/services/import.service.ts** - Populate destinations during import
3. **src/services/itinerary.service.ts** - Add destination derivation utility

## Testing

After applying fix:
1. Open St. Maarten itinerary (1dee003d-7709-4b4e-a158-f8666b8e5d8b)
2. Start Trip Designer chat
3. LLM should greet with destination awareness: "planning a trip to St. Maarten"

---

**Impact**: HIGH - Affects all itineraries with empty `destinations` array
**Effort**: LOW - Simple fallback function
**Priority**: IMMEDIATE - Core UX issue with Trip Designer

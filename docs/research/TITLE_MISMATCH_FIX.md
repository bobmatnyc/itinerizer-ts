# Title/Destination Mismatch Detection - Bug Fix

## Problem

The title/destination mismatch detection was not working due to city name formatting issues.

**Example:**
- Itinerary title: "New York Winter Getaway"
- Flights: JFK → SXM (St. Maarten), SXM → JFK
- Expected: Mismatch detected (title mentions origin "New York" instead of destination "St. Maarten")
- Actual: No mismatch detected ❌

## Root Cause

The flight segment's origin city name included airport code and state:
```typescript
firstFlight.origin.name = "New York, NY (JFK)"
```

The detection was doing a substring match:
```typescript
titleLower.includes(originCityLower)
"new york winter getaway".includes("new york, ny (jfk)")  // false ❌
```

Since the title contained "New York" but the code was looking for "New York, NY (JFK)", the match failed.

## Solution

Added city name normalization to remove airport codes and state suffixes:

```typescript
const normalizeCityName = (name: string): string => {
  // Remove airport code in parentheses (e.g., "(JFK)")
  let normalized = name.replace(/\s*\([A-Z]{3}\)\s*/g, '');
  // Remove state/country codes after comma (e.g., ", NY")
  normalized = normalized.replace(/,\s*[A-Z]{2}(?:\s|$)/g, '');
  return normalized.trim();
};

// "New York, NY (JFK)" → "New York"
// "St. Maarten (SXM)" → "St. Maarten"
```

## Before vs After

### Before (Bug):
```
Origin city: "New York, NY (JFK)"
Title: "New York Winter Getaway"
Match: false ❌ (can't find "New York, NY (JFK)" in title)
```

### After (Fixed):
```
Origin city (raw): "New York, NY (JFK)"
Origin city (normalized): "New York"
Title: "New York Winter Getaway"
Match: true ✅ (found "New York" in title)
```

## Output

The fix now correctly detects the mismatch and generates a warning in the itinerary summary:

```markdown
⚠️ **TITLE/DESTINATION MISMATCH DETECTED**
- Current title: "New York Winter Getaway"
- Title mentions: "New York" (departure city)
- Actual destination: "St. Maarten"
- Suggested title: "St. Maarten Winter Getaway"

**Explanation**: Title mentions "New York" (your departure city) but you're actually
traveling to "St. Maarten". This often happens when importing confirmation emails
sent from the departure city.

**ACTION REQUIRED**: You should acknowledge this mismatch and offer to update the
title to correctly reflect the destination.
```

## Files Modified

- `src/services/trip-designer/itinerary-summarizer.ts`
  - Added `normalizeCityName()` helper function
  - Applied normalization to origin and destination city names before comparison
  - Preserved raw city names for display in suggestions

## Testing

Tested with itinerary `1dee003d-7709-4b4e-a158-f8666b8e5d8b`:
- ✅ Mismatch correctly detected
- ✅ Appropriate warning generated in summary
- ✅ Correct suggestion: "St. Maarten Winter Getaway"
- ✅ LLM will receive the warning in system context

## Impact

This fix ensures that the Trip Designer agent will:
1. Detect when imported itineraries have incorrect titles (common with email imports)
2. Receive explicit instructions to acknowledge and offer to fix the title
3. Suggest the correct destination-based title

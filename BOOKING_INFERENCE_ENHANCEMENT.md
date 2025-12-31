# Itinerary Summarizer Enhancement - Booking Inference

## Problem
When editing an itinerary with luxury hotel bookings (e.g., Hotel L'Esplanade), the AI Trip Designer was still asking about travel style preferences instead of inferring them from the existing bookings.

## Solution
Enhanced the itinerary summarizer to make existing bookings **prominently visible** with automatic tier inference.

## Changes Made

### 1. Added Tier Inference Functions (`src/services/trip-designer/itinerary-summarizer.ts`)

```typescript
function inferHotelTier(hotelName: string): string {
  // Recognizes luxury brands: L'Esplanade, Four Seasons, Ritz, etc.
  // Returns: 'LUXURY', 'MODERATE', or 'STANDARD'
}

function inferFlightTier(cabinClass: string): string {
  // Recognizes cabin classes
  // Returns: 'LUXURY', 'PREMIUM', or 'ECONOMY'
}

function formatExistingBookings(segments: Segment[]): string[] {
  // Extracts bookings and infers travel style tier
  // Returns formatted booking callouts
}
```

### 2. Enhanced Summary Output

**Before:**
```
**Segments**: 1 hotel (1 total)
- Hotel: Jan 8, 2025 (7 nights, Hotel L'Esplanade)
```

**After:**
```
**Segments**: 1 hotel (1 total)
- Hotel: Jan 8, 2025 (7 nights)

**⚠️ EXISTING BOOKINGS** (use to infer travel preferences):
- 🏨 HOTEL: Hotel L'Esplanade in Grand Case (7 nights) → LUXURY style
```

### 3. Updated Context Message (`trip-designer.service.ts`)

Added explicit instruction to the AI:

```
CRITICAL: If the summary shows "⚠️ EXISTING BOOKINGS" with luxury/premium properties
or cabin classes, DO NOT ask about travel style or budget - infer the luxury/premium
preference from the bookings and proceed accordingly. The existing bookings define
the expected quality level.
```

### 4. Enhanced Tool Summary (`summarizeItineraryForTool`)

Added `inferred_tier` field to hotel and flight segments in tool results so the AI can see tier information when using the `get_itinerary` tool.

## Recognized Luxury Brands

### Hotels
- L'Esplanade, Four Seasons, Ritz, St. Regis, Aman, Belmond
- Peninsula, Mandarin Oriental, Rosewood, Park Hyatt
- Bulgari, Eden Roc, Cheval Blanc, Raffles, Six Senses
- One&Only, The Berkeley, Claridge's, Dorchester, Savoy

### Flight Classes
- First Class / Suite → LUXURY
- Business / Premium → PREMIUM
- Economy → ECONOMY

## Expected Behavior

When a user has an existing itinerary with luxury bookings:

1. ✅ **Summary shows prominent "⚠️ EXISTING BOOKINGS" section**
2. ✅ **Tier inference automatically categorizes properties/flights**
3. ✅ **AI skips redundant travel style questions**
4. ✅ **AI matches booking quality level for recommendations**

## Testing

Run the test:
```bash
npx tsx test-booking-inference.mjs
```

Expected output should show:
- ⚠️ EXISTING BOOKINGS section
- Hotel L'Esplanade → LUXURY style inference
- 7 nights correctly calculated from check-in/check-out dates

## Type Safety

All changes maintain strict TypeScript types:
- Uses proper `HotelSegment` and `FlightSegment` type guards
- Correctly accesses `Location.address.city` (not `Location.city`)
- Uses `Location.code` for airport codes (not `iata`)
- Handles optional fields with fallbacks

## Files Modified

1. `src/services/trip-designer/itinerary-summarizer.ts`
   - Added tier inference functions
   - Enhanced `summarizeItinerary()` with EXISTING BOOKINGS section
   - Updated `summarizeItineraryForTool()` to include tier info

2. `src/services/trip-designer/trip-designer.service.ts`
   - Added CRITICAL instruction about booking inference

3. `test-booking-inference.mjs` (new)
   - Test demonstrating the enhancement

## Impact

- **User Experience**: Fewer redundant questions, faster trip planning
- **AI Accuracy**: Better understanding of user preferences from context
- **Type Safety**: Maintained 100% type coverage
- **Performance**: Minimal overhead (just string matching for tier inference)

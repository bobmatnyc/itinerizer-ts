# Overnight Gap Detection Fix

## Problem
The gap-filling logic was creating invalid transfers between segments that span overnight:
- Example: TAXI transfer from "Dinner at Bad Roman" (9:00 PM Day 1) → "Lunch at Le Café Louis Vuitton" (12:00 PM Day 2)
- This is unrealistic - travelers don't take taxis overnight from dinner to next-day lunch

## Solution
Added time-aware gap detection that skips creating transfers for overnight gaps between activities.

## Implementation Details

### 1. New `isOvernightGap()` Method
Detects if a time gap represents an overnight period:
- Different calendar days with evening → morning pattern (e.g., 9PM → 12PM next day)
- Same-day gaps >8 hours (unusual for direct transfers)

### 2. Updated `detectLocationGaps()` Logic
- Skips overnight gaps for ACTIVITY segments (e.g., dinner → lunch next day)
- Still creates gaps for:
  - Hotel-to-hotel transitions (travel days)
  - Airport-related transfers (travel days)
  - Same-day activities with short gaps (<8 hours)

### 3. New `isAirportSegment()` Helper
Identifies segments involving airports:
- FLIGHT segments
- TRANSFER segments with airport pickup or dropoff

### 4. Improved City-Based Classification
Updated `classifyGap()` to handle locations without country info:
- If both locations have same city → LOCAL_TRANSFER (even without country)
- Checks location.city field in addition to address.city

## Test Coverage

### New Tests Added (`gap-filling.test.ts`)
1. Should not create transfer for overnight gap (dinner to next-day lunch) ✓
2. Should not create transfer for same-day long gap (>8 hours) ✓
3. Should create transfer for same-day activities with short gap ✓

### Existing Tests (All Passing)
- Gap detection between hotels in different cities ✓
- Gap detection between hotels in different countries ✓
- No consecutive transfers (Greece bug regression) ✓
- Travel day detection (NYC → Milan integration test) ✓

## Examples

### ❌ Before (Incorrect)
```
Dinner at Bad Roman (9:00 PM Dec 4)
  → TAXI transfer (9:30 PM Dec 4 → 11:45 AM Dec 5) ❌ 14+ hour taxi!
Lunch at Le Café Louis Vuitton (12:00 PM Dec 5)
```

### ✅ After (Correct)
```
Dinner at Bad Roman (9:00 PM Dec 4)
  → [No transfer - overnight gap, traveler at hotel]
Lunch at Le Café Louis Vuitton (12:00 PM Dec 5)
```

### ✅ Still Creates Gaps for Travel Days
```
Hotel checkout NYC (11:00 AM Jan 12)
  → [Flight gap detected - needs JFK → MXP] ✓
Airport transfer Milan (9:00 AM Jan 13)
```

## Impact on NYC Itinerary
The problematic TAXI transfers will no longer be created between:
- Dinner → Next-day lunch activities
- Evening activities → Morning activities
- Any activity gap >8 hours

Hotel-to-hotel and airport transfers will still be detected correctly.

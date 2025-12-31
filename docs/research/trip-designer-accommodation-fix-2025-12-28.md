# Trip Designer Accommodation Planning Fix

## Problem Summary
Hotels were being created with incorrect durations and dates:
1. **1-night hotels for multi-day trips** - AI only setting 1 night instead of full trip duration
2. **Date misalignment** - Segment dates not matching saved trip dates (e.g., Jan 7 segment for Jan 8-15 trip)

## Root Cause
The Trip Designer system prompt lacked explicit guidance for:
- Calculating accommodation duration based on trip dates
- Requiring `get_itinerary` call before adding accommodation
- Validating that segment dates align with trip date range

## Solution

### Changes Made to `src/prompts/trip-designer/system.md`

#### 1. Added "Accommodation Planning" Section (Line 446)
New section with:
- **Mandatory workflow** requiring `get_itinerary` call BEFORE adding accommodation
- **Duration calculation formula**: `nights = (tripEndDate - tripStartDate)`
- **Date alignment rules**: checkIn = trip startDate, checkOut = trip endDate
- **Multi-city handling**: Multiple hotels with NO gaps

#### 2. Added Hotel Duration Examples
- **Single-city example**: Jan 8-15 trip = 8 nights (ONE hotel covering full stay)
- **Multi-city example**: 8-night trip split into 3-night + 5-night hotels with no gaps
- **Common mistakes** to avoid with explicit anti-patterns

#### 3. Added Validation Checklist
Before adding ANY accommodation segment:
- [ ] Called `get_itinerary` to get saved trip dates
- [ ] Calculated total nights from date range
- [ ] Set hotel checkIn = trip startDate
- [ ] Set hotel checkOut = trip endDate
- [ ] Verified segment dates fall within trip range
- [ ] Ensured no gaps for multi-city trips

#### 4. Enhanced Tool Usage Guidelines (Line 514)
Added:
- **CRITICAL reminder** to call `get_itinerary` before adding accommodation
- **Example workflow** showing step-by-step process
- **Never Do** items for accommodation-specific anti-patterns

## Key Instructions Added

### Mandatory Workflow
```
User: "Add a hotel in Lisbon"

Step 1: get_itinerary() → Returns startDate: "2025-01-08", endDate: "2025-01-15"
Step 2: Calculate: 8 nights total
Step 3: add_segment({
  type: "accommodation",
  checkInDate: "2025-01-08",  ← Trip start date
  checkOutDate: "2025-01-15",  ← Trip end date
  ...
})
```

### Anti-Patterns Explicitly Flagged
❌ Only 1 night for 8-day trip
❌ Dates outside trip range
❌ Not calling `get_itinerary` first
❌ Gaps between hotels in multi-city trips

## Expected Behavior After Fix

### Before (Broken)
```
Trip: Jan 8-15, 2025 (8 nights)
Hotel added: checkIn Jan 8, checkOut Jan 9 (1 night) ← WRONG!
```

### After (Fixed)
```
Trip: Jan 8-15, 2025 (8 nights)
AI calls: get_itinerary() → retrieves saved dates
AI calculates: 8 nights
Hotel added: checkIn Jan 8, checkOut Jan 15 (8 nights) ← CORRECT!
```

## Testing Recommendations

1. **Test single-city trip**: Verify hotel spans entire trip duration
2. **Test multi-city trip**: Verify hotels split correctly with no gaps
3. **Test date alignment**: Verify hotel dates match saved trip dates exactly
4. **Test edge cases**: Same-day trips, overnight trips, month boundaries

## Related Files
- `/src/prompts/trip-designer/system.md` - Updated system prompt
- `/src/services/trip-designer/tools.ts` - Tool implementation (no changes needed)
- `/src/domain/schemas/segment.schema.ts` - Segment schema (no changes needed)

## LOC Delta
- Added: 82 lines (new section + examples + validation)
- Removed: 0 lines
- Net Change: +82 lines
- Phase: Enhancement (fixing critical AI behavior bug)

## Follow-up Actions
1. Test with real Trip Designer sessions
2. Monitor hotel segment durations in new itineraries
3. Check for any regression in date handling
4. Consider adding automated validation in `add_segment` tool as fallback

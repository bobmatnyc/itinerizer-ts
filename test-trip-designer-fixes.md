# Test Scenarios for Trip Designer Fixes

## Prerequisites
1. Start the viewer: `cd viewer-svelte && npm run dev`
2. Open http://localhost:5176
3. Have Chrome DevTools open to Network tab

## Scenario 1: Test Itinerary Metadata Update (Issue 1)

### Steps
1. Click "New Trip" or go to home page
2. In chat, type: **"I want to plan a trip to Barcelona"**
3. **Expected behavior:**
   - AI calls `update_itinerary` tool to set destination
   - Tool returns `{ success: true, updated: ['title', 'destinations'], itineraryChanged: true }`
   - UI receives `done` event with `itineraryUpdated: true`
   - View automatically switches from home to itinerary detail
   - Header shows "Barcelona" as destination
   - NO manual refresh needed

4. Continue conversation: **"Set dates to March 15-22, 2026"**
5. **Expected behavior:**
   - AI calls `update_itinerary` tool to set dates
   - Tool returns `{ success: true, updated: ['startDate', 'endDate'], itineraryChanged: true }`
   - UI receives `done` event with `itineraryUpdated: true`
   - Dates appear in itinerary detail view
   - Calendar shows updated date range

### How to Verify Fix
**Before fix:**
- View stayed on home page after setting destination
- User had to manually refresh or click itinerary to see changes

**After fix:**
- View switches automatically to itinerary detail
- Changes appear immediately without refresh

## Scenario 2: Test Date Awareness (Issue 2)

### Current Date Context
Today is **Monday, December 23, 2025**.

### Steps
1. Create new itinerary
2. Ask: **"When's a good time to visit Japan?"**
3. **Expected behavior:**
   - AI system prompt includes: "Today is Monday, December 23, 2025 (2025-12-23)"
   - AI suggests dates in **2026** or later (e.g., "Spring 2026 (March-May)")
   - AI does NOT suggest dates in 2025 or earlier

4. Try: **"Plan a week in Paris"**
5. **Expected behavior:**
   - AI asks follow-up questions about preferences
   - When suggesting dates, all dates are in the **future** (after Dec 23, 2025)
   - AI does NOT suggest December 2024 or earlier dates

6. Edge case: **"I want to go next week"**
7. **Expected behavior:**
   - AI calculates "next week" as late December 2025 / early January 2026
   - Sets dates accordingly (e.g., Dec 30, 2025 - Jan 6, 2026)

### How to Verify Fix
**Before fix:**
- AI suggested dates like "December 2024" (past dates)
- No awareness of current date context

**After fix:**
- AI knows today is Dec 23, 2025
- All date suggestions are in the future
- AI can calculate relative dates correctly

## Scenario 3: Combined Test

### Steps
1. Create new itinerary
2. Say: **"Plan a 5-day trip to Rome starting in 2 weeks"**
3. **Expected behavior:**
   - AI knows today is Dec 23, 2025
   - Calculates "in 2 weeks" as early January 2026
   - Sets dates to ~Jan 6-11, 2026 (5 days)
   - Calls `update_itinerary` with destination and dates
   - Returns `itineraryChanged: true`
   - UI switches to detail view showing Rome + Jan dates
   - NO past dates suggested

## DevTools Inspection Points

### Network Tab
1. Look for SSE stream from `/api/v1/trip-designer/stream`
2. Check for events:
   ```
   event: tool_result
   data: {"type":"tool_result","name":"update_itinerary",...}

   event: done
   data: {"type":"done","itineraryUpdated":true,...}
   ```

### Console Logs
Look for:
```
[chatStream] Tool "update_itinerary" result: {success: true, itineraryChanged: true}
[chatStream] Itinerary metadata changed: true
[chatStream] EMITTING DONE EVENT with itineraryUpdated: true
```

## Expected Results Summary

| Test | Before Fix | After Fix |
|------|-----------|-----------|
| Set destination | View stays on home | View switches to detail |
| Set dates | No UI update | UI updates immediately |
| Date suggestions | Past dates possible | Only future dates |
| "Next week" calculation | Incorrect | Correct (Jan 2026) |
| Manual refresh needed | Yes | No |

## Regression Tests

Ensure these still work:
- ✅ Adding segments (flights, hotels, activities) still triggers updates
- ✅ Segment modifications still work
- ✅ Help agent mode still functions
- ✅ Minimal prompt for new itineraries still loads
- ✅ Existing itinerary context still appears

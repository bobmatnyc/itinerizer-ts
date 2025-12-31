# Test: ImportDialog Shows All Itineraries After PDF Parse

## Issue
ImportDialog was not showing any itineraries after PDF parsing succeeded. User reported: "It found segments, but import still shows no itineraries."

## Root Cause
The `/api/v1/import/upload` endpoint only returned **matched** itineraries (with matchScore > 0). If no good matches were found, `tripMatches` was an empty array, so the dialog showed nothing.

## Solution
Modified the upload endpoint to return:
1. **Matched itineraries** (matchScore > 0) - shown first as "Suggested Matches"
2. **All other user itineraries** (matchScore = 0) - shown as "Other Trips"

This ensures users always see all their trips as options, not just matched ones.

## Changes Made

### 1. `/api/v1/import/upload/+server.ts`
- Fetch ALL user itineraries after parsing
- Filter out matched trips from the full list
- Convert unmatched trips to TripMatch format with score = 0
- Return combined array: `[...matches, ...unmatchedTrips]`

### 2. `ImportDialog.svelte`
- Split `tripMatches` into two sections:
  - `matchedTrips` (score > 0) - "Suggested Matches"
  - `unmatchedTrips` (score = 0) - "Other Trips"
- Display both sections with clear labels
- Added styling for subsection labels

### 3. `TripMatchCard.svelte`
- Hide match score bar/reasons when `matchScore === 0`
- Still show trip name, destination, and dates
- Cleaner appearance for non-matched trips

## Test Plan

### Manual Test
1. Start dev server: `npm run dev`
2. Log in as test user
3. Navigate to any itinerary
4. Click "Import" button
5. Upload a PDF (flight confirmation, hotel booking, etc.)
6. After parsing completes, verify:
   - ✅ "Select Destination Trip" dialog appears
   - ✅ If matches found, "Suggested Matches" section shows first
   - ✅ "Other Trips" section shows remaining itineraries
   - ✅ All user's trips are visible (not just matches)
   - ✅ Match scores and reasons shown for matched trips only
   - ✅ "Create New Trip" option available at bottom
   - ✅ Can select any trip and click "Import Segments"

### Expected Behavior

#### Scenario 1: Good Match Found
```
┌─ Suggested Matches ─────────────────┐
│ ○ Tokyo Adventure (85% match)       │
│   Tokyo, Japan | Mar 10-17, 2025   │
│   [Date overlap] [Same destination] │
└─────────────────────────────────────┘

┌─ Other Trips ──────────────────────┐
│ ○ Paris Getaway                     │
│   Paris, France | Apr 5-12, 2025   │
├─────────────────────────────────────┤
│ ○ London Business Trip              │
│   London, UK | May 1-3, 2025       │
└─────────────────────────────────────┘

        ──────── or ────────

┌─────────────────────────────────────┐
│ ○ Create New Trip                   │
└─────────────────────────────────────┘
```

#### Scenario 2: No Matches Found
```
┌─ Other Trips ──────────────────────┐
│ ○ Tokyo Adventure                   │
│   Tokyo, Japan | Mar 10-17, 2025   │
├─────────────────────────────────────┤
│ ○ Paris Getaway                     │
│   Paris, France | Apr 5-12, 2025   │
└─────────────────────────────────────┘

        ──────── or ────────

┌─────────────────────────────────────┐
│ ○ Create New Trip                   │
└─────────────────────────────────────┘
```

#### Scenario 3: New User (No Trips)
```
┌─────────────────────────────────────┐
│ ○ Create New Trip                   │
│   [Input field appears]             │
└─────────────────────────────────────┘
```

## Testing with Sample Data

### Test User Setup
```bash
# Create test user with multiple trips
userId="test@example.com"

# Trip 1: Tokyo trip (Mar 10-17, 2025)
# Trip 2: Paris trip (Apr 5-12, 2025)
# Trip 3: London trip (May 1-3, 2025)
```

### Test Files
1. **Flight confirmation** (should match Tokyo trip by date/destination)
2. **Hotel booking** (different destination, no match → all trips shown)
3. **Email confirmation** (test email import flow)

## Verification Checklist

- [ ] Segments extracted successfully from PDF
- [ ] Dialog shows "Select Destination Trip" step
- [ ] Matched trips show with score/reasons
- [ ] All user trips visible (matched or not)
- [ ] Can select any trip
- [ ] Can create new trip
- [ ] Import succeeds and adds segments
- [ ] No console errors
- [ ] Mobile responsive layout works

## LOC Delta
```
Added: ~45 lines
- Upload endpoint: +27 lines (fetch all trips, filter, convert)
- ImportDialog: +12 lines (split matched/unmatched)
- TripMatchCard: +2 lines (conditional rendering)
- Styles: +4 lines (subsection labels)

Removed: ~3 lines
- Simplified conditional logic

Net: +42 lines
```

## Notes
- Match scoring logic unchanged (still in TripMatcher)
- All itineraries now guaranteed to show (fallback UX)
- Visual hierarchy: matches first, then all others
- Zero-score trips don't show match bars (cleaner UI)
- Compatible with existing import flow

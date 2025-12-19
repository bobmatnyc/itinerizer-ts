# Fix: Prevent Consecutive Transfers in Gap-Filling Logic

## Problem
When the LLM extracted a transfer segment from a PDF (e.g., "Athens Airport → King George Hotel"), the gap-filling logic would still create another transfer segment immediately after it, resulting in nonsensical consecutive transfers.

**Example of the bug:**
```
Segment 1: FLIGHT UNK → ATH (ends 8:00 PM)
Segment 2: TRANSFER Athens Airport → King George Hotel (8:00 PM) [IMPORTED from PDF]
Segment 3: TRANSFER King George Hotel → hotel address (10:30 PM) [AUTO-GENERATED - WRONG!]
Segment 4: HOTEL King George Hotel
```

The auto-generated Segment 3 should NOT exist because:
1. A transfer (Segment 2) already connects the airport to the hotel
2. Two consecutive transfers make no logical sense

## Root Cause
The `detectLocationGaps()` method in `segment-continuity.service.ts` was detecting a "gap" between any two segments with different locations, without checking if either adjacent segment was already a transfer that handles the transition.

## Solution
Added logic to skip gap detection when:
1. The **current segment** is a transfer that drops off at (or near) the next segment's start location
2. The **next segment** is a transfer that picks up from the current segment's end location

This prevents creating consecutive transfers while still detecting legitimate gaps.

## Changes Made

### `/src/services/segment-continuity.service.ts`
1. Added `isTransferSegment()` helper method to identify segments that connect two locations (FLIGHT, TRANSFER, or any segment with different start/end locations)

2. Modified `detectLocationGaps()` to skip gap detection when:
   - Current segment is a transfer ending where next segment starts
   - Next segment is a transfer starting where current segment ends

### `/tests/services/gap-filling.test.ts`
Added regression test: `should not create consecutive transfers (regression test for Greece bug)`

## Verification
- All existing tests pass (20/20)
- New regression test passes
- Logic correctly identifies and skips:
  - FLIGHT → TRANSFER sequences
  - TRANSFER → HOTEL sequences  
  - TRANSFER → TRANSFER sequences

## LOC Delta
- Added: 35 lines (including helper method and logic)
- Removed: 0 lines
- Net Change: +35 lines
- Test Coverage: Added 1 regression test

## Phase
Enhancement - Bug fix for production gap-filling logic

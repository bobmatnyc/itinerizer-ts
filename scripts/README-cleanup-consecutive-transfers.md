# Cleanup Consecutive Transfers Script

## Overview

This script removes redundant agent-generated transfers from itinerary files that are adjacent to other transfer-like segments (TRANSFER or FLIGHT).

## Problem Statement

The travel agent service was generating transfers to fill gaps, but sometimes these were redundant because:
1. An imported transfer already existed from the PDF
2. A flight already handles the transportation
3. Multiple consecutive transfers were generated for the same movement

Example of redundant pattern:
```
FLIGHT (source: import) from JFK to LIM
TRANSFER (source: agent) from LIM to Hotel  ← REDUNDANT (adjacent to flight)
```

## Cleanup Rules

The script removes agent-generated transfers if:
1. Preceded by a TRANSFER or FLIGHT segment (any source)
2. Followed by a TRANSFER or FLIGHT segment (any source)

The script keeps:
- All imported transfers (from PDF source documents)
- All flights (any source)
- Agent transfers that are NOT adjacent to transfer-like segments

## Usage

```bash
npx tsx scripts/cleanup-consecutive-transfers.ts
```

## Results

From the latest run (2025-12-18):

- **Files processed**: 15
- **Files modified**: 12 (80%)
- **Total transfers removed**: 43
- **Average removals per modified file**: 3.6

### Example: Peru Itinerary (641e7b29-2432-49e8-9866-e4db400494ba.json)

**Before:**
- 31 total segments
- 8 agent-generated redundant transfers adjacent to flights/transfers

**After:**
- 23 total segments (8 removed)
- 10 transfers remaining (4 imported, 6 agent-generated)
- All remaining agent transfers are non-adjacent to other transfers

### Top Files Cleaned

1. `641e7b29-2432-49e8-9866-e4db400494ba.json`: 8 transfers removed
2. `f766bf32-c92b-49c8-86d6-7cdbb64c8a7f.json`: 6 transfers removed
3. `fa346c61-8458-42fa-8149-961e1f428a6a.json`: 6 transfers removed
4. `ce3718ec-f44d-4486-a1ec-9df047fcb37a.json`: 5 transfers removed
5. `d6d6f0b9-57e0-4cef-811b-6888084957b9.json`: 4 transfers removed

## Implementation Details

### Key Functions

**`isTransferLike(segment)`**
- Returns `true` for TRANSFER or FLIGHT segments
- Used to identify adjacent movement segments

**`cleanupConsecutiveTransfers(segments)`**
- Filters segments array
- Removes agent transfers adjacent to transfer-like segments
- Returns cleaned array + removal count + IDs

**`processItinerary(filePath)`**
- Reads JSON file
- Applies cleanup
- Writes back with updated timestamp
- Returns processing results

### Safety Features

- Only modifies agent-generated transfers (never touches imported data)
- Updates `updatedAt` timestamp when making changes
- Preserves all other segment data
- Provides detailed logging of each removal

## When to Re-run

Run this script:
- After importing new PDF itineraries that trigger gap filling
- When the travel agent service has been improved to generate fewer redundant transfers
- As part of data migration/cleanup tasks

## Next Steps

Consider enhancing the travel agent service to prevent generating these redundant transfers in the first place:
1. Check if adjacent segment is already a transfer/flight before inserting
2. Use segment continuity validation to detect existing connections
3. Add heuristics to avoid transfers between activities at the same location

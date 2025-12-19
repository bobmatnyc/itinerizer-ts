# Location Matching Improvements

## Overview

Improved the location matching logic in `SegmentContinuityService` to better detect when two locations represent the same place, reducing false positive gap detection.

## Problem Statement

The original `isSameLocation()` function had several issues:

1. **Overly permissive "same city" rule**: Lines 275-281 returned `true` for ANY two locations in the same city, causing false positives (e.g., matching airport to hotel just because they're both in Athens)

2. **No fuzzy matching**: Required exact substring matches, failing to recognize similar names like "King George Hotel" vs "George Hotel"

3. **No address-to-name matching**: Couldn't match hotel names to their street addresses (e.g., "King George Hotel" vs "3 Vasileos Georgiou A' St")

4. **No coordinate proximity checking**: Didn't leverage geographic coordinates when available

## Changes Made

### 1. Removed Blanket "Same City = Same Location" Rule

**Before:**
```typescript
// This is WRONG - being in same city doesn't mean same location
if (city1 && city2 && normalizeCity(city1) === normalizeCity(city2)) {
  return true;
}
```

**After:** Removed this logic entirely. Same city only matters for gap classification (local vs domestic), not for determining if two locations are identical.

### 2. Added Coordinate Proximity Check

New method `areCoordinatesClose()` uses the Haversine formula to calculate distance between coordinates:

```typescript
private areCoordinatesClose(loc1: Location, loc2: Location): boolean {
  // Returns true if coordinates are within 100 meters
}
```

- Uses Earth's radius and spherical distance calculation
- 100-meter threshold is appropriate for hotels/venues at same address
- Only matches if BOTH locations have coordinates

### 3. Added Address-to-Name Matching

New method `isAddressMatch()` checks if one location's street address matches another's name:

```typescript
private isAddressMatch(loc1: Location, loc2: Location): boolean {
  // Check if loc1.address.street === loc2.name or vice versa
}
```

This handles cases where:
- Location A is a hotel with name "King George Hotel" and address "3 Vasileos Georgiou A' St"
- Location B is just the address "3 Vasileos Georgiou A' St"
- These should be considered the same location

### 4. Implemented Fuzzy Word Matching

New method `haveSimilarWords()` uses fuzzy matching with >70% word overlap threshold:

```typescript
private haveSimilarWords(name1: string, name2: string): boolean {
  // Extract significant words (excluding stop words)
  // Count fuzzy matches using Levenshtein distance
  // Return true if >70% overlap
}
```

Features:
- Filters out stop words ("the", "hotel", "resort", etc.)
- Uses Levenshtein distance for word similarity
- Requires >70% of significant words to match

### 5. Added Levenshtein Distance Algorithm

New methods for fuzzy word comparison:

```typescript
private areWordsSimilar(word1: string, word2: string): boolean {
  // Exact match, substring match, or edit distance <= 2
}

private levenshteinDistance(str1: string, str2: string): number {
  // Dynamic programming implementation
}
```

Tolerances:
- Words >5 chars: edit distance <= 2 (handles typos/variations)
- Shorter words: edit distance <= 1 (stricter matching)
- Substring matching: "king" matches "kings"

### 6. Improved Matching Flow

New `isSameLocation()` flow (safer, more conservative):

1. **Check airport codes** (most reliable):
   - If both have codes and codes DIFFER → different locations
   - If both have codes and codes MATCH → same location
   - If only one has code → continue to name-based matching (incomplete data)
2. Check coordinate proximity (if available)
3. Check address-to-name match (hotel name vs address)
4. Check exact normalized names
5. Check substring containment
6. Check fuzzy word similarity
7. **Default to different** (safer than false positives)

**Important Fix**: The original logic rejected matches when one location had a code and the other didn't. This caused false gaps when the same airport was referenced with and without its IATA code (e.g., "Athens International Airport" with code "ATH" vs. without code). The new logic allows name-based matching to proceed when only one location has a code.

## Test Coverage

Created comprehensive test suite in `tests/services/segment-continuity-location-matching.test.ts`:

- 22 tests covering all matching scenarios
- Tests for airport code matching (with/without codes)
- Tests for coordinate proximity (within/beyond 100m)
- Tests for address-to-name matching
- Tests for fuzzy word similarity
- Tests for stop word filtering
- Tests for Levenshtein distance edge cases
- Regression tests for Greece itinerary bug

All tests passing.

## Benefits

1. **Reduced false positives**: Won't match different venues in same city
2. **Better hotel matching**: Matches hotel names to their addresses
3. **Fuzzy matching**: Handles name variations and typos
4. **Coordinate awareness**: Uses GPS coordinates when available
5. **Conservative approach**: Defaults to "different" rather than "same" to avoid false matches

## Trade-offs

- Slightly more complex logic (but well-tested and documented)
- May miss some legitimate matches if names are very different
- Requires good coordinate data for best results
- 70% word overlap threshold may need tuning based on real-world usage

## Examples

### Will Match
- "King George Hotel" ↔ "George Hotel" (fuzzy words)
- "Four Seasons" ↔ "Four Seasons Resort Oahu" (substring)
- Same coordinates within 100m (proximity)
- Hotel name ↔ its street address (address match)

### Will NOT Match
- Airport ↔ Hotel in same city (different types)
- "King George Hotel" ↔ "Grande Bretagne Hotel" (different names)
- "George" ↔ "Georgiou" (edit distance 3, exceeds threshold)
- Coordinates >100m apart (too far)

## Files Changed

- `src/services/segment-continuity.service.ts`: Core implementation
- `tests/services/segment-continuity-location-matching.test.ts`: Test suite
- `docs/LOCATION_MATCHING_IMPROVEMENTS.md`: This documentation

## LOC Delta

- **Added**: ~200 lines (new methods + tests)
- **Removed**: ~70 lines (old helper methods)
- **Net Change**: +130 lines
- **Phase**: Enhancement (improving existing functionality)

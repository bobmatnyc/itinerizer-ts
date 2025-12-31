# Title/Destination Mismatch Detection

## Problem

When users import travel confirmations, the AI sometimes mistakenly sets the itinerary title to the **departure city** instead of the **destination**. This happens because confirmation emails are often sent from the departure city's email system.

### Example Issue

```
Title: "New York Winter Getaway"
Description: "Winter trip to New York City"
Flights: JFK → SXM (St. Maarten), SXM → JFK
```

**Problem**: The title mentions "New York" (the departure city), but the user is actually traveling **TO** St. Maarten, not New York.

## Solution

### 1. Detection Function

Added `detectTitleDestinationMismatch()` in `itinerary-summarizer.ts`:

```typescript
export interface TitleDestinationMismatch {
  hasMismatch: boolean;
  titleMentions: string | null;
  actualDestination: string | null;
  suggestedTitle: string | null;
  explanation: string | null;
}

export function detectTitleDestinationMismatch(
  itinerary: Itinerary
): TitleDestinationMismatch | null
```

**Detection Logic:**

1. Analyzes flight segments to determine actual destination
2. For round trips (A→B, B→A), identifies B as the destination
3. Checks if title/description mentions origin city but NOT destination
4. Supports both city names and airport codes (e.g., "New York" or "JFK")
5. Generates suggested title by replacing origin with destination

**Example Detection:**

```typescript
{
  hasMismatch: true,
  titleMentions: "New York",
  actualDestination: "St. Maarten",
  suggestedTitle: "St. Maarten Winter Getaway",
  explanation: "Title mentions \"New York\" (your departure city) but you're actually traveling to \"St. Maarten\". This often happens when importing confirmation emails sent from the departure city."
}
```

### 2. Integration into Trip Designer

When `summarizeItinerary()` is called, it now:

1. **Checks for mismatch** using `detectTitleDestinationMismatch()`
2. **Injects warning FIRST** (before trip details) if mismatch detected
3. **Provides clear action** for the LLM to acknowledge and offer to fix

**Warning Format:**

```markdown
⚠️ **TITLE/DESTINATION MISMATCH DETECTED**
- Current title: "New York Winter Getaway"
- Title mentions: "New York" (departure city)
- Actual destination: "St. Maarten"
- Suggested title: "St. Maarten Winter Getaway"

**Explanation**: Title mentions "New York" (your departure city) but you're actually traveling to "St. Maarten". This often happens when importing confirmation emails sent from the departure city.

**ACTION REQUIRED**: You should acknowledge this mismatch and offer to update the title to correctly reflect the destination.
```

### 3. LLM Context Flow

1. User opens Trip Designer with existing itinerary
2. `createSession()` loads itinerary and calls `summarizeItinerary()`
3. Summary includes mismatch warning (if detected)
4. Warning is injected into system prompt context
5. LLM sees the warning and naturally offers to fix the title

**System Prompt Injection** (in `trip-designer.service.ts`):

```typescript
const contextMessage = `The user is working on an existing itinerary. Here's the current state:

${summary}

Important: Since the itinerary already has content, skip any questions about information that's already provided in the summary above. Instead, acknowledge what's already planned and offer to help refine, modify, or extend the itinerary.

CRITICAL: If the summary shows "⚠️ EXISTING BOOKINGS" with luxury/premium properties or cabin classes, DO NOT ask about travel style or budget - infer the luxury/premium preference from the bookings and proceed accordingly. The existing bookings define the expected quality level.`;
```

## Files Modified

### Core Logic

- `src/services/trip-designer/itinerary-summarizer.ts`
  - Added `TitleDestinationMismatch` interface
  - Added `detectTitleDestinationMismatch()` function
  - Updated `summarizeItinerary()` to inject warning

### Tests

- `tests/services/trip-designer/itinerary-summarizer.test.ts`
  - Added comprehensive test suite for mismatch detection
  - Tests cover: round trips, airport codes, multi-word cities, suggested titles
  - Tests verify warning placement in summary

### Configuration

- `vitest.config.ts`
  - Added `tests/services/**/*.test.ts` to include patterns

## Test Coverage

**25 tests total, including:**

1. **Mismatch Detection:**
   - Round trip mismatch (JFK→SXM→JFK with "New York" title)
   - Airport code mismatch (title "JFK Weekend Trip" to Miami)
   - No mismatch when title is correct
   - No flights edge case

2. **Title Generation:**
   - Multi-word cities ("New York" → "Paris")
   - Preserves non-location words ("Summer Adventure")
   - Handles airport codes in titles

3. **Summary Integration:**
   - Warning appears FIRST in summary
   - Warning includes all required fields
   - No warning when no mismatch

## Acceptance Criteria ✅

- [x] Mismatch detected when title mentions origin instead of destination
- [x] Works for round trips (A→B, B→A)
- [x] Handles airport codes (JFK, SXM, etc.)
- [x] Handles multi-word city names ("New York", "San Francisco")
- [x] Generates appropriate suggested titles
- [x] Warning injected into Trip Designer context
- [x] Warning appears BEFORE trip details
- [x] LLM receives clear action to acknowledge and offer fix
- [x] Comprehensive test coverage (25 tests, 100% passing)

## Expected Behavior

When a user opens Trip Designer with a mismatched itinerary:

1. **LLM greeting might say:**
   ```
   I noticed your itinerary is titled "New York Winter Getaway", but based on your
   flights, you're actually traveling to St. Maarten! This sometimes happens when
   importing confirmations. Would you like me to update the title to "St. Maarten
   Winter Getaway" to correctly reflect your destination?
   ```

2. **User can respond:**
   - "Yes, please update it"
   - "No, keep it as is"
   - Continue planning without addressing it

3. **LLM can then use `update_itinerary_metadata` tool** to fix the title

## LOC Delta

```
Added: ~150 lines (detection logic + tests)
Removed: 0 lines
Net Change: +150 lines
Phase: Enhancement (Phase 2 - production-ready quality)
```

## Future Enhancements

1. **Auto-fix option**: Add a tool to automatically fix title without asking
2. **Confidence scoring**: Add confidence level to mismatch detection
3. **Multi-destination trips**: Handle complex itineraries with multiple destinations
4. **Description mismatch**: Also check and fix description field
5. **Batch detection**: Check all itineraries and report mismatches

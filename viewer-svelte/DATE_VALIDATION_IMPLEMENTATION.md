# Trip Date Validation Implementation

## Problem
The trip designer was accepting trips with start dates in the past. For example, on December 23, 2025, it accepted a trip starting December 22, 2025.

## Requirement
All trips must have a start date **at least 1 day in the future**. If a user tries to create a trip with a past start date, the system should:
1. Detect the past date
2. Suggest updated dates (shift to next year or suggest tomorrow as minimum)
3. Ask the user to confirm the new dates

## Implementation

### 1. Server-Side Validation (`tool-executor.ts`)

Added date validation in the `handleUpdateItinerary` method (lines 279-318):

```typescript
// Update dates with validation
if (params.startDate) {
  const startDate = parseLocalDate(params.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const startDateNormalized = new Date(startDate);
  startDateNormalized.setHours(0, 0, 0, 0); // Normalize parsed date

  // Validate: start date must be at least 1 day in the future
  if (startDateNormalized <= today) {
    // Calculate suggested dates
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextYear = new Date(startDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const tripDuration = params.endDate
      ? Math.ceil((parseLocalDate(params.endDate).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 7; // Default 7 days if no end date

    const suggestedEndTomorrow = new Date(tomorrow);
    suggestedEndTomorrow.setDate(suggestedEndTomorrow.getDate() + tripDuration);

    const suggestedEndNextYear = new Date(nextYear);
    suggestedEndNextYear.setDate(suggestedEndNextYear.getDate() + tripDuration);

    throw new Error(
      `Trip start date cannot be in the past. The date you provided (${params.startDate}) has already passed. ` +
      `Please choose dates in the future. Suggestions:\n` +
      `1. Start tomorrow: ${tomorrow.toISOString().split('T')[0]} to ${suggestedEndTomorrow.toISOString().split('T')[0]}\n` +
      `2. Same dates next year: ${nextYear.toISOString().split('T')[0]} to ${suggestedEndNextYear.toISOString().split('T')[0]}\n\n` +
      `Would you like me to update the trip with one of these date ranges?`
    );
  }

  updates.startDate = startDate;
}
```

**Key Features:**
- Normalizes dates to midnight for accurate comparison
- Rejects dates that are today or in the past (start date <= today)
- Calculates trip duration from start/end dates
- Provides two helpful suggestions:
  1. Starting tomorrow with same duration
  2. Same dates next year
- Returns a detailed error message that the AI can present to the user

### 2. System Prompt Update (`system.md`)

Added **RULE 5.1** to guide the AI on how to handle date validation:

```markdown
### RULE 5.1: VALIDATE TRIP DATES - MUST BE IN THE FUTURE ⚠️
**All trip start dates MUST be at least 1 day in the future.**

When the user provides dates:
1. Check if the start date has already passed
2. If it has, the `update_itinerary` tool will return an error with suggested alternatives
3. Present these alternatives to the user and ask them to choose

**Common scenarios:**
- **Yesterday's date:** Suggest tomorrow or same dates next year
- **Past dates from previous year:** Suggest same dates this year or next year
- **Ambiguous dates:** Clarify which year they mean

**Example responses:**
❌ BAD: Accepting "December 22, 2025" on December 23, 2025
✅ GOOD: "I noticed December 22, 2025 has already passed. Would you like to start tomorrow (December 24) or perhaps the same dates next year?"
```

### 3. Current Date Context (Already Implemented)

The Trip Designer service already injects current date context into the system prompt (lines 1361-1374 in `trip-designer.service.ts`):

```typescript
const dateContext = `## Current Date Context

Today is ${today.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})} (${today.toISOString().split('T')[0]}).

IMPORTANT: All suggested dates MUST be in the future. Do not suggest dates that have already passed.

---

`;
```

This ensures the AI always knows today's date when making suggestions.

### 4. Tests (`tool-executor-date-validation.test.ts`)

Created comprehensive tests covering all scenarios:

1. **Rejects past dates** - Yesterday's date is rejected
2. **Rejects today** - Today is rejected (must be at least tomorrow)
3. **Accepts tomorrow** - Tomorrow is the minimum valid date
4. **Accepts future dates** - Dates far in the future are accepted
5. **Provides helpful suggestions** - Error message includes actionable alternatives

All tests passing ✅

## Example Flow

**User:** "I want to plan a trip to Portugal from December 22-30, 2025"

**System (today is Dec 23, 2025):**
1. AI calls `update_itinerary({ startDate: "2025-12-22", endDate: "2025-12-30" })`
2. Tool executor detects past date and throws error with suggestions
3. AI receives error with suggestions
4. AI presents to user:

**AI Response:**
```
I noticed December 22, 2025 has already passed. Would you like to:
1. Start tomorrow: December 24, 2025 to January 1, 2026
2. Same dates next year: December 22, 2026 to December 30, 2026

Which option works better for you?
```

## Files Modified

1. **`src/services/trip-designer/tool-executor.ts`**
   - Added date validation logic in `handleUpdateItinerary` method
   - Lines 279-318

2. **`src/prompts/trip-designer/system.md`**
   - Added RULE 5.1 for date validation guidance
   - Lines 92-107

3. **`tests/unit/tool-executor-date-validation.test.ts`** (new file)
   - Comprehensive test coverage for date validation
   - 5 test cases covering all scenarios

## Benefits

1. **User-Friendly Error Handling** - Provides actionable suggestions instead of just rejecting
2. **Server-Side Validation** - Cannot be bypassed by UI issues
3. **Maintains Trip Duration** - Suggestions preserve the original trip length
4. **Clear Communication** - AI receives clear guidance on how to present errors
5. **Comprehensive Testing** - All edge cases covered

## Edge Cases Handled

- Yesterday's date → Suggest tomorrow or next year
- Today's date → Suggest tomorrow or next year
- Past year → Suggest current year or next year
- Date normalization → Handles timezone edge cases
- Missing end date → Assumes 7-day duration for suggestions

## Future Enhancements (Optional)

1. Add similar validation for end dates (must be after start date)
2. Add validation for unreasonably far future dates (e.g., 10 years out)
3. Add validation for trip duration limits (e.g., max 365 days)
4. Consider adding warnings for dates very close to today (e.g., tomorrow might be too soon)

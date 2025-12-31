# Trip Designer Date Parsing Bug Investigation

**Date:** 2025-12-23
**Investigator:** Research Agent
**Issue:** Off-by-one error when parsing dates from AI responses

## Problem Description

When a user provides a date like "April 15-22", the system stores "4/14/2026 - 4/21/2026" (off by one day on both dates).

**Example:**
- User input: "Yes, update to April 15-22"
- Expected storage: April 15-22, 2026
- Actual storage: April 14-21, 2026 (off by one day!)

## Root Cause Analysis

### 1. Date Parsing Location

The date parsing occurs in **`src/services/trip-designer/tool-executor.ts`** at lines 275-280:

```typescript
// Update dates
if (params.startDate) {
  updates.startDate = new Date(params.startDate);
}
if (params.endDate) {
  updates.endDate = new Date(params.endDate);
}
```

### 2. The Timezone Problem

The issue is caused by the `new Date(string)` constructor when given an ISO date string (e.g., `"2026-04-15"`):

**What happens:**
1. AI provides date in ISO format: `"2026-04-15"`
2. `new Date("2026-04-15")` creates a Date object at **midnight UTC**
3. In US timezones (UTC-5 to UTC-8), midnight UTC becomes **previous day's evening**
4. Example: `new Date("2026-04-15")` in PST (UTC-8) → April 14, 2026 at 4:00 PM

**Demonstration:**
```javascript
// Timezone issue:
new Date("2026-04-15")
// → Wed Apr 15 2026 00:00:00 GMT+0000 (UTC)
// In PST: Tue Apr 14 2026 16:00:00 GMT-0800

// When converted to local date string:
new Date("2026-04-15").toLocaleDateString()
// → "4/14/2026" (off by one!)
```

### 3. Date Schema Definition

The date schema in **`src/domain/schemas/common.schema.ts`** line 17:

```typescript
/**
 * Date schema - coerces string/number to Date
 */
export const dateSchema = z.coerce.date();
```

This uses Zod's `coerce.date()` which internally calls `new Date()` with the same timezone problem.

### 4. Similar Issues Elsewhere

The same pattern appears in multiple handlers:

**Flight handler (line 414):**
```typescript
startDatetime: new Date(params.departureTime),
endDatetime: new Date(params.arrivalTime),
```

**Hotel handler (lines 438-441):**
```typescript
const checkInDate = new Date(params.checkInDate);
const checkOutDate = new Date(params.checkOutDate);
```

**Activity handler (line 493):**
```typescript
const startTime = new Date(params.startTime);
```

**Transfer handler (line 544):**
```typescript
const pickupTime = new Date(params.pickupTime);
```

**Meeting handler (line 575):**
```typescript
startDatetime: new Date(params.startTime),
endDatetime: new Date(params.endTime),
```

## Impact Assessment

**Severity:** HIGH
**Scope:** All date parsing in Trip Designer service

**Affected Operations:**
- ✅ `update_itinerary` - startDate/endDate parsing
- ✅ `add_flight` - departure/arrival times
- ✅ `add_hotel` - check-in/check-out dates
- ✅ `add_activity` - start/end times
- ✅ `add_transfer` - pickup times
- ✅ `add_meeting` - meeting times

## Recommended Fix

### Strategy 1: Parse as Local Date (Recommended for Day-Precision)

For dates that represent "a day" without specific time (like trip dates, check-in/out):

```typescript
/**
 * Parse ISO date string as local date (avoids timezone issues)
 * @param isoDateString - ISO date in YYYY-MM-DD format
 * @returns Date object at noon local time (safe from timezone rollover)
 */
function parseLocalDate(isoDateString: string): Date {
  // Parse as local date at noon to avoid timezone rollover
  const [year, month, day] = isoDateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}
```

**Why noon?** Setting time to noon (12:00) ensures the date won't roll over to previous/next day in any timezone.

### Strategy 2: Parse as UTC with Time Component

For datetime values that include time (flights, activities):

```typescript
/**
 * Parse ISO datetime string
 * @param isoString - ISO datetime string
 * @returns Date object preserving timezone
 */
function parseDateTime(isoString: string): Date {
  // If no time component, add noon local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    return parseLocalDate(isoString);
  }
  // Has time component, use standard parsing
  return new Date(isoString);
}
```

### Implementation Plan

**Step 1: Create Date Utility Module**

Create `src/utils/date-parser.ts`:

```typescript
/**
 * Date parsing utilities that avoid timezone issues
 * @module utils/date-parser
 */

/**
 * Parse ISO date string (YYYY-MM-DD) as local date
 * Avoids timezone rollover by using noon local time
 */
export function parseLocalDate(isoDateString: string): Date {
  const [year, month, day] = isoDateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Parse datetime string intelligently
 * - Date-only (YYYY-MM-DD) → local date at noon
 * - With time → standard parsing
 */
export function parseDateTime(isoString: string): Date {
  // Check if date-only format
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    return parseLocalDate(isoString);
  }
  // Has time component
  return new Date(isoString);
}
```

**Step 2: Update tool-executor.ts**

Replace all `new Date(params.*)` calls:

```typescript
import { parseLocalDate, parseDateTime } from '../../utils/date-parser.js';

// In handleUpdateItinerary (lines 275-280):
if (params.startDate) {
  updates.startDate = parseLocalDate(params.startDate);
}
if (params.endDate) {
  updates.endDate = parseLocalDate(params.endDate);
}

// In handleAddFlight (line 414):
startDatetime: parseDateTime(params.departureTime),
endDatetime: parseDateTime(params.arrivalTime),

// In handleAddHotel (lines 438-441):
const checkInDate = parseLocalDate(params.checkInDate);
const checkOutDate = parseLocalDate(params.checkOutDate);

// In handleAddActivity (line 493):
const startTime = parseDateTime(params.startTime);

// In handleAddTransfer (line 544):
const pickupTime = parseDateTime(params.pickupTime);

// In handleAddMeeting (line 575):
startDatetime: parseDateTime(params.startTime),
endDatetime: parseDateTime(params.endTime),
```

**Step 3: Update Zod Schema (Optional Enhancement)**

Consider creating custom Zod transform for date schemas:

```typescript
// In src/domain/schemas/common.schema.ts

import { parseLocalDate } from '../../utils/date-parser.js';

/**
 * Local date schema - parses as local date (avoids timezone issues)
 */
export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
  .transform(parseLocalDate);
```

## Testing Strategy

### Unit Tests

Create `tests/unit/utils/date-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseLocalDate, parseDateTime } from '../../../src/utils/date-parser.js';

describe('Date Parser', () => {
  describe('parseLocalDate', () => {
    it('should parse date as local noon', () => {
      const date = parseLocalDate('2026-04-15');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(3); // April (0-indexed)
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(12); // Noon
    });

    it('should not have timezone rollover', () => {
      const date = parseLocalDate('2026-04-15');
      const localDateString = date.toLocaleDateString('en-US');
      expect(localDateString).toBe('4/15/2026');
    });

    it('should handle end of month correctly', () => {
      const date = parseLocalDate('2026-04-30');
      expect(date.getDate()).toBe(30);
    });
  });

  describe('parseDateTime', () => {
    it('should parse date-only as local date', () => {
      const date = parseDateTime('2026-04-15');
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(12);
    });

    it('should parse datetime with time component', () => {
      const date = parseDateTime('2026-04-15T14:30:00Z');
      expect(date.toISOString()).toBe('2026-04-15T14:30:00.000Z');
    });
  });
});
```

### Integration Tests

Create test in `tests/e2e/trip-designer-dates.e2e.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TripDesignerService } from '../../src/services/trip-designer/trip-designer.service.js';

describe('Trip Designer Date Handling', () => {
  it('should store dates correctly without timezone rollover', async () => {
    // Create itinerary
    const itinerary = await createTestItinerary();

    // Update dates via tool executor
    await tripDesigner.processMessage({
      content: 'Update trip dates to April 15-22, 2026',
      itineraryId: itinerary.id,
    });

    // Verify dates stored correctly
    const updated = await itineraryService.get(itinerary.id);
    expect(updated.value.startDate.toLocaleDateString('en-US')).toBe('4/15/2026');
    expect(updated.value.endDate.toLocaleDateString('en-US')).toBe('4/22/2026');
  });
});
```

## Alternative Solutions Considered

### Alternative 1: Store Dates as ISO Strings

Instead of Date objects, store dates as ISO strings (`YYYY-MM-DD`) in the database:

**Pros:**
- No timezone ambiguity
- JSON serialization works perfectly
- Human-readable in database

**Cons:**
- Breaking change to existing data model
- Need to update all date comparisons
- Type safety issues (string vs Date)

**Verdict:** Too invasive for this fix. Consider for v2.0.

### Alternative 2: Always Use UTC

Force all dates to be interpreted as UTC:

```typescript
new Date(params.startDate + 'T00:00:00Z')
```

**Pros:**
- Simple one-line fix
- Consistent timezone handling

**Cons:**
- Still has rollover issues (just in different direction)
- Users in UTC+X timezones would see next day
- Doesn't solve the fundamental problem

**Verdict:** Not recommended. Inconsistent user experience.

### Alternative 3: Use date-fns or Luxon

Use a date library for parsing:

```typescript
import { parseISO } from 'date-fns';
const date = parseISO(params.startDate);
```

**Pros:**
- Battle-tested library
- Rich API for date manipulation

**Cons:**
- Adds dependency (13.8 KB minified for date-fns)
- Still has same timezone issue (parseISO uses Date constructor)
- Overkill for this simple fix

**Verdict:** Not needed. Our utility function is sufficient.

## Migration Strategy

### Backward Compatibility

Existing itineraries may have dates stored with timezone rollover. Consider:

1. **No migration needed** - New dates will be correct, old dates stay as-is
2. **Optional migration script** - Fix existing dates if needed:

```typescript
// scripts/fix-date-rollover.ts
import { getAllItineraries, updateItinerary } from './storage';

for (const itinerary of await getAllItineraries()) {
  // Check if dates look wrong (e.g., end date before start date)
  if (needsDateFix(itinerary)) {
    await updateItinerary(itinerary.id, {
      startDate: fixDate(itinerary.startDate),
      endDate: fixDate(itinerary.endDate),
    });
  }
}
```

### Rollout Plan

1. **Week 1:** Deploy date parser utility
2. **Week 2:** Update tool-executor.ts
3. **Week 3:** Monitor logs for date parsing issues
4. **Week 4:** Run migration script for existing data (if needed)

## Related Issues

- [ ] Check if frontend has similar date parsing issues
- [ ] Verify date display in UI (formatting consistency)
- [ ] Review API serialization (JSON dates as ISO strings?)
- [ ] Check if storage layer needs date normalization

## References

- MDN: [Date - JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- Stack Overflow: [Why does Date.parse give incorrect results?](https://stackoverflow.com/questions/2587345/)
- ISO 8601: Date and time format standard

## Conclusion

The bug is caused by `new Date()` parsing ISO date strings as UTC midnight, which rolls over to the previous day in western timezones. The fix is straightforward: use a custom `parseLocalDate()` utility that creates dates at noon local time, avoiding timezone rollover entirely.

**Recommended Action:** Implement Strategy 1 (parseLocalDate utility) immediately. This is a high-priority fix affecting all date operations in Trip Designer.

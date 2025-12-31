# Date Parsing Migration Guide

## Problem

Previously, the application used three different date parsing methods, causing timezone bugs:

1. **`z.coerce.date()`** in Zod schemas - converts to UTC midnight
2. **`new Date(str)`** in API routes - same UTC behavior
3. **`parseLocalDate()`** in `src/utils/date-parser.ts` - uses local noon to avoid timezone rollover

**Bug Example (PST timezone):**
```typescript
// OLD: Using z.coerce.date()
const schema = z.object({ startDate: z.coerce.date() });
schema.parse({ startDate: '2025-12-25' });
// Result: 2025-12-24T08:00:00.000Z (midnight UTC = 4pm PST Dec 24!)
// In PST, this displays as Dec 24, not Dec 25! ❌
```

## Solution

**Single source of truth:** `parseDateSafe()` and `safeDateSchema`

Located in: `src/utils/date-parser.ts`

### Key Functions

#### `parseDateSafe(input: string | Date | undefined | null): Date | undefined`

Safe date parsing that prevents timezone rollover:

```typescript
import { parseDateSafe } from '@/utils/date-parser';

// Date-only strings → local noon (prevents rollover)
parseDateSafe('2025-12-25');
// → Date at 2025-12-25T12:00:00 local time ✅

// Datetime strings → preserve time
parseDateSafe('2025-12-25T10:30:00');
// → Date at 2025-12-25T10:30:00 local time ✅

// Date objects → return as-is (if valid)
parseDateSafe(new Date(2025, 11, 25));
// → Same Date object ✅

// Invalid input → undefined
parseDateSafe(undefined); // → undefined
parseDateSafe('invalid'); // → undefined
parseDateSafe('2025-02-30'); // → undefined (invalid date)
```

#### `safeDateSchema` (Zod)

Zod-compatible schema for use in validation:

```typescript
import { safeDateSchema } from '@/domain/schemas/common.schema';
import { z } from 'zod';

const itinerarySchema = z.object({
  startDate: safeDateSchema, // Optional, uses parseDateSafe
  endDate: safeDateSchema,
});

itinerarySchema.parse({
  startDate: '2025-12-25', // → Date at noon local time
  endDate: undefined,      // → undefined
});
```

## Migration Path

### Phase 1: Update Schemas (CURRENT)

✅ **Completed:**
- `src/utils/date-parser.ts` - Enhanced with `parseDateSafe()` and `safeDateSchema`
- `src/domain/schemas/common.schema.ts` - Exported `safeDateSchema`, deprecated `dateSchema`
- Unit tests added: `tests/unit/date-parser.test.ts`

### Phase 2: Gradual Schema Migration

Replace `z.coerce.date()` with `safeDateSchema`:

**Before:**
```typescript
import { z } from 'zod';

const schema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});
```

**After:**
```typescript
import { z } from 'zod';
import { safeDateSchema } from '@/domain/schemas/common.schema';

const schema = z.object({
  startDate: safeDateSchema,
  endDate: safeDateSchema,
});
```

**Files to update:**
- `src/domain/schemas/itinerary.schema.ts`
- `src/domain/schemas/segment.schema.ts`
- Any other schemas using `z.coerce.date()`

### Phase 3: API Route Migration

Replace `new Date(str)` with `parseDateSafe()` in API handlers:

**Before:**
```typescript
export async function POST({ request }) {
  const { startDate } = await request.json();
  const date = new Date(startDate); // ❌ UTC midnight
}
```

**After:**
```typescript
import { parseDateSafe } from '@/utils/date-parser';

export async function POST({ request }) {
  const { startDate } = await request.json();
  const date = parseDateSafe(startDate); // ✅ Local noon

  if (!date) {
    return json({ error: 'Invalid date' }, { status: 400 });
  }
}
```

### Phase 4: Cleanup

Once all migrations are complete:
1. Remove deprecated `dateSchema` from `common.schema.ts`
2. Update all documentation to reference `safeDateSchema`
3. Add ESLint rule to prevent `z.coerce.date()` usage

## Testing

Run the date parser tests:

```bash
npm test -- tests/unit/date-parser.test.ts
```

Expected: All 20 tests passing ✅

## Benefits

✅ **No timezone rollover bugs** - Date-only strings parsed as local noon
✅ **Single source of truth** - One parsing strategy across the app
✅ **Type-safe** - TypeScript and Zod validation
✅ **Graceful error handling** - Returns `undefined` for invalid dates
✅ **Preserves datetime precision** - Full datetime strings keep their time
✅ **Invalid date detection** - Rejects Feb 30, month 13, etc.

## Examples

### Itinerary Schema Migration

**Before:**
```typescript
export const itinerarySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  createdAt: z.coerce.date(),
});
```

**After:**
```typescript
import { safeDateSchema } from './common.schema';

export const itinerarySchema = z.object({
  startDate: safeDateSchema,
  endDate: safeDateSchema,
  createdAt: safeDateSchema, // Or keep z.coerce.date() for timestamps
});
```

**Note:** For actual timestamps (ISO 8601 with time), `z.coerce.date()` is fine. Use `safeDateSchema` for date-only fields (startDate, endDate, birthDate, etc.)

### API Handler Migration

**Before:**
```typescript
const params = {
  startDate: new Date(body.startDate),
  endDate: new Date(body.endDate),
};
```

**After:**
```typescript
import { parseDateSafe } from '@/utils/date-parser';

const startDate = parseDateSafe(body.startDate);
const endDate = parseDateSafe(body.endDate);

if (!startDate || !endDate) {
  return json({ error: 'Invalid date format' }, { status: 400 });
}

const params = { startDate, endDate };
```

## Rollout Strategy

1. ✅ **Create utility** - `parseDateSafe()` and `safeDateSchema` (DONE)
2. **Update schemas** - Replace `z.coerce.date()` in domain schemas
3. **Update API routes** - Replace `new Date(str)` in API handlers
4. **Test thoroughly** - Verify no regressions in date handling
5. **Deploy** - Ship to production
6. **Cleanup** - Remove deprecated patterns

## Related Files

- `src/utils/date-parser.ts` - Core date parsing utilities
- `src/domain/schemas/common.schema.ts` - Zod schema exports
- `tests/unit/date-parser.test.ts` - Comprehensive unit tests
- `docs/research/trip-designer-date-parsing-bug-2025-12-23.md` - Original bug report

---

**Status:** Phase 1 complete. Ready for gradual schema migration.

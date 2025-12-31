# Date Parsing - Quick Reference

## 🚀 Quick Start

```typescript
import { parseDateSafe, safeDateSchema } from '@/utils/date-parser';
import { safeDateSchema } from '@/domain/schemas/common.schema'; // Also available
```

## ⚡ Common Use Cases

### 1. Parse User Input (API Routes)

```typescript
// Before (❌ timezone bug)
const startDate = new Date(body.startDate); // Dec 25 → Dec 24 in PST!

// After (✅ correct)
import { parseDateSafe } from '@/utils/date-parser';

const startDate = parseDateSafe(body.startDate);
if (!startDate) {
  return json({ error: 'Invalid date' }, { status: 400 });
}
```

### 2. Zod Schema Validation

```typescript
// Before (❌ timezone bug)
const schema = z.object({
  startDate: z.coerce.date(),
});

// After (✅ correct)
import { safeDateSchema } from '@/domain/schemas/common.schema';

const schema = z.object({
  startDate: safeDateSchema,
  endDate: safeDateSchema,
});
```

### 3. Optional Dates

```typescript
import { safeDateSchema } from '@/domain/schemas/common.schema';

const schema = z.object({
  requiredDate: safeDateSchema,
  optionalDate: safeDateSchema, // Already optional by default
});

schema.parse({
  requiredDate: '2025-12-25',
  optionalDate: undefined, // ✅ Works
});
```

## 📖 API Reference

### `parseDateSafe(input)`

Safe date parser that prevents timezone rollover bugs.

**Signature:**
```typescript
function parseDateSafe(
  input: string | Date | undefined | null
): Date | undefined
```

**Behavior:**

| Input | Output |
|-------|--------|
| `'2025-12-25'` | `Date` at 2025-12-25 12:00:00 local |
| `'2025-12-25T10:30:00'` | `Date` at 2025-12-25 10:30:00 local |
| `new Date()` | Same `Date` (if valid) |
| `undefined` | `undefined` |
| `null` | `undefined` |
| `'invalid'` | `undefined` |
| `'2025-02-30'` | `undefined` (invalid date) |

**Examples:**

```typescript
import { parseDateSafe } from '@/utils/date-parser';

// Valid dates
parseDateSafe('2025-12-25'); // → Date at noon
parseDateSafe('2025-12-25T10:30:00'); // → Date at 10:30am

// Invalid/missing
parseDateSafe(undefined); // → undefined
parseDateSafe('invalid'); // → undefined
parseDateSafe('2025-02-30'); // → undefined
```

### `safeDateSchema`

Zod schema for date validation using `parseDateSafe()`.

**Signature:**
```typescript
const safeDateSchema: z.ZodOptional<z.ZodType<Date | undefined>>
```

**Type:**
```typescript
// Input type (what you pass in)
type Input = string | Date | undefined | null;

// Output type (what you get)
type Output = Date | undefined;
```

**Examples:**

```typescript
import { safeDateSchema } from '@/domain/schemas/common.schema';
import { z } from 'zod';

// Basic usage
safeDateSchema.parse('2025-12-25'); // → Date
safeDateSchema.parse(undefined); // → undefined

// In object schemas
const tripSchema = z.object({
  startDate: safeDateSchema,
  endDate: safeDateSchema,
});

tripSchema.parse({
  startDate: '2025-12-25',
  endDate: '2025-12-31',
});
// → { startDate: Date, endDate: Date }
```

## 🐛 Common Pitfalls

### ❌ DON'T: Use `z.coerce.date()` for date-only fields

```typescript
// ❌ BAD - Causes timezone rollover
const schema = z.object({
  startDate: z.coerce.date(), // Dec 25 → Dec 24 in PST!
});
```

### ✅ DO: Use `safeDateSchema` instead

```typescript
// ✅ GOOD - Prevents timezone rollover
import { safeDateSchema } from '@/domain/schemas/common.schema';

const schema = z.object({
  startDate: safeDateSchema, // Dec 25 stays Dec 25
});
```

### ❌ DON'T: Use `new Date(str)` for user input

```typescript
// ❌ BAD - Timezone bug
const date = new Date('2025-12-25'); // Dec 24 at 4pm PST!
```

### ✅ DO: Use `parseDateSafe()` instead

```typescript
// ✅ GOOD - Correct local date
import { parseDateSafe } from '@/utils/date-parser';

const date = parseDateSafe('2025-12-25'); // Dec 25 at noon
```

## 🔍 When to Use What

| Scenario | Use This |
|----------|----------|
| **User enters date** (e.g., "2025-12-25") | `parseDateSafe()` or `safeDateSchema` |
| **API accepts date strings** | `safeDateSchema` in request schema |
| **Timestamp with time** (e.g., createdAt) | `z.coerce.date()` is fine |
| **Date validation in schemas** | `safeDateSchema` |
| **Date parsing in API handlers** | `parseDateSafe()` |

## 📋 Migration Checklist

Migrating from old date parsing? Use this checklist:

- [ ] Replace `z.coerce.date()` with `safeDateSchema` in schemas
- [ ] Replace `new Date(str)` with `parseDateSafe()` in API handlers
- [ ] Test with PST timezone to verify no rollover
- [ ] Update tests to expect noon instead of midnight
- [ ] Remove `z.coerce.date()` from date-only fields

## 🧪 Testing

```typescript
import { parseDateSafe } from '@/utils/date-parser';
import { describe, it, expect } from 'vitest';

describe('Date handling', () => {
  it('should parse dates at local noon', () => {
    const date = parseDateSafe('2025-12-25');
    expect(date?.getDate()).toBe(25);
    expect(date?.getHours()).toBe(12); // Noon
  });

  it('should handle invalid dates', () => {
    expect(parseDateSafe('2025-02-30')).toBeUndefined();
    expect(parseDateSafe('invalid')).toBeUndefined();
  });
});
```

## 📚 Further Reading

- Full migration guide: [`docs/DATE_PARSING_MIGRATION.md`](./DATE_PARSING_MIGRATION.md)
- Implementation details: [`DATE_PARSING_UTILITY_SUMMARY.md`](../DATE_PARSING_UTILITY_SUMMARY.md)
- Source code: [`src/utils/date-parser.ts`](../src/utils/date-parser.ts)
- Tests: [`tests/unit/date-parser.test.ts`](../tests/unit/date-parser.test.ts)

---

**TL;DR:**
- Use `parseDateSafe()` for parsing date strings
- Use `safeDateSchema` in Zod schemas
- Avoid `z.coerce.date()` and `new Date(str)` for date-only fields

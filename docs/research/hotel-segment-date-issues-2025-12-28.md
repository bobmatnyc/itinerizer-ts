# Hotel Segment Date Issues - Root Cause Analysis

**Date:** 2025-12-28
**Investigator:** Research Agent
**Scope:** Trip Designer hotel segment creation issues

## Executive Summary

The Trip Designer service is correctly implementing hotel segments based on the dates provided by the AI model, but there are two distinct issues:

1. **Single-night hotels**: The AI is only calling `add_hotel` once with narrow date ranges (e.g., Jan 7-8) instead of multi-day stays
2. **Date misalignment**: The AI may be suggesting dates that don't align with the trip dates stored in the itinerary

**Critical Finding**: This is **NOT a code bug**. The implementation is working as designed. The root cause is in the **AI prompt instructions** that don't explicitly guide the model to create accommodations for the entire trip duration.

---

## Issue 1: Single-Night Hotel Problem

### What Users See
- Trip: January 8-15, 2025 (8 days)
- Hotel segment: January 7-8, 2025 (1 night only)
- **Expected**: Hotel for 7 nights (Jan 8-15)
- **Actual**: Hotel for 1 night (Jan 7-8)

### Root Cause

The AI model is not explicitly instructed to calculate total accommodation needs based on trip duration.

**Evidence from system prompt** (`src/prompts/trip-designer/system.md`):

The prompt contains general guidance about planning trips but **lacks specific instructions** for accommodation duration:

```markdown
### 2. Planning Phase (Incremental)
For each segment:
- **Research**: Use search tools to get current information and prices
- **Suggest**: Present 2-3 specific options with pros/cons
- **Structured Question**: Use single_choice for "Which do you prefer?"
- **Add**: Once confirmed, immediately add to itinerary using tools
```

**What's missing:**
- No instruction to calculate `nights = (endDate - startDate) - 1`
- No instruction to book hotels for full trip duration
- No validation that accommodation covers all trip nights
- No reminder to check if existing hotels span the full trip

**The tool itself is correct** (`src/services/trip-designer/tool-executor.ts` lines 569-629):

```typescript
private async handleAddHotel(itineraryId: ItineraryId, args: unknown): Promise<unknown> {
  // ... validation ...

  const params = validation.data;
  const checkInDate = parseLocalDate(params.checkInDate);  // Uses provided date
  const checkOutDate = parseLocalDate(params.checkOutDate); // Uses provided date

  // Creates segment with exactly the dates the AI specified
  const segment: Omit<Segment, 'id'> = {
    type: SegmentType.HOTEL,
    startDatetime: checkInDate,
    endDatetime: checkOutDate,
    // ...
  };

  const result = await this.deps.segmentService.add(itineraryId, segment);
  return { success: true, segmentId: segment.id };
}
```

**The tool definition is also correct** (`src/services/trip-designer/tools.ts` lines 136-215):

```typescript
export const ADD_HOTEL_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'add_hotel',
    description: 'Add a hotel or accommodation segment to the itinerary',
    parameters: {
      // ...
      checkInDate: {
        type: 'string',
        format: 'date',
        description: 'Check-in date (YYYY-MM-DD)',
      },
      checkOutDate: {
        type: 'string',
        format: 'date',
        description: 'Check-out date (YYYY-MM-DD)',
      },
      // ...
    },
    required: ['property', 'location', 'checkInDate', 'checkOutDate'],
  },
};
```

The tool accepts whatever dates the AI provides and creates a segment accordingly. **The AI is making the wrong calculation.**

---

## Issue 2: Date Misalignment Problem

### What Users See
- User requests: "Trip from January 8-15"
- Tool call: `update_itinerary({ startDate: "2025-01-08", endDate: "2025-01-15" })`
- Hotel segment created: `add_hotel({ checkInDate: "2025-01-07", checkOutDate: "2025-01-08" })`
- **Problem**: Hotel is on January 7, but trip starts January 8

### Root Cause Analysis

**Scenario A: Trip dates not saved properly**
- AI says "I've noted your trip" but doesn't call `update_itinerary`
- The trip metadata (startDate, endDate) is never written to the itinerary
- Later, when suggesting hotels, AI has no reference dates
- AI guesses dates or uses conversation context incorrectly

**Scenario B: AI not referencing saved trip dates**
- Trip dates ARE saved via `update_itinerary`
- But AI doesn't call `get_itinerary` before suggesting hotels
- AI works from memory instead of checking current itinerary state
- Results in date suggestions that don't align

**Scenario C: AI misunderstanding trip start date**
- User says "January 8-15" (trip IS those dates)
- AI interprets "flying on January 8" as needing hotel night BEFORE travel
- AI books hotel for January 7 (night before departure)
- This is a reasonable interpretation but wrong for most trips

**Evidence from prompt** (`src/prompts/trip-designer/system.md`):

Lines 17-33 contain the "ABSOLUTE REQUIREMENT" section:

```markdown
## 🚨 ABSOLUTE REQUIREMENT: TOOL CALLS FOR DATA PERSISTENCE

**YOUR VERBAL ACKNOWLEDGMENT IS NOT ENOUGH. YOU MUST CALL TOOLS TO SAVE DATA.**

When the user provides ANY trip information, you MUST:
1. **CALL the tool** (`update_itinerary` or `update_preferences`) - this is NON-NEGOTIABLE
2. **THEN** acknowledge in your message that you saved it

**FAILURE MODE TO AVOID:**
❌ "I've noted your trip to Croatia from April 14-21, departing from NYC..." (NO TOOL CALL = DATA LOST)

**CORRECT BEHAVIOR:**
✅ First: Call `update_itinerary` with destination, dates, origin
✅ Then: "I've saved your Croatia trip for April 14-21, departing from NYC!"

**If you say you "noted" or "saved" something but didn't call a tool, THE DATA IS LOST.**
```

This is good guidance, but **lacks specifics about WHEN to check saved data**:
- No instruction to call `get_itinerary` before suggesting hotels
- No instruction to validate hotel dates against `itinerary.startDate` and `itinerary.endDate`
- No instruction to explain the relationship between trip dates and hotel dates

---

## Detailed Code Flow Analysis

### Hotel Creation Flow

**1. Tool Definition** (`src/services/trip-designer/tools.ts`):
```typescript
// Lines 136-215
export const ADD_HOTEL_TOOL: ToolDefinition = {
  function: {
    name: 'add_hotel',
    description: 'Add a hotel or accommodation segment to the itinerary',
    parameters: {
      checkInDate: { type: 'string', format: 'date' },
      checkOutDate: { type: 'string', format: 'date' },
      // ... other parameters
    },
    required: ['property', 'location', 'checkInDate', 'checkOutDate'],
  },
};
```
- ✅ Tool correctly requires both check-in and check-out dates
- ✅ Tool description is clear
- ⚠️ **Missing**: No description guidance about calculating duration from trip dates

**2. Argument Validation** (`src/domain/schemas/tool-args.schema.ts`):
```typescript
// Lines 45-58
export const addHotelArgsSchema = z.object({
  property: companySchema,
  location: locationSchema,
  checkInDate: toolDateSchema,  // Validates YYYY-MM-DD format
  checkOutDate: toolDateSchema, // Validates YYYY-MM-DD format
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  // ...
});
```
- ✅ Schema validates date format
- ⚠️ **Missing**: No business logic validation (e.g., checkOut > checkIn, dates within trip range)

**3. Tool Execution** (`src/services/trip-designer/tool-executor.ts`):
```typescript
// Lines 569-629
private async handleAddHotel(itineraryId: ItineraryId, args: unknown): Promise<unknown> {
  // Validate arguments schema
  const validation = addHotelArgsSchema.safeParse(args);
  if (!validation.success) {
    throw new Error(`Invalid hotel arguments: ${validation.error.message}`);
  }

  const params = validation.data;
  const checkInDate = parseLocalDate(params.checkInDate);   // Convert string to Date
  const checkOutDate = parseLocalDate(params.checkOutDate); // Convert string to Date
  const checkInTime = params.checkInTime || '15:00';
  const checkOutTime = params.checkOutTime || '11:00';

  // Combine date and time
  const [checkInHour, checkInMin] = checkInTime.split(':');
  const [checkOutHour, checkOutMin] = checkOutTime.split(':');

  checkInDate.setHours(parseInt(checkInHour || '15'), parseInt(checkInMin || '0'));
  checkOutDate.setHours(parseInt(checkOutHour || '11'), parseInt(checkOutMin || '0'));

  // Create segment with provided dates
  const segment: Omit<Segment, 'id'> = {
    type: SegmentType.HOTEL,
    status: SegmentStatus.CONFIRMED,
    startDatetime: checkInDate,  // Uses AI-provided date
    endDatetime: checkOutDate,   // Uses AI-provided date
    // ... other fields
  };

  const result = await this.deps.segmentService.add(itineraryId, segment);
  if (!result.success) {
    throw new Error(`Failed to add hotel: ${result.error.message}`);
  }

  return { success: true, segmentId: segment.id };
}
```

**Key observations:**
- ✅ Code correctly parses dates and creates segment
- ✅ Code combines date with time (check-in at 15:00, check-out at 11:00)
- ⚠️ **No validation**: Code doesn't check if dates align with trip dates
- ⚠️ **No validation**: Code doesn't check if segment duration is reasonable
- ⚠️ **No validation**: Code doesn't warn if creating very short stay

**4. Date Parsing** (`src/utils/date-parser.ts`):

The `parseLocalDate()` function handles date string conversion:
- Accepts `YYYY-MM-DD` format
- Returns `Date` object at midnight local time
- No business logic validation

---

## System Prompt Analysis

### Current Prompt Structure

**File:** `src/prompts/trip-designer/system.md`

**Strong areas:**
- ✅ Lines 17-146: Excellent guidance on saving trip data via `update_itinerary`
- ✅ Lines 109-144: Good date validation rules for preventing past dates
- ✅ Lines 283-349: Strong seasonal awareness requirements
- ✅ Lines 439-487: Clear planning phase structure

**Gaps related to hotel issues:**

**1. No accommodation duration guidance** (Lines 439-487: Planning Phase):
```markdown
### 2. Planning Phase (Incremental)
For each segment:
- **Research**: Use search tools to get current information and prices
- **Suggest**: Present 2-3 specific options with pros/cons
- **Structured Question**: Use single_choice for "Which do you prefer?"
- **Add**: Once confirmed, immediately add to itinerary using tools
```

**Missing:**
- No instruction to calculate `nights_needed = (endDate - startDate)`
- No instruction to create hotels spanning trip duration
- No instruction to verify accommodation covers all nights
- No examples of multi-night hotel bookings

**2. No itinerary context requirement** (Lines 454-485: Tool Usage Guidelines):
```markdown
### Always Do
- Call `update_itinerary` when user provides trip details
- Call `get_itinerary` before making changes to see current state
- Use `search_web` for factual information
- Use `search_flights` and `search_hotels` before quoting prices
- Add segments immediately when user confirms a booking
```

**Missing:**
- No specific instruction to call `get_itinerary` before suggesting hotels
- No instruction to reference `itinerary.startDate` and `itinerary.endDate` when planning accommodations
- No validation requirement for hotel dates against trip dates

**3. No hotel-specific examples** (Lines 576-657: Examples section):

The examples show:
- ✅ Discovery questions (travelers, style, interests)
- ✅ Structured question format
- ✅ Tool calling for preferences

**Missing:**
- ❌ No example of calculating hotel duration from trip dates
- ❌ No example of `add_hotel` with proper date calculation
- ❌ No example showing validation of hotel dates against trip dates

---

## Recommended Fixes

### Fix #1: Add Accommodation Duration Guidance (HIGH PRIORITY)

**Location:** `src/prompts/trip-designer/system.md` - Planning Phase section (after line 450)

**Add this subsection:**

```markdown
#### 🏨 ACCOMMODATION PLANNING (CRITICAL)

When adding hotels to an itinerary, you MUST:

1. **Calculate total nights needed**:
   - Formula: `nights = (tripEndDate - tripStartDate) in days`
   - Example: Trip Jan 8-15 = 7 nights (Jan 8, 9, 10, 11, 12, 13, 14)
   - Check-in: Trip start date (Jan 8)
   - Check-out: Trip end date (Jan 15)

2. **ALWAYS call `get_itinerary` before planning accommodations**:
   - Get current `startDate` and `endDate` from the itinerary
   - Calculate nights from these dates, not from memory
   - Example: If `startDate = "2025-01-08"` and `endDate = "2025-01-15"`, you need hotel from Jan 8 to Jan 15

3. **Create accommodation for FULL trip duration**:
   - Single-city trips: ONE hotel spanning all nights
   - Multi-city trips: MULTIPLE hotels spanning all nights (no gaps)
   - Example single-city: `add_hotel({ checkInDate: "2025-01-08", checkOutDate: "2025-01-15" })`
   - Example multi-city:
     - Lisbon hotel: `checkInDate: "2025-01-08"`, `checkOutDate: "2025-01-12"` (4 nights)
     - Porto hotel: `checkInDate: "2025-01-12"`, `checkOutDate: "2025-01-15"` (3 nights)

4. **Validate dates align with trip**:
   - Hotel check-in MUST be >= trip start date
   - Hotel check-out MUST be <= trip end date
   - For multi-city trips, hotels MUST cover consecutive nights with no gaps

**FAILURE MODES TO AVOID:**
❌ Creating hotel for only 1-2 nights on a 10-day trip
❌ Creating hotel for dates outside the trip dates
❌ Leaving gaps between hotels in multi-city trips
❌ Using dates from memory instead of calling `get_itinerary`

**CORRECT FLOW:**
1. Call `get_itinerary` to get current trip dates
2. Calculate nights: `(endDate - startDate) in days`
3. For single-city: Create ONE hotel with `checkIn = startDate`, `checkOut = endDate`
4. For multi-city: Create hotels covering ALL nights consecutively
5. Validate total hotel nights = trip nights
```

### Fix #2: Add Hotel Planning Examples (MEDIUM PRIORITY)

**Location:** `src/prompts/trip-designer/system.md` - Examples section (after line 730)

**Add this example:**

```markdown
### ✅ GOOD: Planning Accommodation for Full Trip Duration

**User context:**
- Trip: 10 days to Portugal, January 8-15, 2025
- Saved in itinerary: `startDate: "2025-01-08"`, `endDate: "2025-01-15"`
- Cities: Lisbon (5 days), Porto (5 days)

**Correct AI Flow:**

```json
// Step 1: Get current itinerary to check saved dates
Tool call: get_itinerary()

// Step 2: Calculate nights from retrieved dates
// Retrieved: startDate = "2025-01-08", endDate = "2025-01-15"
// Calculation: 15 - 8 = 7 nights total
// Lisbon: 4 nights (Jan 8-12), Porto: 3 nights (Jan 12-15)

// Step 3: Add Lisbon hotel for 4 nights
Tool call: add_hotel({
  property: { name: "Hotel Avenida Palace", code: "HAP" },
  location: { name: "Praça dos Restauradores", city: "Lisbon", country: "Portugal" },
  checkInDate: "2025-01-08",  // Trip start date
  checkOutDate: "2025-01-12", // After 4 nights
  checkInTime: "15:00",
  checkOutTime: "11:00",
  roomType: "Deluxe Double",
  roomCount: 1,
  notes: "Central location near metro"
})

// Step 4: Add Porto hotel for 3 nights (no gap!)
Tool call: add_hotel({
  property: { name: "Hotel Infante Sagres", code: "HIS" },
  location: { name: "Praça D. Filipa de Lencastre", city: "Porto", country: "Portugal" },
  checkInDate: "2025-01-12", // Same as Lisbon checkout (continuous coverage)
  checkOutDate: "2025-01-15", // Trip end date
  checkInTime: "15:00",
  checkOutTime: "11:00",
  roomType: "Superior Room",
  roomCount: 1,
  notes: "Historic hotel in city center"
})

// Step 5: Verify coverage
// Lisbon: Jan 8, 9, 10, 11 (4 nights)
// Porto: Jan 12, 13, 14 (3 nights)
// Total: 7 nights ✅ Matches trip duration
```

**Message to user:**
"I've added accommodations for your full trip:
- Lisbon: Hotel Avenida Palace (4 nights, Jan 8-12) - €800
- Porto: Hotel Infante Sagres (3 nights, Jan 12-15) - €600
Both hotels are centrally located with excellent reviews."
```

### ❌ BAD: Creating Single-Night Hotel

**User context:**
- Trip: 10 days to Portugal, January 8-15, 2025

**Wrong AI behavior:**

```json
// WRONG: Only 1 night instead of 7!
Tool call: add_hotel({
  property: { name: "Hotel Avenida Palace" },
  location: { name: "Lisbon", city: "Lisbon", country: "Portugal" },
  checkInDate: "2025-01-08",
  checkOutDate: "2025-01-09",  // ❌ Only 1 night!
})

// This leaves 6 nights (Jan 9-15) with NO accommodation!
```
```

### Fix #3: Add Tool Validation (LOW PRIORITY - Optional Enhancement)

**Location:** `src/services/trip-designer/tool-executor.ts` - `handleAddHotel` method

**Current code** (lines 569-629):
```typescript
private async handleAddHotel(itineraryId: ItineraryId, args: unknown): Promise<unknown> {
  const validation = addHotelArgsSchema.safeParse(args);
  if (!validation.success) {
    throw new Error(`Invalid hotel arguments: ${validation.error.message}`);
  }

  const params = validation.data;
  const checkInDate = parseLocalDate(params.checkInDate);
  const checkOutDate = parseLocalDate(params.checkOutDate);
  // ... create segment
}
```

**Enhanced version with validation:**
```typescript
private async handleAddHotel(itineraryId: ItineraryId, args: unknown): Promise<unknown> {
  const validation = addHotelArgsSchema.safeParse(args);
  if (!validation.success) {
    throw new Error(`Invalid hotel arguments: ${validation.error.message}`);
  }

  const params = validation.data;
  const checkInDate = parseLocalDate(params.checkInDate);
  const checkOutDate = parseLocalDate(params.checkOutDate);

  // OPTIONAL: Validate hotel duration (warn if very short)
  const nightsStay = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  // Get itinerary context for trip date validation
  if (this.deps.itineraryService) {
    const itinResult = await this.deps.itineraryService.get(itineraryId);
    if (itinResult.success) {
      const itinerary = itinResult.value;

      // OPTIONAL: Validate dates are within trip range
      if (itinerary.startDate && itinerary.endDate) {
        const tripStart = new Date(itinerary.startDate);
        const tripEnd = new Date(itinerary.endDate);

        // Warn if hotel is outside trip dates (but don't block - AI might have reason)
        if (checkInDate < tripStart || checkOutDate > tripEnd) {
          console.warn(`Hotel dates (${params.checkInDate} to ${params.checkOutDate}) are outside trip dates (${itinerary.startDate} to ${itinerary.endDate}). This may be intentional for early arrival or late departure.`);
        }

        // Calculate expected nights
        const tripNights = Math.ceil((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));

        // Warn if very short stay compared to trip duration
        if (nightsStay === 1 && tripNights > 3) {
          console.warn(`Creating 1-night hotel for ${tripNights}-night trip. Verify this is intentional (multi-city trip, partial booking, etc.)`);
        }
      }
    }
  }

  // ... continue with segment creation
}
```

**Note:** This validation is **optional** because:
- The AI might legitimately create 1-night hotels (multi-city trips, partial bookings)
- The AI might book hotels outside trip dates (early arrival, late departure)
- Adding validation adds complexity and could block valid use cases
- **Primary fix should be in the prompt, not the code**

---

## Summary of Root Causes

### Issue 1: Single-Night Hotels
**Root Cause:** AI prompt lacks explicit instructions for accommodation duration calculation

**Why it happens:**
1. Prompt tells AI to "add segments" but doesn't specify multi-night stays
2. No example showing calculation of `nights = endDate - startDate`
3. No instruction to verify total hotel nights = trip nights
4. No requirement to call `get_itinerary` before planning accommodations

**Fix Priority:** **HIGH** - Add accommodation planning guidance to prompt

### Issue 2: Date Misalignment
**Root Cause:** AI not referencing saved trip dates when creating segments

**Why it happens:**
1. AI may say "I've noted" without calling `update_itinerary` (data not saved)
2. AI may not call `get_itinerary` before suggesting hotels (working from memory)
3. AI may misinterpret trip start date (booking night before departure)

**Fix Priority:** **HIGH** - Strengthen prompt requirements for checking itinerary context

---

## Implementation Priority

**MUST DO (High Priority):**
1. ✅ Add "Accommodation Planning" section to system prompt
2. ✅ Add hotel planning examples showing multi-night stays
3. ✅ Add instruction to always call `get_itinerary` before planning accommodations

**SHOULD DO (Medium Priority):**
4. Add validation examples in prompt showing trip date alignment
5. Add troubleshooting section for common hotel date mistakes

**COULD DO (Low Priority - Optional):**
6. Add code-level validation in `handleAddHotel` (warnings, not errors)
7. Create automated tests for hotel date validation

---

## Files Requiring Changes

### Required Changes

| File | Lines | Change Type | Description |
|------|-------|-------------|-------------|
| `src/prompts/trip-designer/system.md` | After 450 | Add section | Accommodation planning guidance |
| `src/prompts/trip-designer/system.md` | After 730 | Add example | Hotel booking examples with date calculations |
| `src/prompts/trip-designer/system.md` | 454-485 | Strengthen | Add specific requirement to call `get_itinerary` before hotels |

### Optional Changes

| File | Lines | Change Type | Description |
|------|-------|-------------|-------------|
| `src/services/trip-designer/tool-executor.ts` | 569-629 | Add validation | Optional warnings for unusual hotel dates |
| `src/domain/schemas/tool-args.schema.ts` | 45-58 | Add refinement | Optional Zod refinement for date logic |

---

## Testing Recommendations

After implementing prompt fixes, test these scenarios:

**Test Case 1: Single-City Trip**
- Input: "10-day trip to Lisbon, January 8-15"
- Expected: ONE hotel with `checkIn: Jan 8, checkOut: Jan 15`
- Verify: 7 nights of accommodation

**Test Case 2: Multi-City Trip**
- Input: "10-day trip to Portugal (Lisbon + Porto), January 8-15"
- Expected:
  - Lisbon hotel: `checkIn: Jan 8, checkOut: Jan 12` (4 nights)
  - Porto hotel: `checkIn: Jan 12, checkOut: Jan 15` (3 nights)
- Verify: No gaps, total = 7 nights

**Test Case 3: Date Alignment**
- Input: "Trip from January 8-15"
- Expected: All hotel dates within Jan 8-15 range
- Verify: No hotels on Jan 7 or after Jan 15

**Test Case 4: Get Itinerary Called**
- Monitor tool calls in conversation
- Expected: `get_itinerary` called BEFORE `add_hotel`
- Verify: AI references saved dates, not memory

---

## Conclusion

This investigation found that the hotel date issues are **not code bugs** but rather **gaps in the AI prompt instructions**. The code correctly implements whatever dates the AI provides, but the AI lacks explicit guidance on:

1. Calculating accommodation duration from trip dates
2. Creating multi-night stays instead of single nights
3. Validating hotel dates against saved trip dates
4. Calling `get_itinerary` to reference current trip context

**Primary recommendation:** Enhance the system prompt with specific accommodation planning instructions and examples. This will guide the AI to create properly-dated, full-duration hotel segments.

**Secondary recommendation:** Consider optional code-level validation as a safety net, but rely primarily on prompt improvements to address the root cause.

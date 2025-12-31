# Trip Designer Destination Context Investigation

## Issue
User has an itinerary to St. Maarten (Jan 8-15, 2026), but the LLM responds with generic "I see you're planning a week-long trip from January 8-15" without knowing the destination.

## Root Cause Analysis

### Where Destination SHOULD Be Injected

The destination context should flow through this path:

1. **ChatPanel.svelte** → `sendInitialContext()` (lines 238-374)
2. **chat.svelte.ts** → `sendContextMessage()` (line 312)
3. **TripDesignerService** → `buildMessagesWithRAG()` → `buildMessages()` (lines 1357-1461)

### Current Flow Analysis

#### 1. ChatPanel Initial Context (viewer-svelte/src/lib/components/ChatPanel.svelte)

**Lines 264-314 show the problem:**

```typescript
// Add itinerary summary if available
if ($selectedItinerary) {
  const title = $selectedItinerary.title;
  const description = $selectedItinerary.description;
  const startDate = $selectedItinerary.startDate;
  const endDate = $selectedItinerary.endDate;
  const tripType = $selectedItinerary.tripType;
  const segmentsCount = $selectedItinerary.segmentCount || 0;
  const destinations = ($selectedItinerary as any).destinations || []; // ❌ PROBLEM 1

  if (title) {
    contextParts.push(`Working on itinerary: "${title}".`);
  }

  // Add explicit destinations if available
  if (destinations.length > 0) {
    const destNames = destinations.map((d: any) => d.name || d.city).filter(Boolean);
    if (destNames.length > 0) {
      contextParts.push(`Destinations: ${destNames.join(', ')}.`);
    }
  }
  // Otherwise, try to infer destination from title
  else if (title && title !== 'New Itinerary') {
    // Pattern matching for destination in title
    // ... (lines 286-313)
  }
}
```

**Problem 1**: `destinations` is cast to `any` and may not exist on `$selectedItinerary`

**Problem 2**: Even if destinations exist, this only sends to initial context message, NOT to the system prompt that buildMessages() uses

#### 2. sendContextMessage Flow (viewer-svelte/src/lib/stores/chat.svelte.ts)

**Lines 312-374:**

```typescript
async sendContextMessage(message: string): Promise<void> {
  // ...
  // NOTE: Unlike sendMessageStreaming, we do NOT add the user message to messages
  // This keeps the context message hidden from the user

  for await (const event of apiClient.sendChatMessageStream(sessionId, message)) {
    // Handles streaming response
  }
}
```

**Issue**: The context message is sent as a USER message, not a SYSTEM message. It goes into session.messages[] but doesn't affect the system prompt that buildMessages() constructs.

#### 3. TripDesignerService.buildMessages() (src/services/trip-designer/trip-designer.service.ts)

**Lines 1404-1436:**

```typescript
// Check if the itinerary has content and inject context
if (this.deps.itineraryService) {
  const itineraryService = this.deps.itineraryService as any;
  const itineraryResult = await itineraryService.get(session.itineraryId);
  if (itineraryResult.success) {
    const itinerary = itineraryResult.value;

    // If itinerary has segments or substantial metadata, include detailed summary
    if (itinerary.segments.length > 0 || itinerary.title !== 'New Itinerary') {
      hasItineraryContent = true;
      const summary = summarizeItinerary(itinerary); // ✅ This SHOULD include destinations

      systemPrompt = `${TRIP_DESIGNER_SYSTEM_PROMPT}

## Current Itinerary Context

You are editing an existing itinerary. Here's the current state:

${summary}
// ...
```

**This is where destinations SHOULD appear in the system prompt!**

#### 4. Itinerary Summarizer (src/services/trip-designer/itinerary-summarizer.ts)

**Lines 270-277:**

```typescript
// Destinations
if (itinerary.destinations.length > 0) {
  const destNames = itinerary.destinations
    .map(d => d.address?.city || d.name)
    .filter(Boolean)
    .join(', ');
  lines.push(`**Destinations**: ${destNames}`);
}
```

✅ **This CORRECTLY extracts destinations from the itinerary object**

### The Bug: Empty Itinerary Check

**CRITICAL ISSUE in TripDesignerService.buildMessages() line 1412:**

```typescript
if (itinerary.segments.length > 0 || itinerary.title !== 'New Itinerary') {
  hasItineraryContent = true;
  const summary = summarizeItinerary(itinerary);
  // ... inject summary into system prompt
}
```

**Problem**: This condition checks for:
1. Segments exist (`itinerary.segments.length > 0`) OR
2. Title is not default (`itinerary.title !== 'New Itinerary'`)

**BUT**: It does NOT check for destinations!

**Scenario for St. Maarten Trip:**
- User has created itinerary with title "St. Maarten Business Trip"
- Title is NOT "New Itinerary" ✅
- BUT: No segments added yet ❌
- **Result**: `hasItineraryContent = true`, summary IS generated and injected

**Wait... that should work! Let me check deeper...**

### Deeper Investigation: Session Creation

**TripDesignerService.createSession() lines 186-236:**

```typescript
// Check if the itinerary has existing content
if (this.deps.itineraryService) {
  const itineraryService = this.deps.itineraryService as any;
  const itineraryResult = await itineraryService.get(itineraryId);

  if (itineraryResult.success) {
    const itinerary = itineraryResult.value;

    // If itinerary has segments or meaningful metadata, inject context
    const hasContent =
      itinerary.segments.length > 0 ||
      itinerary.title !== 'New Itinerary' ||
      (itinerary.destinations && itinerary.destinations.length > 0) ||  // ✅ CHECKS destinations!
      (itinerary.tripPreferences && Object.keys(itinerary.tripPreferences).length > 0);

    if (hasContent) {
      // ... generate summary and inject as initial SYSTEM message
```

**This DOES check for destinations and injects a system message during session creation!**

### The Real Bug: Timing Issue

**Hypothesis**: The destination might not be set on the itinerary object when the session is created or when buildMessages() runs.

**Need to verify:**
1. Is `itinerary.destinations` populated when session is created?
2. Is `itinerary.destinations` populated when buildMessages() runs?
3. What is the structure of `$selectedItinerary` in ChatPanel?

## Verification Needed

### Check Itinerary Data Structure

Need to inspect:
1. **Itinerary type definition** (`src/domain/types/itinerary.ts`)
2. **How destinations are populated** (import process, manual entry)
3. **Session creation timing** vs destination availability

### Check Frontend State

In ChatPanel.svelte line 272:
```typescript
const destinations = ($selectedItinerary as any).destinations || [];
```

This suggests `destinations` might not be on the TypeScript type, requiring `as any` cast.

## Recommended Fix

### Option 1: Enhanced hasContent Check in buildMessages()

**File**: `src/services/trip-designer/trip-designer.service.ts`

**Line 1412**, change:
```typescript
// OLD
if (itinerary.segments.length > 0 || itinerary.title !== 'New Itinerary') {

// NEW
if (itinerary.segments.length > 0 ||
    itinerary.title !== 'New Itinerary' ||
    (itinerary.destinations && itinerary.destinations.length > 0)) {
```

**Rationale**: Make buildMessages() consistent with createSession() in checking for destinations.

### Option 2: Always Include Itinerary Summary in System Prompt

**Current behavior**: Only includes summary if `hasItineraryContent = true`

**Proposed**: Always fetch and inject minimal itinerary context (title + dates + destinations), even if no segments exist.

**Why**: Users might start planning (and chatting) before adding any segments. The title and dates are still important context.

**Implementation**:
```typescript
// ALWAYS get itinerary context
if (this.deps.itineraryService) {
  const itineraryService = this.deps.itineraryService as any;
  const itineraryResult = await itineraryService.get(session.itineraryId);
  if (itineraryResult.success) {
    const itinerary = itineraryResult.value;

    // If itinerary has ANY metadata (title, dates, destinations), include context
    if (itinerary.title !== 'New Itinerary' ||
        itinerary.destinations?.length > 0 ||
        itinerary.startDate ||
        itinerary.endDate) {
      const summary = summarizeItinerary(itinerary);
      // ... inject into system prompt
    }
  }
}
```

### Option 3: Debug and Log

Add logging to verify:
1. What's in `itinerary.destinations` when session is created
2. What's in `itinerary.destinations` when buildMessages() runs
3. What's in `$selectedItinerary.destinations` in ChatPanel

**Add to buildMessages() around line 1407:**
```typescript
console.log('[TripDesigner] buildMessages - itinerary:', {
  id: itinerary.id,
  title: itinerary.title,
  destinations: itinerary.destinations,
  destinationCount: itinerary.destinations?.length || 0,
  segments: itinerary.segments?.length || 0,
  hasItineraryContent,
});
```

## VERIFIED ROOT CAUSE ✅

### Actual Data from St. Maarten Itinerary

**File**: `data/itineraries/1dee003d-7709-4b4e-a158-f8666b8e5d8b.json`

```json
{
  "id": "1dee003d-7709-4b4e-a158-f8666b8e5d8b",
  "title": "New York Winter Getaway",
  "startDate": "2026-01-08T17:00:00.000Z",
  "endDate": "2026-01-15T17:00:00.000Z",
  "destinations": [],  // ❌ EMPTY!
  "segments": [
    {
      "type": "FLIGHT",
      "flightNumber": "B6887",
      "origin": { "name": "New York, NY (JFK)", "code": "JFK" },
      "destination": { "name": "St. Maarten (SXM)", "code": "SXM" }  // ✅ Destination IS in flight
    },
    {
      "type": "FLIGHT",
      "flightNumber": "B6788",
      "origin": { "name": "St. Maarten (SXM)", "code": "SXM" },
      "destination": { "name": "New York, NY (JFK)", "code": "JFK" }
    }
  ]
}
```

### **The Bug**

The `destinations` array on the itinerary is **EMPTY**, even though the flight segments clearly show:
- Origin: New York (JFK)
- Destination: St. Maarten (SXM)

**Expected behavior**: When flights are imported/added, the system should automatically populate `itinerary.destinations` with unique destination locations from the segments.

**Actual behavior**: The `destinations` array remains empty, causing:
1. ✅ `summarizeItinerary()` finds `destinations.length === 0`, skips destination summary
2. ✅ `buildMessages()` still injects summary (title !== "New Itinerary" and segments exist)
3. ❌ **BUT the summary has NO destination information!**
4. ❌ LLM receives dates and flight info but doesn't know WHERE the trip is going

### Chain of Events

1. User imports email with St. Maarten flights
2. Import service creates flight segments with origin/destination
3. **BUG**: Import service does NOT populate `itinerary.destinations` array
4. User starts chat session
5. `createSession()` sees `itinerary.title !== "New Itinerary"` → hasContent = true
6. `createSession()` calls `summarizeItinerary()`
7. `summarizeItinerary()` checks `if (itinerary.destinations.length > 0)` → FALSE
8. Summary is generated WITHOUT destination section
9. System prompt includes: dates, flights, travelers... but NO destination
10. LLM responds: "I see you're planning a week-long trip from January 8-15" (knows dates but not destination)

### The Missing Piece: Destination Population

**Need to find**: Where should `itinerary.destinations` be populated?

**Candidates**:
1. **Import service** - Should extract destinations from imported flights/hotels
2. **Segment service** - Should update destinations when segments added/modified
3. **Itinerary service** - Should have a method to derive destinations from segments

## Recommended Fixes

### Fix 1: Auto-populate Destinations from Segments (Recommended)

**Where**: Add to ItineraryService or create a utility function

**What**: Automatically derive destinations from flight and hotel segments

```typescript
/**
 * Extract unique destinations from itinerary segments
 * Looks at flight destinations and hotel locations
 */
function extractDestinationsFromSegments(segments: Segment[]): Location[] {
  const destMap = new Map<string, Location>();

  for (const seg of segments) {
    if (seg.type === 'FLIGHT') {
      const flight = seg as FlightSegment;
      // Add destination (not origin, since origin might be home)
      if (flight.destination?.code) {
        destMap.set(flight.destination.code, {
          name: flight.destination.name,
          code: flight.destination.code,
        });
      }
    } else if (seg.type === 'HOTEL') {
      const hotel = seg as HotelSegment;
      if (hotel.location) {
        const key = hotel.location.code || hotel.location.name || '';
        if (key) {
          destMap.set(key, hotel.location);
        }
      }
    }
  }

  return Array.from(destMap.values());
}
```

**Apply automatically**:
- When importing itinerary
- When adding/updating segments
- Before summarizing itinerary (as fallback)

### Fix 2: Update Import Service

**File**: Look for import extraction logic

**Add**: After extracting segments, derive destinations

```typescript
// After segments are created
const destinations = extractDestinationsFromSegments(segments);
itinerary.destinations = destinations;
```

### Fix 3: Itinerary Summarizer Fallback

**File**: `src/services/trip-designer/itinerary-summarizer.ts`

**Add**: If `destinations` is empty, extract from segments as fallback

```typescript
// Line 270-277, BEFORE checking destinations
// FALLBACK: If destinations array is empty but we have flight/hotel segments, extract them
let destinations = itinerary.destinations;
if (destinations.length === 0 && itinerary.segments.length > 0) {
  destinations = extractDestinationsFromSegments(itinerary.segments);
}

// Now use 'destinations' instead of 'itinerary.destinations'
if (destinations.length > 0) {
  const destNames = destinations
    .map(d => d.address?.city || d.name)
    .filter(Boolean)
    .join(', ');
  lines.push(`**Destinations**: ${destNames}`);
}
```

### Fix Priority

1. **Immediate (Fix 3)**: Add fallback to itinerary-summarizer.ts - ensures LLM gets destination context even if destinations array is empty
2. **Short-term (Fix 2)**: Update import service to populate destinations
3. **Long-term (Fix 1)**: Add automated destination derivation to ItineraryService methods

## Next Steps

1. ✅ **VERIFIED**: Root cause is empty `destinations` array
2. **Implement Fix 3** (itinerary-summarizer fallback) - immediate impact
3. **Find import service** and implement Fix 2
4. **Add destination derivation utility** for Fix 1
5. **Test with St. Maarten itinerary** to confirm LLM now receives destination

## Summary

**Root Cause**: `itinerary.destinations` array is empty even though flights have destination information in `segment.destination`.

**Impact**: LLM receives system prompt with dates and flights but NO destination information, causing generic responses like "I see you're planning a week-long trip from January 8-15" without knowing WHERE.

**Solution**: Extract destinations from segments (flights/hotels) either:
- Proactively (during import/segment addition)
- Reactively (as fallback in summarizer)

**Files to modify**:
1. `src/services/trip-designer/itinerary-summarizer.ts` - Add fallback extraction (immediate)
2. Import service - Auto-populate destinations from imported segments
3. Segment service - Update destinations when segments change
4. Create utility function for destination extraction from segments

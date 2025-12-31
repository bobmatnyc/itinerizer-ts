# Itinerary Metadata Update Flow

## Overview
This document shows how itinerary metadata changes (destinations, dates, title) now trigger UI updates.

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ USER INPUT                                                       │
│ "I want to plan a trip to Barcelona"                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ TRIP DESIGNER SERVICE                                            │
│ - Receives user message                                          │
│ - System prompt includes: "Today is Dec 23, 2025" (NEW!)       │
│ - Streams to LLM (Claude)                                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ LLM RESPONSE                                                     │
│ - Decides to call update_itinerary tool                         │
│ - Arguments: { destinations: ["Barcelona"], title: "Barcelona"} │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ TOOL EXECUTOR (tool-executor.ts)                                │
│ handleUpdateItinerary(itineraryId, params)                      │
│                                                                  │
│ 1. Parse params: destinations, title, dates, etc.              │
│ 2. Call itineraryService.update(itineraryId, updates)          │
│ 3. Return result with NEW FLAG:                                │
│    {                                                             │
│      success: true,                                             │
│      updated: ['title', 'destinations'],                        │
│      itineraryChanged: true  ← NEW FLAG!                       │
│    }                                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ TRIP DESIGNER SERVICE (chatStream)                              │
│ - Receives tool execution result                                │
│ - Checks result.result.itineraryChanged === true (NEW!)        │
│ - Sets itineraryMetadataChanged = true (NEW!)                  │
│                                                                  │
│ Variables tracked:                                              │
│ - segmentsModified: SegmentId[] = []                           │
│ - itineraryMetadataChanged: boolean = true (NEW!)              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ DONE EVENT EMISSION                                             │
│ yield {                                                          │
│   type: 'done',                                                 │
│   itineraryUpdated: segmentsModified.length > 0                │
│                     || itineraryMetadataChanged,  ← FIXED!     │
│   segmentsModified: []                                          │
│ }                                                                │
│                                                                  │
│ Before: itineraryUpdated would be FALSE (no segments)          │
│ After:  itineraryUpdated is TRUE (metadata changed)            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (ChatPanel.svelte)                                     │
│ - Receives SSE event: { type: 'done', itineraryUpdated: true } │
│ - Triggers UI refresh                                           │
│ - Switches view from home to itinerary detail                  │
│ - Shows updated destination/dates                               │
└─────────────────────────────────────────────────────────────────┘
```

## Before vs After

### Before Fix ❌

```
User: "Plan trip to Barcelona"
  ↓
Tool: update_itinerary({ destinations: ["Barcelona"] })
  ↓
Result: { success: true, updated: ['destinations'] }
  ↓
Done: { itineraryUpdated: false }  ← NO segments modified
  ↓
UI: Stays on home page ❌
```

### After Fix ✅

```
User: "Plan trip to Barcelona"
  ↓
Tool: update_itinerary({ destinations: ["Barcelona"] })
  ↓
Result: { success: true, updated: ['destinations'], itineraryChanged: true }
  ↓
Done: { itineraryUpdated: true }  ← Metadata changed!
  ↓
UI: Switches to itinerary detail ✅
```

## Date Awareness Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM PROMPT BUILDING (buildMessages)                          │
│                                                                  │
│ const today = new Date();                                       │
│ const dateContext = `                                           │
│   Today is Monday, December 23, 2025 (2025-12-23).             │
│   IMPORTANT: All suggested dates MUST be in the future.        │
│ `;                                                               │
│                                                                  │
│ systemPrompt = dateContext + basePrompt;                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ LLM CONTEXT                                                      │
│ - Knows current date is Dec 23, 2025                           │
│ - Explicit instruction to suggest future dates only            │
│ - Can calculate relative dates (e.g., "in 2 weeks")           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ LLM SUGGESTIONS                                                  │
│ - "How about March 2026 for spring weather?"                   │
│ - "January 6-11, 2026 works for a 5-day trip"                  │
│ - Never suggests dates in 2024 or past dates in 2025           │
└─────────────────────────────────────────────────────────────────┘
```

## Key Changes Summary

| Component | Line | Change |
|-----------|------|--------|
| `tool-executor.ts` | 316-321 | Return `itineraryChanged: true` in update result |
| `trip-designer.service.ts` | 755 | Add `itineraryMetadataChanged` tracking variable |
| `trip-designer.service.ts` | 810-818 | Check `result.result.itineraryChanged` flag |
| `trip-designer.service.ts` | 977 | Update done event condition |
| `trip-designer.service.ts` | 1359-1377 | Inject current date context |

## Testing Checklist

- [ ] Metadata changes trigger UI refresh
- [ ] View switches to detail when destination set
- [ ] Dates update immediately when set
- [ ] AI suggests only future dates
- [ ] Relative dates calculated correctly ("in 2 weeks")
- [ ] Segment modifications still work
- [ ] No regression in existing functionality

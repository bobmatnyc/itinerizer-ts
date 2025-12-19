# Itinerary Summarizer and Traveler Preferences Integration

## Overview

This document describes the complete integration of the itinerary summarizer with traveler preferences and session compression in the Trip Designer service.

## Components

### 1. Itinerary Summarizer (`src/services/trip-designer/itinerary-summarizer.ts`)

Provides two key functions for generating itinerary summaries:

#### `summarizeItinerary(itinerary: Itinerary): string`
- **Purpose**: Generate a comprehensive, human-readable summary with full preferences
- **Use Case**: Injected into system prompt when editing existing itineraries
- **Includes**:
  - Trip title and date range
  - Travelers
  - Destinations
  - **Complete preferences section**:
    - Travel style and pace
    - Interests
    - Budget flexibility
    - Dietary restrictions
    - Mobility restrictions
    - Origin location
    - Accommodation preferences
    - Activity preferences
    - Things to avoid
  - Segment counts and details
  - Total budget

**Example Output**:
```
**Trip**: Portugal Adventure
**Dates**: Jan 3-12, 2025 (9 days)
**Travelers**: John Doe
**Destinations**: Lisbon, Porto

**Preferences**:
- Style: moderate budget, balanced pace
- Interests: food, history, culture
- Traveling from: New York
- Diet: vegetarian
- Mobility: none
- Accommodation: boutique
- Budget flexibility: moderate

**Budget**: 3500 USD

**Segments**: 1 flight, 1 hotel, 1 activity (3 total)
- Flight: Jan 3, 2025 (JFK-LIS)
- Hotel: Jan 3, 2025 (7 nights, Hotel da Estrela)
- Activity: Jan 4, 2025 - Lisbon Food Tour
```

#### `summarizeItineraryMinimal(itinerary: Itinerary): string`
- **Purpose**: Generate a compact one-line summary for session compression
- **Use Case**: Passed to compaction LLM call to provide trip context
- **Format**: `Title (Dates) | Destinations: X, Y | segment counts`

**Example Output**:
```
Portugal Adventure (Jan 3-12, 2025) | Destinations: Lisbon, Porto | 1 flight, 1 hotel, 1 activity
```

### 2. Traveler Preferences (`src/domain/types/traveler.ts`)

**Type**: `TripTravelerPreferences`

Stored on `Itinerary.tripPreferences` field and includes:

```typescript
interface TripTravelerPreferences {
  travelStyle?: 'luxury' | 'moderate' | 'budget' | 'backpacker';
  pace?: 'packed' | 'balanced' | 'leisurely';
  interests?: string[]; // e.g., ['food', 'history', 'nature']
  budgetFlexibility?: number; // 1-5 scale
  dietaryRestrictions?: string;
  mobilityRestrictions?: string;
  origin?: string;
  accommodationPreference?: string;
  activityPreferences?: string[];
  avoidances?: string[];
}
```

### 3. Update Preferences Tool (`src/services/trip-designer/tools.ts`)

**Tool Name**: `update_preferences`

**Description**: Update traveler preferences for the trip such as travel style, pace, interests, dietary restrictions, and mobility needs.

**When to Use**: During discovery questions when user shares their preferences.

**Parameters**: All fields from `TripTravelerPreferences` are optional.

**Example Tool Call**:
```json
{
  "name": "update_preferences",
  "arguments": {
    "travelStyle": "moderate",
    "pace": "balanced",
    "interests": ["food", "history", "culture"],
    "dietaryRestrictions": "vegetarian",
    "origin": "New York"
  }
}
```

### 4. Tool Executor (`src/services/trip-designer/tool-executor.ts`)

**Handler**: `handleUpdatePreferences(itineraryId, params)`

- Fetches current itinerary
- Merges new preferences with existing ones (preserves previously set fields)
- Updates `itinerary.tripPreferences`
- Saves the updated itinerary

**Response**:
```json
{
  "success": true,
  "message": "Travel preferences updated successfully",
  "preferences": { /* merged preferences */ }
}
```

## Integration Flow

### 1. Discovery Phase (Capturing Preferences)

```
User: "I'm planning a 10-day trip to Portugal in January. I'm a vegetarian
       and prefer boutique hotels. I'm into food and history."

Agent: <Calls update_itinerary tool>
       - Sets dates: Jan 3-12, 2025
       - Sets destinations: ["Portugal"]

       <Calls update_preferences tool>
       - Sets dietaryRestrictions: "vegetarian"
       - Sets accommodationPreference: "boutique"
       - Sets interests: ["food", "history"]

       "Great! I've captured your preferences for a 10-day Portugal trip..."
```

### 2. Itinerary Building (Using Preferences)

When building the itinerary, the Trip Designer service:

1. Loads the itinerary via `buildMessages()` → `buildMessagesWithRAG()`
2. Checks if itinerary has segments or substantial metadata
3. Generates **full summary** with `summarizeItinerary(itinerary)`
4. Injects into system prompt:

```typescript
systemPrompt = `${TRIP_DESIGNER_SYSTEM_PROMPT}

## Current Itinerary Context

You are editing an existing itinerary. Here's the current state:

${summary}  // <-- Full summary with preferences

The user wants to modify or extend this itinerary...`;
```

The agent now has access to:
- User's travel style and pace preferences
- Dietary restrictions (to suggest appropriate restaurants)
- Mobility restrictions (to avoid suggesting activities with stairs)
- Budget flexibility (to calibrate price points)
- Interests (to prioritize relevant activities)

### 3. Session Compression (Preserving Preferences)

When session context grows too large, `compactSession()` is triggered:

1. **Keep recent messages** (last 6 messages)
2. **Summarize old messages** using compaction LLM call
3. **Include itinerary context** via `summarizeItineraryMinimal()`

```typescript
const itineraryContext = summarizeItineraryMinimal(itinerary);
// "Portugal Adventure (Jan 3-12, 2025) | Destinations: Lisbon, Porto | 1 flight, 1 hotel"

const compactionPrompt = `
Summarize the following trip planning conversation.
Current itinerary state: ${itineraryContext}

Conversation to summarize:
${conversationHistory}
`;
```

The compaction summary (generated by LLM) follows this structure:

```json
{
  "tripProfile": {
    "destination": "Portugal (Lisbon, Porto)",
    "dates": { "start": "2025-01-03", "end": "2025-01-12" },
    "travelers": { "count": 1 },
    "budget": { "flexibility": "moderate" },
    "preferences": {
      "style": "moderate budget",
      "pace": "balanced",
      "interests": ["food", "history"],
      "dietary": "vegetarian",
      "accommodation": "boutique"
    }
  },
  "confirmedSegments": [
    "Flight JFK-LIS Jan 3 @ 9:45 AM ($850)",
    "Hotel da Estrela Jan 3-10 (7 nights, $1400)"
  ],
  "pendingDecisions": [],
  "importantNotes": []
}
```

This summary is stored as a system message, preserving all preference context through compression.

## Key Design Decisions

### 1. Two Summary Formats
- **Full summary** for context injection (human-readable, detailed)
- **Minimal summary** for compaction (compact, structured)

### 2. Preferences Stored on Itinerary
- Single source of truth
- Persisted across sessions
- Available to all trip designer operations

### 3. Incremental Preference Updates
- Tool calls can update individual fields
- Previously set preferences are preserved
- No need to re-specify all preferences each time

### 4. Compaction Preserves Preferences
- Minimal summary provides trip context to compaction LLM
- Compaction LLM extracts preferences into structured format
- Preferences survive session compression

## Testing

Comprehensive test suite in `tests/services/trip-designer/itinerary-summarizer.test.ts`:

- ✅ Full summary generation with all preferences
- ✅ Minimal summary generation
- ✅ Segment counting and categorization
- ✅ Budget inclusion
- ✅ Partial preferences handling
- ✅ Date range formatting
- ✅ Edge cases (empty segments, many segments, etc.)

**Run tests**:
```bash
npm test -- itinerary-summarizer.test.ts
```

## Usage Example

```typescript
import { TripDesignerService } from './services/trip-designer';
import { summarizeItinerary, summarizeItineraryMinimal } from './services/trip-designer/itinerary-summarizer';

// Create service
const service = new TripDesignerService(config);

// Create session
const sessionResult = await service.createSession(itineraryId);
const sessionId = sessionResult.value;

// User provides preferences
await service.chat(sessionId,
  "I'm vegetarian, prefer boutique hotels, and love food tours"
);
// Agent calls update_preferences tool

// User asks for recommendations
await service.chat(sessionId,
  "What activities would you recommend in Lisbon?"
);
// Agent has access to preferences via summarizeItinerary() in context

// ... many messages later ...

// Session compression happens automatically
// Preferences are preserved in compaction summary

// Continue conversation
await service.chat(sessionId,
  "Actually, can we add more food experiences?"
);
// Agent still knows about vegetarian diet and interest in food
```

## Implementation Status

✅ **Complete**

- [x] `summarizeItinerary()` with full preferences
- [x] `summarizeItineraryMinimal()` for compression
- [x] `TripTravelerPreferences` type
- [x] `update_preferences` tool
- [x] Tool executor handler
- [x] Integration with `buildMessages()` for context injection
- [x] Integration with `compactSession()` for preservation
- [x] Comprehensive test suite
- [x] Documentation

## Next Steps

1. **UI Integration**: Add preference capture form in frontend
2. **Analytics**: Track which preferences lead to better trip recommendations
3. **Validation**: Add schema validation for preference values
4. **Defaults**: Infer preferences from user behavior (e.g., budget from selected hotels)

## Related Files

- `src/services/trip-designer/itinerary-summarizer.ts` - Summary generation
- `src/domain/types/traveler.ts` - Preference types
- `src/domain/types/itinerary.ts` - Itinerary with tripPreferences field
- `src/services/trip-designer/tools.ts` - update_preferences tool
- `src/services/trip-designer/tool-executor.ts` - Tool handler
- `src/services/trip-designer/trip-designer.service.ts` - Integration points
- `src/prompts/trip-designer/compaction.md` - Compaction system prompt
- `tests/services/trip-designer/itinerary-summarizer.test.ts` - Test suite

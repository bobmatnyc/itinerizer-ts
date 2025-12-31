# Trip Designer Auto Session Compression & Traveler Preferences

## Overview

This implementation adds two key features to the Trip Designer:

1. **Auto Session Compression** - Automatically compresses long conversation histories to save tokens
2. **Traveler Preferences** - Persists and uses traveler preferences throughout the trip planning experience

## 1. Auto Session Compression

### How It Works

When the conversation history grows too large (>80% of context window by default), the Trip Designer automatically:

1. Takes the oldest messages (keeping last 10 recent messages)
2. Calls the LLM with the compaction prompt to summarize them
3. Replaces old messages with a structured summary
4. Keeps recent messages intact for context continuity

### Configuration

```typescript
const config: TripDesignerConfig = {
  compactionThreshold: 0.8, // Trigger at 80% of max tokens (default)
  // Other config...
};
```

### Files Modified

- `src/services/trip-designer/trip-designer.service.ts` - Implemented `compactSession()` method
- `src/services/trip-designer/session.ts` - Added `shouldCompact()` and `lastCompactedAt` metadata tracking
- `src/prompts/trip-designer/compaction.md` - Compaction prompt (already existed)
- `src/prompts/index.ts` - Already exported compaction prompt

### Behavior

- **Automatic**: Triggered before each LLM call if threshold exceeded
- **Minimum gap**: Won't compact if less than 5 minutes since last compaction
- **Preserves**: Tool calls, recent messages, trip profile
- **Summary format**: Structured JSON with trip profile, confirmed segments, pending decisions, and important notes

## 2. Traveler Preferences on Itinerary

### Type Definition

```typescript
interface TripTravelerPreferences {
  travelStyle?: 'luxury' | 'moderate' | 'budget' | 'backpacker';
  pace?: 'packed' | 'balanced' | 'leisurely';
  interests?: string[]; // ['food', 'history', 'nature']
  budgetFlexibility?: number; // 1-5 scale
  dietaryRestrictions?: string;
  mobilityRestrictions?: string;
  origin?: string; // Where they're traveling from
  accommodationPreference?: string; // 'hotel', 'resort', 'airbnb', etc.
  activityPreferences?: string[];
  avoidances?: string[]; // Things to avoid
}
```

### Files Modified

- `src/domain/types/traveler.ts` - Added `TripTravelerPreferences` interface
- `src/domain/types/itinerary.ts` - Added `tripPreferences?: TripTravelerPreferences` field
- `src/services/trip-designer/tools.ts` - Added `UPDATE_PREFERENCES_TOOL`
- `src/services/trip-designer/tool-executor.ts` - Implemented `handleUpdatePreferences()`

### New Tool: `update_preferences`

The agent can now call this tool when users answer discovery questions:

```json
{
  "name": "update_preferences",
  "arguments": {
    "travelStyle": "moderate",
    "pace": "balanced",
    "interests": ["food", "history", "nature"],
    "dietaryRestrictions": "vegetarian",
    "origin": "New York"
  }
}
```

## 3. Itinerary Summary for Context

### Purpose

Generates a concise, readable summary of the current itinerary state for injection into the system prompt.

### Implementation

Created `src/services/trip-designer/itinerary-summarizer.ts` with two functions:

1. **`summarizeItinerary(itinerary)`** - Full summary for context injection
2. **`summarizeItineraryMinimal(itinerary)`** - Minimal summary for session compression

### Summary Format

```markdown
**Trip**: Portugal Adventure
**Dates**: Jan 3-12, 2025 (10 days)
**Travelers**: John Smith, Jane Smith
**Destinations**: Lisbon, Porto

**Preferences**:
- Style: moderate budget, balanced pace
- Interests: Food & Wine, History, Nature
- Traveling from: New York
- Diet: Vegetarian

**Budget**: 5000 USD

**Segments**: 2 flights, 3 hotels, 8 activities (13 total)
- Flight: Jan 3 (JFK → LIS)
- Hotel: Jan 3 (3 nights, Hotel Artemide)
- Activity: Jan 4 - Fado Show
...
```

### Integration

The summary is automatically injected into the system prompt when:
- Editing existing itineraries (segments.length > 0 or title != "New Itinerary")
- Building messages for LLM calls

Location: `TripDesignerService.buildMessages()` method

## Usage Example

### Starting a Trip Planning Session

```typescript
const tripDesigner = new TripDesignerService(config, sessionStorage, {
  itineraryService,
  segmentService,
  dependencyService,
});

// Create session
const sessionResult = await tripDesigner.createSession(itineraryId);
const sessionId = sessionResult.value;

// User provides preferences during discovery
const response = await tripDesigner.chat(
  sessionId,
  "I'm traveling from NYC, prefer moderate budget hotels, and love food and history"
);

// Agent automatically calls update_preferences tool
// Preferences are saved to itinerary.tripPreferences

// Later messages automatically include preference context
const nextResponse = await tripDesigner.chat(
  sessionId,
  "Find me some restaurants in Lisbon"
);
// Agent sees: "User prefers moderate budget, loves food..."
```

### Session Compression in Action

```typescript
// After 20+ messages, threshold is exceeded
const response = await tripDesigner.chat(sessionId, "Add a wine tour");

// Behind the scenes:
// 1. shouldCompact() returns true (>80% tokens used)
// 2. compactSession() is called
// 3. Old messages summarized via LLM
// 4. Summary replaces old messages
// 5. Recent 10 messages kept intact
// 6. Chat continues with reduced token count
```

## Benefits

1. **Longer Conversations**: Session compression enables extended planning sessions without hitting context limits
2. **Personalized Recommendations**: Saved preferences inform all agent suggestions
3. **Context Continuity**: Summaries preserve important decisions while reducing tokens
4. **Better UX**: Agent "remembers" user preferences across the session
5. **Cost Efficiency**: Reduced token usage = lower API costs

## Configuration Options

```typescript
interface TripDesignerConfig {
  // Session compression threshold (0-1)
  compactionThreshold?: number; // Default: 0.8

  // Other existing config...
  model?: string;
  maxTokens?: number;
  temperature?: number;
  sessionCostLimit?: number;
}
```

## Future Enhancements

1. **Preference Learning**: Analyze past trips to pre-populate preferences
2. **Preference Conflicts**: Detect and resolve conflicting preferences
3. **Adaptive Compression**: Adjust compression strategy based on conversation type
4. **Preference Templates**: Offer common preference profiles (family vacation, business trip, etc.)
5. **Multi-Traveler Preferences**: Support different preferences per traveler

## Testing

### Manual Testing

1. Create a session and have a conversation with 20+ messages
2. Verify compaction triggers and preserves context
3. Test `update_preferences` tool via chat
4. Check that preferences appear in itinerary summary
5. Verify preferences influence subsequent recommendations

### Integration Points

- Itinerary CRUD operations
- Session persistence
- LLM API calls (compaction)
- Tool execution framework

## LOC Delta

- **Added**: ~450 lines
  - itinerary-summarizer.ts: ~280 lines
  - compactSession method: ~130 lines
  - update_preferences tool: ~70 lines
  - Type definitions: ~30 lines
  - Tool executor handler: ~70 lines

- **Modified**: ~50 lines
  - Itinerary type: +2 lines
  - buildMessages: ~20 lines
  - tools.ts exports: +2 lines

- **Net Change**: +450 lines (new features, justified by functionality)

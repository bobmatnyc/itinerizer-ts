# Title/Destination Mismatch - Quick Reference

## What It Does

Automatically detects when an itinerary's title mentions the **departure city** instead of the **actual destination** and alerts the Trip Designer LLM to offer a fix.

## Common Scenario

```
❌ WRONG:
Title: "New York Winter Getaway"
Flights: JFK → SXM (St. Maarten)

✅ CORRECTED:
Title: "St. Maarten Winter Getaway"
Flights: JFK → SXM (St. Maarten)
```

## How It Works

1. **Detection**: When loading an itinerary in Trip Designer, `summarizeItinerary()` checks for mismatches
2. **Warning**: If detected, injects warning at top of context summary
3. **LLM Action**: Trip Designer sees warning and naturally offers to fix the title
4. **User Choice**: User can accept or decline the fix

## API

### Detection Function

```typescript
import { detectTitleDestinationMismatch } from './services/trip-designer/itinerary-summarizer.js';

const mismatch = detectTitleDestinationMismatch(itinerary);

if (mismatch?.hasMismatch) {
  console.log(`Title says: ${mismatch.titleMentions}`);
  console.log(`Actually going to: ${mismatch.actualDestination}`);
  console.log(`Suggested: ${mismatch.suggestedTitle}`);
}
```

### Result Interface

```typescript
interface TitleDestinationMismatch {
  hasMismatch: boolean;
  titleMentions: string | null;         // "New York"
  actualDestination: string | null;     // "St. Maarten"
  suggestedTitle: string | null;        // "St. Maarten Winter Getaway"
  explanation: string | null;           // Human-readable explanation
}
```

## Integration Points

### Itinerary Summarizer

File: `src/services/trip-designer/itinerary-summarizer.ts`

- `detectTitleDestinationMismatch(itinerary)` - Core detection logic
- `summarizeItinerary(itinerary)` - Automatically includes warning if mismatch detected

### Trip Designer Service

File: `src/services/trip-designer/trip-designer.service.ts`

- `createSession()` - Calls `summarizeItinerary()` which includes mismatch check
- System prompt injection includes the mismatch warning for LLM context

## Testing

```bash
# Run mismatch detection tests
npm test -- --run tests/services/trip-designer/itinerary-summarizer.test.ts

# Specific test suite
npm test -- --run -t "detectTitleDestinationMismatch"
```

## Example Warning Output

```markdown
⚠️ **TITLE/DESTINATION MISMATCH DETECTED**
- Current title: "New York Winter Getaway"
- Title mentions: "New York" (departure city)
- Actual destination: "St. Maarten"
- Suggested title: "St. Maarten Winter Getaway"

**Explanation**: Title mentions "New York" (your departure city) but you're
actually traveling to "St. Maarten". This often happens when importing
confirmation emails sent from the departure city.

**ACTION REQUIRED**: You should acknowledge this mismatch and offer to update
the title to correctly reflect the destination.
```

## Edge Cases Handled

- ✅ Multi-word city names ("New York", "San Francisco")
- ✅ Airport codes in titles ("JFK Weekend Trip")
- ✅ Round trips (A→B→A)
- ✅ One-way trips (A→B)
- ✅ No flights in itinerary (returns null)
- ✅ Missing city data (returns null)

## Future Enhancements

1. Auto-fix without asking (optional flag)
2. Check description field too
3. Multi-destination trips
4. Confidence scoring
5. Batch detection for all itineraries

# Duration Inference Service

## Overview

The Duration Inference Service prevents overlapping transfers by inferring standard durations for activities that don't have explicit end times. This solves the problem where a transfer might end at 3:00 PM while the destination activity starts at 2:30 PM.

## Problem Statement

**Before Duration Inference:**
```
Flight lands at JFK → 2:00 PM
[Gap detected - needs transfer]
Transfer created → 2:30 PM to 3:00 PM  ❌ OVERLAPS with dinner!
Dinner starts → 2:30 PM
```

**After Duration Inference:**
```
Flight lands at JFK → 2:00 PM (ends at 2:00 PM)
[Gap detected - needs transfer]
Transfer created → 2:15 PM to 2:29 PM  ✅ Ends before dinner
Dinner starts → 2:30 PM (inferred to end at 4:30 PM)
```

## Standard Durations

### Meals (High Confidence)
- **Breakfast**: 1 hour
- **Brunch**: 1.5 hours
- **Lunch**: 1.5 hours
- **Dinner**: 2 hours
- **Cocktails/Drinks**: 1.5 hours

### Entertainment (High Confidence)
- **Movie/Film**: 2 hours
- **Broadway Show/Theater**: 2.5 hours
- **Concert**: 2.5 hours
- **Opera/Ballet**: 3 hours

### Activities (Medium Confidence)
- **Tour**: 3 hours
- **Museum/Gallery**: 2 hours
- **Spa/Massage**: 2 hours
- **Golf**: 4 hours
- **Hiking**: 3 hours
- **Wine Tasting**: 2 hours
- **Cooking Class**: 3 hours
- **Shopping**: 2 hours

### Meetings (Medium Confidence)
- **Generic Meeting**: 1 hour

### Sports Events (Medium Confidence)
- **Game/Match**: 3 hours

### Workshops/Classes (Medium Confidence)
- **Workshop/Class/Lesson**: 2 hours

### Default (Low Confidence)
- **Unknown Activity**: 2 hours

## API Usage

### Basic Duration Inference

```typescript
import { DurationInferenceService } from './services/duration-inference.service.js';

const service = new DurationInferenceService();

// Infer duration for an activity
const dinner: ActivitySegment = {
  // ... segment fields
  name: 'Dinner at Restaurant',
  startDatetime: new Date('2025-01-10T19:00:00Z'),
  endDatetime: new Date('2025-01-10T19:00:00Z'), // Same as start
};

const duration = service.inferActivityDuration(dinner);
// Returns: { hours: 2, confidence: 'high', reason: 'Standard dinner duration' }
```

### Get Effective End Time

```typescript
// Get the effective end time (actual or inferred)
const endTime = service.getEffectiveEndTime(dinner);
// Returns: 2025-01-10T21:00:00Z (start + 2 hours)
```

### Confidence Levels

- **High**: Standard activities with well-known durations (meals, shows, movies)
- **Medium**: Activities with typical durations but more variation (tours, museums, meetings)
- **Low**: Unknown activities (uses 2-hour default)

## Integration with Gap Filling

The Duration Inference Service is automatically used by the Document Import Service when creating placeholder transfers:

```typescript
// In document-import.service.ts
private createPlaceholderSegment(gap: LocationGap): Segment {
  // Use inferred end time for before segment
  const beforeEnd = this.durationInference.getEffectiveEndTime(gap.beforeSegment);

  // Calculate transfer times that don't overlap
  const placeholderStart = new Date(beforeEnd.getTime() + bufferTime);
  const maxEndTime = new Date(gap.afterSegment.startDatetime.getTime() - 1);

  // Create transfer that fits in the available time window
  return this.createPlaceholderTransfer(placeholderStart, maxEndTime, ...);
}
```

## Validation Rules

### Transfer Time Constraints

1. **Transfer start time** must be after source activity ends:
   ```typescript
   transferStart >= sourceEnd (inferred or actual)
   ```

2. **Transfer end time** must be before destination activity starts:
   ```typescript
   transferEnd < destinationStart
   ```

3. **Buffer times**:
   - Local transfers: 15 minutes after activity ends
   - Flights: 2 hours after activity ends (time to get to airport)

### Tight Schedule Warnings

If there's insufficient time for a transfer, the service logs a warning:

```
⚠ Tight schedule: Transfer from JFK Airport to Downtown Restaurant
  may overlap with activities. Consider adjusting segment times.
```

## Examples

### Example 1: Museum to Lunch

```typescript
const museum: ActivitySegment = {
  name: 'Museum of Modern Art',
  startDatetime: new Date('2025-01-10T10:00:00Z'),
  endDatetime: new Date('2025-01-10T10:00:00Z'), // No explicit end
};

const lunch: ActivitySegment = {
  name: 'Lunch at Cafe',
  startDatetime: new Date('2025-01-10T13:00:00Z'),
};

// Infer museum end time
const museumEnd = service.getEffectiveEndTime(museum);
// → 2025-01-10T12:00:00Z (10:00 AM + 2 hours)

// Transfer window: 12:00 PM to 1:00 PM (1 hour available)
```

### Example 2: Broadway Show to Dinner

```typescript
const show: ActivitySegment = {
  name: 'Broadway Show - Hamilton',
  startDatetime: new Date('2025-01-10T19:00:00Z'),
  endDatetime: new Date('2025-01-10T19:00:00Z'),
};

const dinner: ActivitySegment = {
  name: 'Late Dinner',
  startDatetime: new Date('2025-01-10T22:00:00Z'),
};

// Infer show end time
const showEnd = service.getEffectiveEndTime(show);
// → 2025-01-10T21:30:00Z (7:00 PM + 2.5 hours)

// Transfer window: 9:30 PM to 10:00 PM (30 minutes available)
```

### Example 3: Golf to Evening Event

```typescript
const golf: ActivitySegment = {
  name: 'Golf at Pebble Beach',
  startDatetime: new Date('2025-01-10T09:00:00Z'),
  endDatetime: new Date('2025-01-10T09:00:00Z'),
};

const dinner: ActivitySegment = {
  name: 'Dinner',
  startDatetime: new Date('2025-01-10T18:00:00Z'),
};

// Infer golf end time
const golfEnd = service.getEffectiveEndTime(golf);
// → 2025-01-10T13:00:00Z (9:00 AM + 4 hours)

// Transfer window: 1:00 PM to 6:00 PM (5 hours available - plenty of time)
```

## Pattern Matching

The service uses keyword-based pattern matching to identify activity types:

```typescript
// Keywords checked (case-insensitive):
- Segment name
- Segment description
- Location name
- Category field
- Notes field
```

### Adding New Patterns

To add new activity patterns, update the `inferFromPattern` method in `duration-inference.service.ts`:

```typescript
// Add new pattern
if (text.includes('wine tasting') || text.includes('vineyard')) {
  return { hours: 2, confidence: 'medium', reason: 'Standard wine tasting duration' };
}
```

## Testing

Run the duration inference tests:

```bash
npm test tests/services/duration-inference.service.test.ts
```

Run integration tests with gap filling:

```bash
npm test tests/integration/duration-inference-gap-filling.test.ts
```

## Future Enhancements

1. **Machine Learning**: Learn durations from historical data
2. **User Preferences**: Allow users to customize standard durations
3. **Context-Aware**: Adjust durations based on travel style (rushed vs. relaxed)
4. **Location-Based**: Different durations for different cities/countries
5. **Time-of-Day Aware**: Shorter museum visits in evening, longer at peak times

## Related Services

- **SegmentContinuityService**: Detects geographic gaps between segments
- **DocumentImportService**: Uses duration inference when creating placeholder transfers
- **TravelAgentService**: Could use duration inference for realistic itinerary planning

## Performance

- **No external API calls**: All inference is local pattern matching
- **Fast**: O(1) time complexity for duration lookup
- **Memory efficient**: Minimal state, stateless service
- **Deterministic**: Same input always produces same output

## Error Handling

The service is designed to always return a valid duration:

1. If segment has explicit end time → use actual duration
2. If pattern matches → use standard duration
3. If no pattern matches → use 2-hour default

This ensures gap-filling never fails due to missing durations.

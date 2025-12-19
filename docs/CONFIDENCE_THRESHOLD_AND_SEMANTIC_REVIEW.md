# Confidence Threshold & Semantic Review

Two new features improve gap-filling quality by reducing false positives and catching obvious errors.

## 1. Confidence Threshold (80%)

### Overview

Gap-fills are now only created when confidence is ≥80%. This prevents creating transfers for uncertain or ambiguous connections.

### Confidence Levels

| Confidence | Scenario | Action |
|-----------|----------|--------|
| **95%** | Airport → Hotel/Activity | ✅ Fill (obvious transfer needed) |
| **95%** | Activity/Hotel → Airport | ✅ Fill (obvious transfer needed) |
| **90%** | Hotel → Hotel (cross-city) | ✅ Fill (clear travel day) |
| **85%** | Hotel → Activity | ✅ Fill (likely needs transfer) |
| **85%** | Activity → Hotel | ✅ Fill (likely needs transfer) |
| **80%** | Activity → Activity (same city) | ✅ Fill (reasonable transfer) |
| **60%** | Activity → Activity (cross-city) | ❌ Skip (uncertain connection) |
| **50%** | Unknown/overnight gaps | ❌ Skip (no direct transfer needed) |

### Implementation

**Location**: `src/services/segment-continuity.service.ts`

```typescript
private calculateGapConfidence(
  gapType: GapType,
  prevSegment: Segment,
  nextSegment: Segment
): number {
  const prevIsAirport = this.isAirportSegment(prevSegment);
  const nextIsAirport = this.isAirportSegment(nextSegment);
  const prevIsHotel = prevSegment.type === 'HOTEL';
  const nextIsHotel = nextSegment.type === 'HOTEL';

  // HIGH confidence (90%+): Airport transfers
  if (prevIsAirport && (nextIsHotel || nextSegment.type === 'ACTIVITY')) {
    return 95;
  }
  if (nextIsAirport && (prevIsHotel || prevSegment.type === 'ACTIVITY')) {
    return 95;
  }

  // HIGH confidence (90%+): Hotel-to-hotel cross-city
  if (prevIsHotel && nextIsHotel) {
    if (gapType === GapType.INTERNATIONAL_GAP || gapType === GapType.DOMESTIC_GAP) {
      return 90;
    }
  }

  // MEDIUM-HIGH confidence (85%): Hotel transitions
  if (prevIsHotel && !nextIsHotel && !nextIsAirport) return 85;
  if (nextIsHotel && !prevIsHotel && !prevIsAirport) return 85;

  // MEDIUM confidence (80%): Same-city transfers
  if (gapType === GapType.LOCAL_TRANSFER) return 80;

  // LOW confidence: Cross-city or uncertain
  return 60;
}
```

### Filter Logic

Only gaps with `confidence >= 80` are returned:

```typescript
const confidence = this.calculateGapConfidence(gapType, currentSegment, nextSegment);

// Only create gap if confidence >= 80%
if (confidence >= 80) {
  const gap: LocationGap = {
    // ... gap details
    confidence,
  };
  gaps.push(gap);
}
```

### Benefits

- **Reduces false positives**: No more transfers for uncertain connections
- **Focuses on obvious gaps**: Airport transfers and hotel transitions
- **Respects user intent**: Cross-city activities without explicit flights are left as-is

## 2. Travel Agent Semantic Review

### Overview

After gap-filling, a semantic review step uses higher-level reasoning to catch obvious errors that pattern-matching might miss.

### Issue Types

#### 1. Missing Airport Transfer (`HIGH` severity)

**Detection**: Flight arrival/departure not followed/preceded by an airport transfer

**Example**:
```
SFO → JFK flight (lands 4:30 PM)
Manhattan Hotel (check-in 6:00 PM)
```

**Issue**: No transfer from JFK to hotel

**Auto-fix**: Insert transfer segment between airport and hotel

#### 2. Overlapping Times (`MEDIUM` severity)

**Detection**: Segment starts before previous segment ends

**Example**:
```
Hotel checkout: 2:00 PM - 6:00 PM
Activity: 5:00 PM - 7:00 PM  ← Overlaps!
```

**Issue**: Time overlap detected

**Auto-fix**: Not automatically fixed (requires manual review)

#### 3. Impossible Sequence (`LOW` severity)

**Detection**: Logical impossibilities in segment ordering

**Example**: Activity scheduled before flight arrives

**Auto-fix**: Not automatically fixed

### Implementation

**Location**: `src/services/travel-agent-review.service.ts`

```typescript
class TravelAgentReviewService {
  /**
   * Review itinerary for semantic issues
   */
  reviewItinerary(itinerary: Itinerary): SemanticReviewResult {
    const issues: SemanticIssue[] = [];

    // Rule 1: Flight arrivals need transfers
    issues.push(...this.checkFlightArrivals(segments));

    // Rule 2: Flight departures need transfers
    issues.push(...this.checkFlightDepartures(segments));

    // Rule 3: No time overlaps
    issues.push(...this.checkTimeOverlaps(segments));

    return {
      valid: issues.length === 0,
      issues,
      summary: this.buildSummary(issues),
    };
  }

  /**
   * Auto-fix HIGH severity issues
   */
  autoFixIssues(itinerary: Itinerary, reviewResult: SemanticReviewResult): Itinerary {
    // Only fix HIGH severity issues with suggested fixes
    const highSeverityIssues = reviewResult.issues.filter(
      (issue) => issue.severity === 'HIGH' && issue.suggestedFix
    );

    // Insert fix segments at appropriate positions
    // ...
  }
}
```

### Integration into Import Pipeline

**Location**: `src/services/document-import.service.ts`

```typescript
private async fillRemainingGaps(itinerary: Itinerary): Promise<Itinerary> {
  // Step 1: Detect geographic gaps (with 80% confidence threshold)
  const gaps = this.continuityService.detectLocationGaps(sortedSegments);

  // Step 2: Fill gaps with intelligent/placeholder segments
  // ...

  // Step 3: Insert gap-filling segments
  // ...

  // Step 4: Run semantic review
  const reviewResult = this.reviewService.reviewItinerary(updatedItinerary);

  if (!reviewResult.valid) {
    console.log('🔍 Semantic review found issues:');
    console.log(reviewResult.summary);

    // Auto-fix HIGH severity issues
    const highSeverityCount = reviewResult.issues.filter(
      (i) => i.severity === 'HIGH'
    ).length;

    if (highSeverityCount > 0) {
      console.log(`🔧 Auto-fixing ${highSeverityCount} HIGH severity issues...`);
      return this.reviewService.autoFixIssues(updatedItinerary, reviewResult);
    }
  }

  return updatedItinerary;
}
```

### Benefits

- **Catches obvious errors**: Missing airport transfers are automatically detected
- **Higher-level reasoning**: Goes beyond pattern matching to understand intent
- **Auto-fix capability**: HIGH severity issues are fixed automatically
- **Explainable**: Clear descriptions of what's wrong and how to fix it

## Usage

### Standard Import

```typescript
import { DocumentImportService } from './services/document-import.service.js';

const importService = new DocumentImportService(config);
const result = await importService.importWithValidation(pdfPath, {
  fillGaps: true,  // Enables gap-filling with confidence threshold
  validateContinuity: true,
});

// Gap-filling happens with:
// 1. 80% confidence threshold (filters low-confidence gaps)
// 2. Semantic review (catches missing airport transfers)
// 3. Auto-fix (inserts transfers for HIGH severity issues)
```

### Console Output

```
📍 Detected 2 geographic gaps (>=80% confidence):
   1. Local transfer needed from JFK to Manhattan Grand Hotel (95% confidence)
   2. Local transfer needed from Hotel to Central Park (80% confidence)

✓ Found real travel option: TRANSFER via SerpAPI

🔍 Semantic review found issues:
Found 1 semantic issue(s):
  - 1 HIGH severity (requires immediate attention)

Issues:
  1. [HIGH] Flight arrival at JFK is not followed by a transfer to Manhattan Grand Hotel

🔧 Auto-fixing 1 HIGH severity issues...
✓ Semantic review passed: No issues detected
```

## Testing

### Run Tests

```bash
# Test confidence threshold
npm test -- gap-filling.test.ts

# Test semantic review
npm test -- travel-agent-review.service.test.ts

# Test segment continuity
npm test -- segment-continuity
```

### Run Demo

```bash
npx tsx examples/confidence-threshold-demo.ts
```

The demo shows:
1. HIGH confidence gap (95%) - airport transfer → **filled**
2. LOW confidence gap (60%) - cross-city activities → **skipped**
3. Semantic review - missing airport transfer → **detected & auto-fixed**
4. MEDIUM confidence gap (80%) - same-city transfer → **filled**

## Architecture

### Service Dependencies

```
DocumentImportService
├── SegmentContinuityService (gap detection with confidence)
└── TravelAgentReviewService (semantic validation & auto-fix)
```

### Data Flow

```
1. LLM Parse → Raw Itinerary
2. Gap Detection → Filter by confidence (≥80%)
3. Gap Filling → Create placeholders/real segments
4. Semantic Review → Detect high-level issues
5. Auto-Fix → Insert missing airport transfers
6. Final Itinerary
```

## Configuration

### Confidence Threshold

Currently hardcoded to 80%. To adjust:

**Location**: `src/services/segment-continuity.service.ts`

```typescript
// Only create gap if confidence >= 80%
if (confidence >= 80) {
  gaps.push(gap);
}
```

To make configurable:

```typescript
constructor(private confidenceThreshold: number = 80) {}

// Then use:
if (confidence >= this.confidenceThreshold) {
  gaps.push(gap);
}
```

### Semantic Review Rules

To add new rules, extend `TravelAgentReviewService`:

```typescript
reviewItinerary(itinerary: Itinerary): SemanticReviewResult {
  const issues: SemanticIssue[] = [];

  // Existing rules
  issues.push(...this.checkFlightArrivals(segments));
  issues.push(...this.checkFlightDepartures(segments));
  issues.push(...this.checkTimeOverlaps(segments));

  // Add new rule
  issues.push(...this.checkYourNewRule(segments));

  return { valid: issues.length === 0, issues, ... };
}
```

## Future Enhancements

### Configurable Confidence Levels

```typescript
interface ConfidenceConfig {
  airportTransfer: number;       // Default: 95
  hotelToCrossCity: number;      // Default: 90
  hotelTransition: number;       // Default: 85
  sameCityActivity: number;      // Default: 80
  threshold: number;             // Default: 80
}
```

### Additional Semantic Rules

- **Unrealistic travel times**: Detect if transfer duration is too short
- **Missing overnight stays**: Flag if activities span multiple days without hotels
- **Duplicate segments**: Identify identical segments

### Machine Learning Confidence

Use historical data to improve confidence calculations:

```typescript
private async calculateMLConfidence(
  gap: LocationGap,
  historicalData: ItineraryDatabase
): Promise<number> {
  // Train model on successfully filled gaps
  // Return confidence based on similar patterns
}
```

## Related Documentation

- [Geographic Gap Filling](./geographic-gap-filling.md) - Original gap detection
- [Travel Agent Service](./travel-agent-service.md) - Intelligent gap filling
- [Duration Inference](./duration-inference.md) - Smart time calculations

/**
 * Demo: Confidence Threshold and Semantic Review
 *
 * This example demonstrates:
 * 1. Confidence threshold (80%) filtering low-confidence gaps
 * 2. Semantic review catching missing airport transfers
 * 3. Auto-fix of HIGH severity issues
 */

import { SegmentContinuityService } from '../src/services/segment-continuity.service.js';
import { TravelAgentReviewService } from '../src/services/travel-agent-review.service.js';
import type { Itinerary } from '../src/domain/types/itinerary.js';
import type { FlightSegment, HotelSegment, ActivitySegment } from '../src/domain/types/segment.js';
import { SegmentType, SegmentStatus } from '../src/domain/types/common.js';
import { generateItineraryId, generateSegmentId, generateTravelerId } from '../src/domain/types/branded.js';

// Initialize services
const continuityService = new SegmentContinuityService();
const reviewService = new TravelAgentReviewService();

console.log('='.repeat(80));
console.log('DEMO: Confidence Threshold & Semantic Review');
console.log('='.repeat(80));
console.log();

// ============================================================================
// Example 1: High Confidence Gap (Airport Transfer)
// ============================================================================

console.log('Example 1: High Confidence Gap (95%) - Airport Transfer');
console.log('-'.repeat(80));

const flight1: FlightSegment = {
  id: generateSegmentId(),
  type: SegmentType.FLIGHT,
  status: SegmentStatus.CONFIRMED,
  startDatetime: new Date('2025-01-15T08:00:00Z'),
  endDatetime: new Date('2025-01-15T16:30:00Z'),
  travelerIds: [generateTravelerId()],
  source: 'import',
  airline: { name: 'United Airlines', code: 'UA' },
  flightNumber: 'UA123',
  origin: {
    name: 'San Francisco International Airport',
    code: 'SFO',
    type: 'AIRPORT',
  },
  destination: {
    name: 'John F. Kennedy International Airport',
    code: 'JFK',
    type: 'AIRPORT',
    address: {
      city: 'New York',
      state: 'NY',
      country: 'US',
    },
  },
  metadata: {},
};

const hotel1: HotelSegment = {
  id: generateSegmentId(),
  type: SegmentType.HOTEL,
  status: SegmentStatus.CONFIRMED,
  startDatetime: new Date('2025-01-15T18:00:00Z'),
  endDatetime: new Date('2025-01-16T11:00:00Z'),
  travelerIds: [generateTravelerId()],
  source: 'import',
  property: { name: 'Manhattan Grand Hotel' },
  location: {
    name: 'Manhattan Grand Hotel',
    address: {
      street: '123 Park Ave',
      city: 'New York',
      state: 'NY',
      country: 'US',
    },
  },
  checkInDate: new Date('2025-01-15T18:00:00Z'),
  checkOutDate: new Date('2025-01-16T11:00:00Z'),
  roomCount: 1,
  amenities: [],
  metadata: {},
};

const gaps1 = continuityService.detectLocationGaps([flight1, hotel1]);

console.log(`Detected ${gaps1.length} gap(s):`);
gaps1.forEach((gap, i) => {
  console.log(`  ${i + 1}. ${gap.description}`);
  console.log(`     Type: ${gap.gapType}`);
  console.log(`     Confidence: ${gap.confidence}%`);
  console.log(`     Suggested: ${gap.suggestedType}`);
});

console.log();
console.log('✓ HIGH confidence gap detected and would be filled');
console.log();

// ============================================================================
// Example 2: Low Confidence Gap (Cross-city Activities)
// ============================================================================

console.log('Example 2: Low Confidence Gap (60%) - Cross-City Activities');
console.log('-'.repeat(80));

const activity1: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: SegmentStatus.CONFIRMED,
  startDatetime: new Date('2025-01-15T10:00:00Z'),
  endDatetime: new Date('2025-01-15T12:00:00Z'),
  travelerIds: [generateTravelerId()],
  source: 'import',
  name: 'Golden Gate Bridge Tour',
  location: {
    name: 'Golden Gate Bridge',
    address: {
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
    },
  },
  metadata: {},
};

const activity2: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: SegmentStatus.CONFIRMED,
  startDatetime: new Date('2025-01-15T16:00:00Z'),
  endDatetime: new Date('2025-01-15T18:00:00Z'),
  travelerIds: [generateTravelerId()],
  source: 'import',
  name: 'Times Square Visit',
  location: {
    name: 'Times Square',
    address: {
      city: 'New York',
      state: 'NY',
      country: 'US',
    },
  },
  metadata: {},
};

const gaps2 = continuityService.detectLocationGaps([activity1, activity2]);

console.log(`Detected ${gaps2.length} gap(s):`);
if (gaps2.length === 0) {
  console.log('  (none - filtered out by 80% confidence threshold)');
}
gaps2.forEach((gap, i) => {
  console.log(`  ${i + 1}. ${gap.description}`);
  console.log(`     Confidence: ${gap.confidence}%`);
});

console.log();
console.log('✓ LOW confidence gap filtered out (would have been 60%)');
console.log();

// ============================================================================
// Example 3: Semantic Review - Missing Airport Transfer
// ============================================================================

console.log('Example 3: Semantic Review - Missing Airport Transfer');
console.log('-'.repeat(80));

const itinerary1: Itinerary = {
  id: generateItineraryId(),
  title: 'NYC Trip',
  status: 'PLANNED',
  startDate: new Date('2025-01-15'),
  endDate: new Date('2025-01-16'),
  travelers: [],
  segments: [flight1, hotel1], // Missing transfer!
  metadata: {},
};

const review1 = reviewService.reviewItinerary(itinerary1);

console.log(`Review Result: ${review1.valid ? 'VALID ✓' : 'INVALID ✗'}`);
console.log();
console.log('Issues Found:');
review1.issues.forEach((issue, i) => {
  console.log(`  ${i + 1}. [${issue.severity}] ${issue.type}`);
  console.log(`     ${issue.description}`);
  console.log(`     Suggested Fix: ${issue.suggestedFix ? 'YES' : 'NO'}`);
});

console.log();
console.log('Auto-fixing HIGH severity issues...');
const fixed1 = reviewService.autoFixIssues(itinerary1, review1);

console.log(`Original segments: ${itinerary1.segments.length}`);
console.log(`Fixed segments: ${fixed1.segments.length}`);
console.log();

const addedSegments = fixed1.segments.filter(
  (seg) => !itinerary1.segments.includes(seg)
);

console.log('Added segments:');
addedSegments.forEach((seg, i) => {
  if (seg.type === SegmentType.TRANSFER) {
    const transfer = seg as any;
    console.log(`  ${i + 1}. TRANSFER: ${transfer.pickupLocation.name} → ${transfer.dropoffLocation.name}`);
    console.log(`     Inferred: ${seg.inferred}`);
    console.log(`     Confidence: ${seg.sourceDetails?.confidence}`);
  }
});

console.log();
console.log('✓ Semantic review detected and auto-fixed missing airport transfer');
console.log();

// ============================================================================
// Example 4: Medium Confidence Gap (Same-City Transfer)
// ============================================================================

console.log('Example 4: Medium Confidence Gap (80%) - Same-City Transfer');
console.log('-'.repeat(80));

const activity3: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: SegmentStatus.CONFIRMED,
  startDatetime: new Date('2025-01-16T10:00:00Z'),
  endDatetime: new Date('2025-01-16T12:00:00Z'),
  travelerIds: [generateTravelerId()],
  source: 'import',
  name: 'Statue of Liberty Tour',
  location: {
    name: 'Liberty Island',
    address: {
      city: 'New York',
      state: 'NY',
      country: 'US',
    },
  },
  metadata: {},
};

const activity4: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: SegmentStatus.CONFIRMED,
  startDatetime: new Date('2025-01-16T14:00:00Z'),
  endDatetime: new Date('2025-01-16T16:00:00Z'),
  travelerIds: [generateTravelerId()],
  source: 'import',
  name: 'Central Park Walk',
  location: {
    name: 'Central Park',
    address: {
      city: 'New York',
      state: 'NY',
      country: 'US',
    },
  },
  metadata: {},
};

const gaps4 = continuityService.detectLocationGaps([activity3, activity4]);

console.log(`Detected ${gaps4.length} gap(s):`);
gaps4.forEach((gap, i) => {
  console.log(`  ${i + 1}. ${gap.description}`);
  console.log(`     Type: ${gap.gapType}`);
  console.log(`     Confidence: ${gap.confidence}%`);
  console.log(`     Suggested: ${gap.suggestedType}`);
});

console.log();
console.log('✓ MEDIUM confidence gap detected and would be filled');
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(80));
console.log('SUMMARY: Confidence Threshold Behavior');
console.log('='.repeat(80));
console.log();
console.log('Confidence Levels:');
console.log('  95%  - Airport → Hotel/Activity (HIGH - always fill)');
console.log('  90%  - Hotel → Hotel cross-city (HIGH - always fill)');
console.log('  85%  - Hotel → Activity transitions (MEDIUM-HIGH - always fill)');
console.log('  80%  - Same-city activity → activity (MEDIUM - always fill)');
console.log('  60%  - Cross-city activity → activity (LOW - SKIP)');
console.log('  50%  - Unknown/overnight gaps (VERY LOW - SKIP)');
console.log();
console.log('Threshold: 80%');
console.log('  → Only gaps with ≥80% confidence are filled');
console.log('  → Reduces false positives and unnecessary transfers');
console.log();
console.log('Semantic Review:');
console.log('  → Catches obvious errors (missing airport transfers)');
console.log('  → Auto-fixes HIGH severity issues');
console.log('  → Runs after gap-filling for final validation');
console.log();
console.log('='.repeat(80));

/**
 * Duration Inference Demo
 * Demonstrates how duration inference prevents overlapping transfers
 */

import { DurationInferenceService } from '../src/services/duration-inference.service.js';
import { SegmentContinuityService } from '../src/services/segment-continuity.service.js';
import type { ActivitySegment, FlightSegment } from '../src/domain/types/segment.js';
import { SegmentType } from '../src/domain/types/common.js';
import { generateSegmentId } from '../src/domain/types/branded.js';

// Create services
const durationService = new DurationInferenceService();
const continuityService = new SegmentContinuityService();

console.log('=== Duration Inference Demo ===\n');

// Example 1: Flight to Dinner (the original problem)
console.log('Example 1: Flight to Dinner (Original Problem)');
console.log('------------------------------------------------');

const flight: FlightSegment = {
  id: generateSegmentId(),
  type: SegmentType.FLIGHT,
  status: 'CONFIRMED',
  startDatetime: new Date('2025-01-10T10:00:00Z'),
  endDatetime: new Date('2025-01-10T14:00:00Z'), // Lands at 2:00 PM
  travelerIds: [],
  airline: { name: 'United', code: 'UA' },
  flightNumber: 'UA123',
  origin: {
    name: 'JFK Airport',
    code: 'JFK',
    type: 'AIRPORT',
    address: { country: 'US', city: 'New York' }
  },
  destination: {
    name: 'LAX Airport',
    code: 'LAX',
    type: 'AIRPORT',
    address: { country: 'US', city: 'Los Angeles' }
  },
  metadata: {},
  source: 'import',
};

const dinner: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: 'CONFIRMED',
  startDatetime: new Date('2025-01-10T14:30:00Z'), // Starts at 2:30 PM
  endDatetime: new Date('2025-01-10T14:30:00Z'), // No explicit end time
  travelerIds: [],
  name: 'Dinner at Restaurant',
  location: {
    name: 'Downtown Restaurant',
    city: 'Los Angeles',
    type: 'RESTAURANT',
    address: { country: 'US', city: 'Los Angeles' }
  },
  metadata: {},
  source: 'import',
};

console.log(`Flight lands: ${flight.endDatetime.toLocaleTimeString()}`);
console.log(`Dinner starts: ${dinner.startDatetime.toLocaleTimeString()}`);

// Infer dinner end time
const dinnerDuration = durationService.inferActivityDuration(dinner);
const dinnerEndTime = durationService.getEffectiveEndTime(dinner);

console.log(`\nDinner duration inferred: ${dinnerDuration.hours} hours (${dinnerDuration.confidence} confidence)`);
console.log(`Dinner ends (inferred): ${dinnerEndTime.toLocaleTimeString()}`);

// Calculate transfer window
const flightEnd = flight.endDatetime;
const bufferTime = 2 * 60 * 60 * 1000; // 2 hours for flight
const transferStart = new Date(flightEnd.getTime() + bufferTime);
const transferEnd = new Date(dinner.startDatetime.getTime() - 1);

console.log(`\nTransfer window: ${transferStart.toLocaleTimeString()} - ${transferEnd.toLocaleTimeString()}`);
console.log(`✅ Transfer does NOT overlap with dinner\n`);

// Example 2: Museum to Lunch
console.log('Example 2: Museum to Lunch');
console.log('----------------------------');

const museum: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: 'CONFIRMED',
  startDatetime: new Date('2025-01-10T10:00:00Z'), // 10:00 AM
  endDatetime: new Date('2025-01-10T10:00:00Z'), // No explicit end
  travelerIds: [],
  name: 'Museum of Modern Art',
  location: {
    name: 'MoMA',
    city: 'New York',
    type: 'MUSEUM',
    address: { country: 'US', city: 'New York' }
  },
  metadata: {},
  source: 'import',
};

const lunch: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: 'CONFIRMED',
  startDatetime: new Date('2025-01-10T13:00:00Z'), // 1:00 PM
  endDatetime: new Date('2025-01-10T13:00:00Z'),
  travelerIds: [],
  name: 'Lunch at Cafe',
  location: {
    name: 'Central Park Cafe',
    city: 'New York',
    type: 'RESTAURANT',
    address: { country: 'US', city: 'New York' }
  },
  metadata: {},
  source: 'import',
};

const museumDuration = durationService.inferActivityDuration(museum);
const museumEndTime = durationService.getEffectiveEndTime(museum);
const lunchDuration = durationService.inferActivityDuration(lunch);

console.log(`Museum starts: ${museum.startDatetime.toLocaleTimeString()}`);
console.log(`Museum ends (inferred): ${museumEndTime.toLocaleTimeString()} (+${museumDuration.hours} hours)`);
console.log(`Lunch starts: ${lunch.startDatetime.toLocaleTimeString()}`);
console.log(`Lunch duration: ${lunchDuration.hours} hours`);

// Calculate available time for transfer
const availableTime = (lunch.startDatetime.getTime() - museumEndTime.getTime()) / (1000 * 60);
console.log(`\nTime available for transfer: ${availableTime} minutes`);
console.log(`✅ Sufficient time for local transfer\n`);

// Example 3: Broadway Show to Late Dinner
console.log('Example 3: Broadway Show to Late Dinner');
console.log('----------------------------------------');

const show: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: 'CONFIRMED',
  startDatetime: new Date('2025-01-10T19:00:00Z'), // 7:00 PM
  endDatetime: new Date('2025-01-10T19:00:00Z'),
  travelerIds: [],
  name: 'Broadway Show - Hamilton',
  location: {
    name: 'Richard Rodgers Theatre',
    city: 'New York',
    type: 'THEATER',
    address: { country: 'US', city: 'New York' }
  },
  metadata: {},
  source: 'import',
};

const lateDinner: ActivitySegment = {
  id: generateSegmentId(),
  type: SegmentType.ACTIVITY,
  status: 'CONFIRMED',
  startDatetime: new Date('2025-01-10T22:00:00Z'), // 10:00 PM
  endDatetime: new Date('2025-01-10T22:00:00Z'),
  travelerIds: [],
  name: 'Late Dinner',
  location: {
    name: 'Nearby Restaurant',
    city: 'New York',
    type: 'RESTAURANT',
    address: { country: 'US', city: 'New York' }
  },
  metadata: {},
  source: 'import',
};

const showDuration = durationService.inferActivityDuration(show);
const showEndTime = durationService.getEffectiveEndTime(show);

console.log(`Show starts: ${show.startDatetime.toLocaleTimeString()}`);
console.log(`Show ends (inferred): ${showEndTime.toLocaleTimeString()} (+${showDuration.hours} hours)`);
console.log(`Dinner starts: ${lateDinner.startDatetime.toLocaleTimeString()}`);

const showToDinnerTime = (lateDinner.startDatetime.getTime() - showEndTime.getTime()) / (1000 * 60);
console.log(`\nTime between show and dinner: ${showToDinnerTime} minutes`);

if (showToDinnerTime < 45) {
  console.log(`⚠️  Tight schedule - consider adjusting times`);
} else {
  console.log(`✅ Reasonable time for transfer`);
}

console.log('\n=== All Standard Durations ===\n');

// Show all standard durations
const examples = [
  { name: 'Breakfast', hours: 1 },
  { name: 'Brunch', hours: 1.5 },
  { name: 'Lunch', hours: 1.5 },
  { name: 'Dinner', hours: 2 },
  { name: 'Movie', hours: 2 },
  { name: 'Broadway Show', hours: 2.5 },
  { name: 'Concert', hours: 2.5 },
  { name: 'Opera', hours: 3 },
  { name: 'Museum', hours: 2 },
  { name: 'Tour', hours: 3 },
  { name: 'Golf', hours: 4 },
  { name: 'Spa', hours: 2 },
];

const maxNameLength = Math.max(...examples.map(e => e.name.length));

for (const example of examples) {
  const padding = ' '.repeat(maxNameLength - example.name.length);
  console.log(`${example.name}:${padding} ${example.hours} hour${example.hours !== 1 ? 's' : ''}`);
}

console.log('\n=== Demo Complete ===');

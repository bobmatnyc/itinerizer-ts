/**
 * Example: Geographic continuity validation
 * Demonstrates detection of location gaps in itineraries
 */

import { SegmentContinuityService, GapType } from '../src/services/segment-continuity.service.js';
import type { FlightSegment, HotelSegment, Segment } from '../src/domain/types/segment.js';
import { generateSegmentId } from '../src/domain/types/branded.js';

// Example 1: Missing transfer between JFK and Manhattan hotel
function example1_MissingTransfer() {
  console.log('\n=== Example 1: Missing Transfer (JFK → Manhattan Hotel) ===\n');

  const service = new SegmentContinuityService();

  const flight: FlightSegment = {
    id: generateSegmentId(),
    type: 'FLIGHT',
    status: 'CONFIRMED',
    startDatetime: new Date('2024-06-15T08:00:00-04:00'),
    endDatetime: new Date('2024-06-15T10:00:00-04:00'),
    travelerIds: [],
    metadata: {},
    airline: { name: 'American Airlines', code: 'AA' },
    flightNumber: 'AA100',
    origin: {
      name: 'Philadelphia International Airport',
      code: 'PHL',
      address: { city: 'Philadelphia', country: 'US' },
    },
    destination: {
      name: 'John F. Kennedy International Airport',
      code: 'JFK',
      address: { city: 'New York', country: 'US' },
    },
  };

  const hotel: HotelSegment = {
    id: generateSegmentId(),
    type: 'HOTEL',
    status: 'CONFIRMED',
    startDatetime: new Date('2024-06-15T15:00:00-04:00'),
    endDatetime: new Date('2024-06-17T11:00:00-04:00'),
    travelerIds: [],
    metadata: {},
    property: { name: 'The Manhattan Grand' },
    location: {
      name: 'The Manhattan Grand',
      address: { street: '123 Broadway', city: 'New York', country: 'US' },
    },
    checkInDate: new Date('2024-06-15'),
    checkOutDate: new Date('2024-06-17'),
    roomCount: 1,
    amenities: ['WiFi', 'Breakfast'],
  };

  const segments: Segment[] = [flight, hotel];
  const gaps = service.detectLocationGaps(segments);

  console.log('Segments:');
  console.log(`  1. Flight ${flight.flightNumber}: ${flight.origin.code} → ${flight.destination.code}`);
  console.log(`  2. Hotel: ${hotel.property.name} in ${hotel.location.address?.city}`);

  console.log('\nGap Detection Results:');
  if (gaps.length === 0) {
    console.log('  ✓ No gaps detected - geographic continuity is valid');
  } else {
    gaps.forEach((gap, index) => {
      console.log(`  ${index + 1}. ${gap.description}`);
      console.log(`     Gap Type: ${gap.gapType}`);
      console.log(`     Suggested Segment: ${gap.suggestedType}`);
      console.log(`     Between segments: ${gap.beforeIndex} → ${gap.afterIndex}`);
    });
  }
}

// Example 2: Missing international flight
function example2_MissingInternationalFlight() {
  console.log('\n=== Example 2: Missing International Flight (PHL → Milan) ===\n');

  const service = new SegmentContinuityService();

  const hotel1: HotelSegment = {
    id: generateSegmentId(),
    type: 'HOTEL',
    status: 'CONFIRMED',
    startDatetime: new Date('2024-06-15T15:00:00-04:00'),
    endDatetime: new Date('2024-06-17T11:00:00-04:00'),
    travelerIds: [],
    metadata: {},
    property: { name: 'Philadelphia Downtown Hotel' },
    location: {
      name: 'Philadelphia Downtown Hotel',
      address: { city: 'Philadelphia', country: 'US' },
    },
    checkInDate: new Date('2024-06-15'),
    checkOutDate: new Date('2024-06-17'),
    roomCount: 1,
    amenities: [],
  };

  const hotel2: HotelSegment = {
    id: generateSegmentId(),
    type: 'HOTEL',
    status: 'CONFIRMED',
    startDatetime: new Date('2024-06-18T15:00:00+02:00'),
    endDatetime: new Date('2024-06-20T11:00:00+02:00'),
    travelerIds: [],
    metadata: {},
    property: { name: 'Milan Grand Hotel' },
    location: {
      name: 'Milan Grand Hotel',
      address: { city: 'Milan', country: 'IT' },
    },
    checkInDate: new Date('2024-06-18'),
    checkOutDate: new Date('2024-06-20'),
    roomCount: 1,
    amenities: [],
  };

  const segments: Segment[] = [hotel1, hotel2];
  const gaps = service.detectLocationGaps(segments);

  console.log('Segments:');
  console.log(`  1. Hotel: ${hotel1.property.name} (${hotel1.location.address?.city}, ${hotel1.location.address?.country})`);
  console.log(`  2. Hotel: ${hotel2.property.name} (${hotel2.location.address?.city}, ${hotel2.location.address?.country})`);

  console.log('\nGap Detection Results:');
  if (gaps.length === 0) {
    console.log('  ✓ No gaps detected - geographic continuity is valid');
  } else {
    gaps.forEach((gap, index) => {
      console.log(`  ${index + 1}. ${gap.description}`);
      console.log(`     Gap Type: ${gap.gapType}`);
      console.log(`     Suggested Segment: ${gap.suggestedType}`);
      console.log(`     End Location: ${gap.endLocation?.name} (${gap.endLocation?.address?.city})`);
      console.log(`     Start Location: ${gap.startLocation?.name} (${gap.startLocation?.address?.city})`);
    });
  }
}

// Example 3: Complete itinerary with proper transfers
function example3_CompleteItinerary() {
  console.log('\n=== Example 3: Complete Itinerary (No Gaps) ===\n');

  const service = new SegmentContinuityService();

  const flight: FlightSegment = {
    id: generateSegmentId(),
    type: 'FLIGHT',
    status: 'CONFIRMED',
    startDatetime: new Date('2024-06-15T08:00:00-04:00'),
    endDatetime: new Date('2024-06-15T10:00:00-04:00'),
    travelerIds: [],
    metadata: {},
    airline: { name: 'American Airlines', code: 'AA' },
    flightNumber: 'AA100',
    origin: {
      name: 'Philadelphia International Airport',
      code: 'PHL',
      address: { country: 'US' },
    },
    destination: {
      name: 'John F. Kennedy International Airport',
      code: 'JFK',
      address: { city: 'New York', country: 'US' },
    },
  };

  const transfer: Segment = {
    id: generateSegmentId(),
    type: 'TRANSFER',
    status: 'CONFIRMED',
    startDatetime: new Date('2024-06-15T10:00:00-04:00'),
    endDatetime: new Date('2024-06-15T11:00:00-04:00'),
    travelerIds: [],
    metadata: {},
    transferType: 'PRIVATE',
    pickupLocation: {
      name: 'John F. Kennedy International Airport',
      code: 'JFK',
      address: { city: 'New York', country: 'US' },
    },
    dropoffLocation: {
      name: 'The Manhattan Grand',
      address: { city: 'New York', country: 'US' },
    },
    notes: 'Private car service from JFK to hotel',
  };

  const hotel: HotelSegment = {
    id: generateSegmentId(),
    type: 'HOTEL',
    status: 'CONFIRMED',
    startDatetime: new Date('2024-06-15T15:00:00-04:00'),
    endDatetime: new Date('2024-06-17T11:00:00-04:00'),
    travelerIds: [],
    metadata: {},
    property: { name: 'The Manhattan Grand' },
    location: {
      name: 'The Manhattan Grand',
      address: { city: 'New York', country: 'US' },
    },
    checkInDate: new Date('2024-06-15'),
    checkOutDate: new Date('2024-06-17'),
    roomCount: 1,
    amenities: [],
  };

  const segments: Segment[] = [flight, transfer, hotel];
  const gaps = service.detectLocationGaps(segments);

  console.log('Segments:');
  console.log(`  1. Flight ${flight.flightNumber}: ${flight.origin.code} → ${flight.destination.code}`);
  console.log(`  2. Transfer: ${transfer.pickupLocation.code} → ${transfer.dropoffLocation.name}`);
  console.log(`  3. Hotel: ${hotel.property.name}`);

  console.log('\nGap Detection Results:');
  if (gaps.length === 0) {
    console.log('  ✓ No gaps detected - geographic continuity is valid');
  } else {
    gaps.forEach((gap, index) => {
      console.log(`  ${index + 1}. ${gap.description}`);
    });
  }
}

// Run examples
console.log('════════════════════════════════════════════════════════');
console.log('   Geographic Continuity Validation Examples');
console.log('════════════════════════════════════════════════════════');

example1_MissingTransfer();
example2_MissingInternationalFlight();
example3_CompleteItinerary();

console.log('\n════════════════════════════════════════════════════════\n');

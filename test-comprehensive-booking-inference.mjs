#!/usr/bin/env node
/**
 * Comprehensive test for booking inference enhancement
 * Tests multiple scenarios: luxury hotel, business class flight, moderate hotel
 */

import { summarizeItinerary, summarizeItineraryForTool } from './src/services/trip-designer/itinerary-summarizer.ts';

console.log('='.repeat(80));
console.log('SCENARIO 1: Luxury Hotel Booking (Hotel L\'Esplanade)');
console.log('='.repeat(80));

const luxuryHotelItinerary = {
  id: 'test-luxury',
  title: 'St. Martin Luxury Escape',
  startDate: new Date('2025-01-08'),
  endDate: new Date('2025-01-15'),
  destinations: [
    {
      name: 'Grand Case',
      address: { city: 'Grand Case', country: 'SX' },
    }
  ],
  travelers: [
    { id: 'traveler-1', firstName: 'John', lastName: 'Smith' }
  ],
  tripPreferences: {},
  segments: [
    {
      id: 'seg-hotel-luxury',
      type: 'HOTEL',
      status: 'CONFIRMED',
      startDatetime: new Date('2025-01-08T15:00:00Z'),
      endDatetime: new Date('2025-01-15T11:00:00Z'),
      checkInDate: new Date('2025-01-08'),
      checkOutDate: new Date('2025-01-15'),
      property: {
        name: 'Hotel L\'Esplanade',
        code: 'LESPL'
      },
      location: {
        name: 'Hotel L\'Esplanade',
        address: { city: 'Grand Case', country: 'SX' }
      },
      roomCount: 1,
      roomType: 'Deluxe Ocean View',
      amenities: ['infinity pool', 'beach access', 'gourmet restaurant'],
      travelerIds: ['traveler-1'],
      source: 'import',
      metadata: {}
    }
  ],
  totalPrice: null,
  metadata: {}
};

const luxurySummary = summarizeItinerary(luxuryHotelItinerary);
console.log(luxurySummary);

console.log('\n' + '='.repeat(80));
console.log('SCENARIO 2: Business Class Flight + Moderate Hotel');
console.log('='.repeat(80));

const businessTravelItinerary = {
  id: 'test-business',
  title: 'NYC Business Trip',
  startDate: new Date('2025-02-01'),
  endDate: new Date('2025-02-05'),
  destinations: [
    {
      name: 'New York',
      address: { city: 'New York', country: 'US' },
    }
  ],
  travelers: [
    { id: 'traveler-1', firstName: 'Jane', lastName: 'Doe' }
  ],
  tripPreferences: {},
  segments: [
    {
      id: 'seg-flight-business',
      type: 'FLIGHT',
      status: 'CONFIRMED',
      startDatetime: new Date('2025-02-01T08:00:00Z'),
      endDatetime: new Date('2025-02-01T11:00:00Z'),
      airline: {
        name: 'United Airlines',
        code: 'UA'
      },
      flightNumber: 'UA123',
      origin: {
        name: 'San Francisco International',
        code: 'SFO'
      },
      destination: {
        name: 'John F. Kennedy International',
        code: 'JFK'
      },
      cabinClass: 'Business',
      travelerIds: ['traveler-1'],
      source: 'import',
      metadata: {}
    },
    {
      id: 'seg-hotel-moderate',
      type: 'HOTEL',
      status: 'CONFIRMED',
      startDatetime: new Date('2025-02-01T15:00:00Z'),
      endDatetime: new Date('2025-02-05T11:00:00Z'),
      checkInDate: new Date('2025-02-01'),
      checkOutDate: new Date('2025-02-05'),
      property: {
        name: 'Marriott Marquis',
        code: 'MARRIOTT'
      },
      location: {
        name: 'Marriott Marquis',
        address: { city: 'New York', country: 'US' }
      },
      roomCount: 1,
      roomType: 'King Room',
      amenities: ['gym', 'wifi'],
      travelerIds: ['traveler-1'],
      source: 'import',
      metadata: {}
    }
  ],
  totalPrice: null,
  metadata: {}
};

const businessSummary = summarizeItinerary(businessTravelItinerary);
console.log(businessSummary);

console.log('\n' + '='.repeat(80));
console.log('SCENARIO 3: Tool Summary (includes inferred_tier field)');
console.log('='.repeat(80));

const toolSummary = summarizeItineraryForTool(luxuryHotelItinerary);
console.log(JSON.stringify(toolSummary, null, 2));

console.log('\n' + '='.repeat(80));
console.log('VALIDATION CHECKLIST');
console.log('='.repeat(80));

console.log('\n✅ Scenario 1 should show:');
console.log('   - ⚠️ EXISTING BOOKINGS section');
console.log('   - Hotel L\'Esplanade → LUXURY style');
console.log('   - 7 nights correctly calculated');

console.log('\n✅ Scenario 2 should show:');
console.log('   - Business class flight → PREMIUM style');
console.log('   - Marriott Marquis → MODERATE style');
console.log('   - Both bookings in EXISTING BOOKINGS section');

console.log('\n✅ Scenario 3 should show:');
console.log('   - "inferred_tier": "LUXURY" in hotel segment');
console.log('   - JSON format suitable for tool consumption');

console.log('\n' + '='.repeat(80));
console.log('Expected AI Behavior:');
console.log('When user opens itinerary with luxury bookings, AI should:');
console.log('  1. Read the "⚠️ EXISTING BOOKINGS" section');
console.log('  2. Infer LUXURY/PREMIUM travel style from bookings');
console.log('  3. SKIP asking about travel style/budget');
console.log('  4. Proceed with recommendations matching the tier');
console.log('='.repeat(80));

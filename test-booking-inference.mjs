#!/usr/bin/env node
/**
 * Test script to demonstrate the enhanced itinerary summarizer
 * Shows how existing bookings are now prominently displayed
 */

import { summarizeItinerary } from './src/services/trip-designer/itinerary-summarizer.ts';

// Mock itinerary with luxury hotel booking
const mockItinerary = {
  id: 'test-123',
  title: 'St. Martin Escape',
  startDate: new Date('2025-01-08'),
  endDate: new Date('2025-01-15'),
  destinations: [
    {
      name: 'Grand Case',
      address: { city: 'Grand Case', country: 'SX' },
    }
  ],
  travelers: [
    { id: 'traveler-1', firstName: 'John', lastName: 'Doe' }
  ],
  tripPreferences: {},
  segments: [
    {
      id: 'seg-1',
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
      amenities: ['pool', 'beach access', 'restaurant'],
      travelerIds: ['traveler-1'],
      source: 'import',
      metadata: {}
    }
  ],
  totalPrice: null,
  metadata: {}
};

console.log('=== Enhanced Itinerary Summary ===\n');
const summary = summarizeItinerary(mockItinerary);
console.log(summary);

console.log('\n=== Expected Highlights ===');
console.log('✓ Should show "⚠️ EXISTING BOOKINGS" section');
console.log('✓ Should indicate "Hotel L\'Esplanade in Grand Case → LUXURY style"');
console.log('✓ AI should infer luxury preference from this booking');

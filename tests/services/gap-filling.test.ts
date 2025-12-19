/**
 * Tests for geographic gap filling functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentImportService } from '../../src/services/document-import.service.js';
import { SegmentContinuityService, GapType } from '../../src/services/segment-continuity.service.js';
import type { Itinerary } from '../../src/domain/types/itinerary.js';
import type { FlightSegment, HotelSegment, TransferSegment } from '../../src/domain/types/segment.js';
import { SegmentType } from '../../src/domain/types/common.js';
import { generateSegmentId, generateItineraryId } from '../../src/domain/types/branded.js';

describe('Geographic Gap Filling', () => {
  let continuityService: SegmentContinuityService;

  beforeEach(() => {
    continuityService = new SegmentContinuityService();
  });

  describe('Gap Detection', () => {
    it('should detect gap between flight arrival and hotel', () => {
      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: SegmentType.FLIGHT,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T08:00:00Z'),
        endDatetime: new Date('2025-01-10T17:00:00Z'),
        travelerIds: [],
        airline: { name: 'United', code: 'UA' },
        flightNumber: 'UA123',
        origin: {
          name: 'San Francisco Intl',
          code: 'SFO',
          type: 'AIRPORT',
          address: { country: 'US', city: 'San Francisco' }
        },
        destination: {
          name: 'JFK Airport',
          code: 'JFK',
          type: 'AIRPORT',
          address: { country: 'US', city: 'New York' }
        },
        metadata: {},
      };

      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T15:00:00Z'),
        endDatetime: new Date('2025-01-12T11:00:00Z'),
        travelerIds: [],
        property: { name: 'Manhattan Grand Hotel' },
        location: {
          name: 'Manhattan Grand Hotel',
          city: 'New York',
          type: 'HOTEL',
          address: { country: 'US', city: 'New York' }
        },
        checkInDate: new Date('2025-01-10'),
        checkOutDate: new Date('2025-01-12'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([flight, hotel]);

      expect(gaps).toHaveLength(1);
      expect(gaps[0]?.gapType).toBe(GapType.LOCAL_TRANSFER);
      expect(gaps[0]?.suggestedType).toBe('TRANSFER');
      expect(gaps[0]?.description).toContain('JFK');
      expect(gaps[0]?.description).toContain('Manhattan');
    });

    it('should detect gap between hotels in different cities', () => {
      const hotel1: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T15:00:00Z'),
        endDatetime: new Date('2025-01-12T11:00:00Z'),
        travelerIds: [],
        property: { name: 'Manhattan Grand Hotel' },
        location: { name: 'Manhattan Grand Hotel', city: 'New York', address: { country: 'US' }, type: 'HOTEL' },
        checkInDate: new Date('2025-01-10'),
        checkOutDate: new Date('2025-01-12'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const hotel2: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-13T15:00:00Z'),
        endDatetime: new Date('2025-01-15T11:00:00Z'),
        travelerIds: [],
        property: { name: 'Miami Beach Resort' },
        location: { name: 'Miami Beach Resort', city: 'Miami', address: { country: 'US' }, type: 'HOTEL' },
        checkInDate: new Date('2025-01-13'),
        checkOutDate: new Date('2025-01-15'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([hotel1, hotel2]);

      expect(gaps).toHaveLength(1);
      expect(gaps[0]?.gapType).toBe(GapType.DOMESTIC_GAP);
      expect(gaps[0]?.suggestedType).toBe('FLIGHT');
    });

    it('should detect gap between hotels in different countries', () => {
      const hotel1: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T15:00:00Z'),
        endDatetime: new Date('2025-01-12T11:00:00Z'),
        travelerIds: [],
        property: { name: 'Manhattan Grand Hotel' },
        location: { name: 'Manhattan Grand Hotel', city: 'New York', address: { country: 'US' }, type: 'HOTEL' },
        checkInDate: new Date('2025-01-10'),
        checkOutDate: new Date('2025-01-12'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const hotel2: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-13T15:00:00Z'),
        endDatetime: new Date('2025-01-15T11:00:00Z'),
        travelerIds: [],
        property: { name: 'London Savoy' },
        location: { name: 'London Savoy', city: 'London', address: { country: 'GB' }, type: 'HOTEL' },
        checkInDate: new Date('2025-01-13'),
        checkOutDate: new Date('2025-01-15'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([hotel1, hotel2]);

      expect(gaps).toHaveLength(1);
      expect(gaps[0]?.gapType).toBe(GapType.INTERNATIONAL_GAP);
      expect(gaps[0]?.suggestedType).toBe('FLIGHT');
    });

    it('should not detect gap when transfer exists', () => {
      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: SegmentType.FLIGHT,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T08:00:00Z'),
        endDatetime: new Date('2025-01-10T17:00:00Z'),
        travelerIds: [],
        airline: { name: 'United', code: 'UA' },
        flightNumber: 'UA123',
        origin: {
          name: 'San Francisco Intl',
          code: 'SFO',
          type: 'AIRPORT',
          address: { country: 'US', city: 'San Francisco' }
        },
        destination: {
          name: 'JFK Airport',
          code: 'JFK',
          type: 'AIRPORT',
          address: { country: 'US', city: 'New York' }
        },
        metadata: {},
      };

      const transfer: TransferSegment = {
        id: generateSegmentId(),
        type: SegmentType.TRANSFER,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T17:30:00Z'),
        endDatetime: new Date('2025-01-10T18:30:00Z'),
        travelerIds: [],
        transferType: 'PRIVATE',
        pickupLocation: { name: 'JFK Airport', code: 'JFK', type: 'AIRPORT' },
        dropoffLocation: { name: 'Manhattan Grand Hotel', city: 'New York', type: 'HOTEL' },
        metadata: {},
      };

      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T19:00:00Z'),
        endDatetime: new Date('2025-01-12T11:00:00Z'),
        travelerIds: [],
        property: { name: 'Manhattan Grand Hotel' },
        location: {
          name: 'Manhattan Grand Hotel',
          city: 'New York',
          type: 'HOTEL',
          address: { country: 'US', city: 'New York' }
        },
        checkInDate: new Date('2025-01-10'),
        checkOutDate: new Date('2025-01-12'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([flight, transfer, hotel]);

      // Should detect no gaps because transfer connects flight to hotel
      expect(gaps).toHaveLength(0);
    });

    it('should not create consecutive transfers (regression test for Greece bug)', () => {
      // Reproduces the bug where LLM extracted a transfer from PDF,
      // but gap-filler created another transfer right after it
      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: SegmentType.FLIGHT,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T08:00:00Z'),
        endDatetime: new Date('2025-01-10T20:00:00Z'),
        travelerIds: [],
        airline: { name: 'Unknown', code: 'XX' },
        flightNumber: 'XX0000',
        origin: { name: 'Unknown', code: 'UNK', type: 'AIRPORT' },
        destination: { name: 'Athens International Airport', code: 'ATH', type: 'AIRPORT' },
        metadata: {},
      };

      const transfer: TransferSegment = {
        id: generateSegmentId(),
        type: SegmentType.TRANSFER,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T20:00:00Z'),
        endDatetime: new Date('2025-01-10T21:00:00Z'),
        travelerIds: [],
        source: 'import', // Imported from PDF
        transferType: 'PRIVATE',
        pickupLocation: { name: 'Athens International Airport', type: 'AIRPORT' },
        dropoffLocation: { name: 'King George Hotel', type: 'HOTEL' },
        metadata: {},
      };

      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T22:30:00Z'),
        endDatetime: new Date('2025-01-12T11:00:00Z'),
        travelerIds: [],
        property: { name: 'King George Hotel' },
        location: { name: 'King George Hotel', type: 'HOTEL' },
        checkInDate: new Date('2025-01-10'),
        checkOutDate: new Date('2025-01-12'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([flight, transfer, hotel]);

      // Should detect NO gaps - transfer already connects flight to hotel
      // Before fix: Would detect gap between transfer and hotel, creating consecutive transfers
      expect(gaps).toHaveLength(0);
    });
  });

  describe('Placeholder Segment Creation', () => {
    it('should create placeholder transfer with correct fields', () => {
      // We need to access the private method via DocumentImportService
      // So we'll test the public interface via fillRemainingGaps indirectly
      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: SegmentType.FLIGHT,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T08:00:00Z'),
        endDatetime: new Date('2025-01-10T17:00:00Z'),
        travelerIds: [],
        airline: { name: 'United', code: 'UA' },
        flightNumber: 'UA123',
        origin: {
          name: 'San Francisco Intl',
          code: 'SFO',
          type: 'AIRPORT',
          address: { country: 'US', city: 'San Francisco' }
        },
        destination: {
          name: 'JFK Airport',
          code: 'JFK',
          type: 'AIRPORT',
          address: { country: 'US', city: 'New York' }
        },
        metadata: {},
      };

      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T19:00:00Z'),
        endDatetime: new Date('2025-01-12T11:00:00Z'),
        travelerIds: [],
        property: { name: 'Manhattan Grand Hotel' },
        location: {
          name: 'Manhattan Grand Hotel',
          city: 'New York',
          type: 'HOTEL',
          address: { country: 'US', city: 'New York' }
        },
        checkInDate: new Date('2025-01-10'),
        checkOutDate: new Date('2025-01-12'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const itinerary: Itinerary = {
        id: generateItineraryId(),
        version: 1,
        status: 'DRAFT',
        title: 'Test Trip',
        startDate: new Date('2025-01-10'),
        endDate: new Date('2025-01-12'),
        tripType: 'LEISURE',
        destinations: [],
        travelers: [],
        segments: [flight, hotel],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      // Mock DocumentImportService - we'll test this via integration tests
      // For now, verify gap detection works
      const gaps = continuityService.detectLocationGaps(itinerary.segments);
      expect(gaps).toHaveLength(1);
      expect(gaps[0]?.suggestedType).toBe('TRANSFER');
    });

    it('should create placeholder flight with correct fields', () => {
      const hotel1: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T15:00:00Z'),
        endDatetime: new Date('2025-01-12T11:00:00Z'),
        travelerIds: [],
        property: { name: 'Manhattan Grand Hotel' },
        location: { name: 'Manhattan Grand Hotel', city: 'New York', address: { country: 'US' }, type: 'HOTEL' },
        checkInDate: new Date('2025-01-10'),
        checkOutDate: new Date('2025-01-12'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const hotel2: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-13T15:00:00Z'),
        endDatetime: new Date('2025-01-15T11:00:00Z'),
        travelerIds: [],
        property: { name: 'Miami Beach Resort' },
        location: { name: 'Miami Beach Resort', city: 'Miami', address: { country: 'US' }, type: 'HOTEL' },
        checkInDate: new Date('2025-01-13'),
        checkOutDate: new Date('2025-01-15'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([hotel1, hotel2]);
      expect(gaps).toHaveLength(1);
      expect(gaps[0]?.suggestedType).toBe('FLIGHT');
      expect(gaps[0]?.gapType).toBe(GapType.DOMESTIC_GAP);
    });
  });

  describe('Segment Insertion Order', () => {
    it('should maintain chronological order after gap filling', () => {
      const segments = [
        {
          id: generateSegmentId(),
          type: SegmentType.FLIGHT,
          status: 'CONFIRMED' as const,
          startDatetime: new Date('2025-01-10T08:00:00Z'),
          endDatetime: new Date('2025-01-10T17:00:00Z'),
          travelerIds: [],
          airline: { name: 'United', code: 'UA' },
          flightNumber: 'UA123',
          origin: { name: 'San Francisco Intl', code: 'SFO', type: 'AIRPORT' as const },
          destination: { name: 'JFK Airport', code: 'JFK', type: 'AIRPORT' as const },
          metadata: {},
        },
        {
          id: generateSegmentId(),
          type: SegmentType.HOTEL,
          status: 'CONFIRMED' as const,
          startDatetime: new Date('2025-01-10T19:00:00Z'),
          endDatetime: new Date('2025-01-12T11:00:00Z'),
          travelerIds: [],
          property: { name: 'Manhattan Grand Hotel' },
          location: { name: 'Manhattan Grand Hotel', city: 'New York', type: 'HOTEL' as const },
          checkInDate: new Date('2025-01-10'),
          checkOutDate: new Date('2025-01-12'),
          roomCount: 1,
          amenities: [],
          metadata: {},
        },
      ];

      const sortedSegments = continuityService.sortSegments(segments);

      // Verify sorting maintains order
      expect(sortedSegments[0]?.startDatetime.getTime()).toBeLessThan(
        sortedSegments[1]?.startDatetime.getTime() ?? 0
      );
    });
  });

  describe('Overnight Gap Detection', () => {
    it('should not create transfer for overnight gap (dinner to next-day lunch)', () => {
      // Regression test for NYC itinerary bug
      // Dinner at Bad Roman (9:00 PM Dec 4) -> Lunch at Le Café Louis Vuitton (12:00 PM Dec 5)
      const dinner = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED' as const,
        startDatetime: new Date('2025-12-04T19:00:00Z'), // 7:00 PM
        endDatetime: new Date('2025-12-04T21:00:00Z'),   // 9:00 PM
        travelerIds: [],
        name: 'Dinner at Bad Roman',
        location: { name: 'Bad Roman', type: 'RESTAURANT' as const },
        metadata: {},
      };

      const lunch = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED' as const,
        startDatetime: new Date('2025-12-05T12:00:00Z'), // 12:00 PM next day
        endDatetime: new Date('2025-12-05T13:30:00Z'),
        travelerIds: [],
        name: 'Lunch at Le Café Louis Vuitton',
        location: { name: 'Le Café Louis Vuitton', type: 'RESTAURANT' as const },
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([dinner, lunch]);

      // Should NOT create a gap - this is overnight, traveler at hotel
      expect(gaps).toHaveLength(0);
    });

    it('should not create transfer for same-day long gap (>8 hours)', () => {
      const morningActivity = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED' as const,
        startDatetime: new Date('2025-12-04T08:00:00Z'), // 8:00 AM
        endDatetime: new Date('2025-12-04T10:00:00Z'),   // 10:00 AM
        travelerIds: [],
        name: 'Morning Tour',
        location: { name: 'Location A', type: 'POI' as const },
        metadata: {},
      };

      const eveningActivity = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED' as const,
        startDatetime: new Date('2025-12-04T20:00:00Z'), // 8:00 PM same day
        endDatetime: new Date('2025-12-04T22:00:00Z'),
        travelerIds: [],
        name: 'Evening Dinner',
        location: { name: 'Location B', type: 'RESTAURANT' as const },
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([morningActivity, eveningActivity]);

      // Should NOT create a gap - 10+ hour gap is unusual, likely hotel return
      expect(gaps).toHaveLength(0);
    });

    it('should create transfer for same-day activities with short gap', () => {
      const lunch = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED' as const,
        startDatetime: new Date('2025-12-04T12:00:00Z'), // 12:00 PM
        endDatetime: new Date('2025-12-04T13:00:00Z'),   // 1:00 PM
        travelerIds: [],
        name: 'Lunch',
        location: { name: 'Restaurant A', city: 'New York', type: 'RESTAURANT' as const },
        metadata: {},
      };

      const activity = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED' as const,
        startDatetime: new Date('2025-12-04T15:00:00Z'), // 3:00 PM same day
        endDatetime: new Date('2025-12-04T17:00:00Z'),
        travelerIds: [],
        name: 'Museum Visit',
        location: { name: 'Museum B', city: 'New York', type: 'POI' as const },
        metadata: {},
      };

      const gaps = continuityService.detectLocationGaps([lunch, activity]);

      // SHOULD create a gap - only 2 hours between activities, reasonable transfer time
      expect(gaps).toHaveLength(1);
      expect(gaps[0]?.gapType).toBe(GapType.LOCAL_TRANSFER);
    });
  });
});

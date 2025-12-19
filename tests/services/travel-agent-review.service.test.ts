/**
 * Tests for TravelAgentReviewService
 */

import { describe, it, expect } from 'vitest';
import { TravelAgentReviewService } from '../../src/services/travel-agent-review.service.js';
import type { Itinerary } from '../../src/domain/types/itinerary.js';
import type { FlightSegment, HotelSegment, TransferSegment } from '../../src/domain/types/segment.js';
import { SegmentType, SegmentStatus } from '../../src/domain/types/common.js';
import { generateItineraryId, generateSegmentId, generateTravelerId } from '../../src/domain/types/branded.js';

describe('TravelAgentReviewService', () => {
  const reviewService = new TravelAgentReviewService();

  describe('reviewItinerary', () => {
    it('should detect missing transfer after flight arrival', () => {
      // Create a simple itinerary: SFO→JFK flight, then hotel (no transfer)
      const flight: FlightSegment = {
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

      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: SegmentStatus.CONFIRMED,
        startDatetime: new Date('2025-01-15T17:00:00Z'),
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
        checkInDate: new Date('2025-01-15T17:00:00Z'),
        checkOutDate: new Date('2025-01-16T11:00:00Z'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const itinerary: Itinerary = {
        id: generateItineraryId(),
        title: 'NYC Trip',
        status: 'PLANNED',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-16'),
        travelers: [],
        segments: [flight, hotel],
        metadata: {},
      };

      const result = reviewService.reviewItinerary(itinerary);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);

      const missingTransferIssue = result.issues.find(
        (issue) => issue.type === 'MISSING_AIRPORT_TRANSFER'
      );

      expect(missingTransferIssue).toBeDefined();
      expect(missingTransferIssue?.severity).toBe('HIGH');
      expect(missingTransferIssue?.suggestedFix).toBeDefined();
      expect(missingTransferIssue?.suggestedFix?.type).toBe(SegmentType.TRANSFER);
    });

    it('should NOT detect issue when transfer exists', () => {
      const flight: FlightSegment = {
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

      const transfer: TransferSegment = {
        id: generateSegmentId(),
        type: SegmentType.TRANSFER,
        status: SegmentStatus.CONFIRMED,
        startDatetime: new Date('2025-01-15T17:00:00Z'),
        endDatetime: new Date('2025-01-15T17:30:00Z'),
        travelerIds: [generateTravelerId()],
        source: 'import',
        transferType: 'PRIVATE',
        pickupLocation: {
          name: 'JFK Airport',
          code: 'JFK',
          type: 'AIRPORT',
        },
        dropoffLocation: {
          name: 'Manhattan Grand Hotel',
          address: {
            city: 'New York',
            state: 'NY',
            country: 'US',
          },
        },
        metadata: {},
      };

      const hotel: HotelSegment = {
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

      const itinerary: Itinerary = {
        id: generateItineraryId(),
        title: 'NYC Trip',
        status: 'PLANNED',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-16'),
        travelers: [],
        segments: [flight, transfer, hotel],
        metadata: {},
      };

      const result = reviewService.reviewItinerary(itinerary);

      // Should be valid since transfer exists
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should detect time overlaps', () => {
      const segment1: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: SegmentStatus.CONFIRMED,
        startDatetime: new Date('2025-01-15T14:00:00Z'),
        endDatetime: new Date('2025-01-15T18:00:00Z'),
        travelerIds: [generateTravelerId()],
        source: 'import',
        property: { name: 'Hotel A' },
        location: { name: 'Hotel A' },
        checkInDate: new Date('2025-01-15T14:00:00Z'),
        checkOutDate: new Date('2025-01-15T18:00:00Z'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const segment2: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: SegmentStatus.CONFIRMED,
        startDatetime: new Date('2025-01-15T17:00:00Z'), // Starts before segment1 ends
        endDatetime: new Date('2025-01-15T20:00:00Z'),
        travelerIds: [generateTravelerId()],
        source: 'import',
        property: { name: 'Hotel B' },
        location: { name: 'Hotel B' },
        checkInDate: new Date('2025-01-15T17:00:00Z'),
        checkOutDate: new Date('2025-01-15T20:00:00Z'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const itinerary: Itinerary = {
        id: generateItineraryId(),
        title: 'Test Trip',
        status: 'PLANNED',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        travelers: [],
        segments: [segment1, segment2],
        metadata: {},
      };

      const result = reviewService.reviewItinerary(itinerary);

      expect(result.valid).toBe(false);
      const overlapIssue = result.issues.find(
        (issue) => issue.type === 'OVERLAPPING_TIMES'
      );
      expect(overlapIssue).toBeDefined();
      expect(overlapIssue?.severity).toBe('MEDIUM');
    });
  });

  describe('autoFixIssues', () => {
    it('should auto-fix missing airport transfer', () => {
      const flight: FlightSegment = {
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
          name: 'SFO',
          code: 'SFO',
          type: 'AIRPORT',
        },
        destination: {
          name: 'JFK',
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

      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: SegmentType.HOTEL,
        status: SegmentStatus.CONFIRMED,
        startDatetime: new Date('2025-01-15T19:00:00Z'),
        endDatetime: new Date('2025-01-16T11:00:00Z'),
        travelerIds: [generateTravelerId()],
        source: 'import',
        property: { name: 'Manhattan Hotel' },
        location: {
          name: 'Manhattan Hotel',
          address: {
            city: 'New York',
            state: 'NY',
            country: 'US',
          },
        },
        checkInDate: new Date('2025-01-15T19:00:00Z'),
        checkOutDate: new Date('2025-01-16T11:00:00Z'),
        roomCount: 1,
        amenities: [],
        metadata: {},
      };

      const itinerary: Itinerary = {
        id: generateItineraryId(),
        title: 'NYC Trip',
        status: 'PLANNED',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-16'),
        travelers: [],
        segments: [flight, hotel],
        metadata: {},
      };

      const reviewResult = reviewService.reviewItinerary(itinerary);
      expect(reviewResult.valid).toBe(false);

      const fixedItinerary = reviewService.autoFixIssues(itinerary, reviewResult);

      // Should have added a transfer segment
      expect(fixedItinerary.segments.length).toBe(3);

      // Find the inserted transfer
      const transfer = fixedItinerary.segments.find(
        (seg) => seg.type === SegmentType.TRANSFER
      ) as TransferSegment | undefined;

      expect(transfer).toBeDefined();
      expect(transfer?.inferred).toBe(true);
      expect(transfer?.pickupLocation.code).toBe('JFK');
    });
  });
});

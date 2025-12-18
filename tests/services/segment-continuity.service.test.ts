/**
 * Tests for SegmentContinuityService
 * @module services/__tests__/segment-continuity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SegmentContinuityService, GapType } from '../../src/services/segment-continuity.service.js';
import type { FlightSegment, HotelSegment, TransferSegment, Segment } from '../../src/domain/types/segment.js';
import { generateSegmentId } from '../../src/domain/types/branded.js';

describe('SegmentContinuityService', () => {
  let service: SegmentContinuityService;

  beforeEach(() => {
    service = new SegmentContinuityService();
  });

  describe('getStartLocation', () => {
    it('should extract start location from flight segment', () => {
      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: 'FLIGHT',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T10:00:00Z'),
        endDatetime: new Date('2024-01-01T13:00:00Z'),
        travelerIds: [],
        metadata: {},
        airline: { name: 'American Airlines', code: 'AA' },
        flightNumber: 'AA100',
        origin: { name: 'JFK Airport', code: 'JFK', address: { country: 'US' } },
        destination: { name: 'Milan Malpensa', code: 'MXP', address: { country: 'IT' } },
      };

      const location = service.getStartLocation(flight);
      expect(location).toEqual({ name: 'JFK Airport', code: 'JFK', address: { country: 'US' } });
    });

    it('should extract start location from hotel segment', () => {
      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: 'HOTEL',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T15:00:00Z'),
        endDatetime: new Date('2024-01-03T11:00:00Z'),
        travelerIds: [],
        metadata: {},
        property: { name: 'Grand Hotel' },
        location: { name: 'Grand Hotel', address: { city: 'Milan', country: 'IT' } },
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        roomCount: 1,
        amenities: [],
      };

      const location = service.getStartLocation(hotel);
      expect(location?.name).toBe('Grand Hotel');
      expect(location?.address?.city).toBe('Milan');
    });

    it('should extract start location from transfer segment', () => {
      const transfer: TransferSegment = {
        id: generateSegmentId(),
        type: 'TRANSFER',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T13:00:00Z'),
        endDatetime: new Date('2024-01-01T14:00:00Z'),
        travelerIds: [],
        metadata: {},
        transferType: 'PRIVATE',
        pickupLocation: { name: 'Milan Malpensa Airport', code: 'MXP' },
        dropoffLocation: { name: 'Grand Hotel Milan', address: { city: 'Milan', country: 'IT' } },
      };

      const location = service.getStartLocation(transfer);
      expect(location?.name).toBe('Milan Malpensa Airport');
    });
  });

  describe('getEndLocation', () => {
    it('should extract end location from flight segment', () => {
      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: 'FLIGHT',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T10:00:00Z'),
        endDatetime: new Date('2024-01-01T13:00:00Z'),
        travelerIds: [],
        metadata: {},
        airline: { name: 'American Airlines', code: 'AA' },
        flightNumber: 'AA100',
        origin: { name: 'JFK Airport', code: 'JFK', address: { country: 'US' } },
        destination: { name: 'Milan Malpensa', code: 'MXP', address: { country: 'IT' } },
      };

      const location = service.getEndLocation(flight);
      expect(location?.code).toBe('MXP');
    });

    it('should return same location for hotel segment (no movement)', () => {
      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: 'HOTEL',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T15:00:00Z'),
        endDatetime: new Date('2024-01-03T11:00:00Z'),
        travelerIds: [],
        metadata: {},
        property: { name: 'Grand Hotel' },
        location: { name: 'Grand Hotel', address: { city: 'Milan', country: 'IT' } },
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        roomCount: 1,
        amenities: [],
      };

      const location = service.getEndLocation(hotel);
      expect(location?.name).toBe('Grand Hotel');
    });
  });

  describe('classifyGap', () => {
    it('should classify local transfer gap (same city)', () => {
      const endLoc = { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } };
      const startLoc = { name: 'Manhattan Grand Hotel', address: { city: 'New York', country: 'US' } };

      const gapType = service.classifyGap(endLoc, startLoc);
      expect(gapType).toBe(GapType.LOCAL_TRANSFER);
    });

    it('should classify domestic gap (different cities, same country)', () => {
      const endLoc = { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } };
      const startLoc = { name: 'LAX Airport', code: 'LAX', address: { city: 'Los Angeles', country: 'US' } };

      const gapType = service.classifyGap(endLoc, startLoc);
      expect(gapType).toBe(GapType.DOMESTIC_GAP);
    });

    it('should classify international gap (different countries)', () => {
      const endLoc = { name: 'PHL Airport', code: 'PHL', address: { country: 'US' } };
      const startLoc = { name: 'Milan Malpensa', code: 'MXP', address: { country: 'IT' } };

      const gapType = service.classifyGap(endLoc, startLoc);
      expect(gapType).toBe(GapType.INTERNATIONAL_GAP);
    });

    it('should infer country from airport codes when address missing', () => {
      const endLoc = { name: 'JFK Airport', code: 'JFK' };
      const startLoc = { name: 'Milan Malpensa', code: 'MXP' };

      const gapType = service.classifyGap(endLoc, startLoc);
      expect(gapType).toBe(GapType.INTERNATIONAL_GAP);
    });
  });

  describe('detectLocationGaps', () => {
    it('should detect gap between flight arrival and hotel (missing transfer)', () => {
      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: 'FLIGHT',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T10:00:00Z'),
        endDatetime: new Date('2024-01-01T13:00:00Z'),
        travelerIds: [],
        metadata: {},
        airline: { name: 'American Airlines', code: 'AA' },
        flightNumber: 'AA100',
        origin: { name: 'Philadelphia Airport', code: 'PHL', address: { country: 'US' } },
        destination: { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } },
      };

      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: 'HOTEL',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T15:00:00Z'),
        endDatetime: new Date('2024-01-03T11:00:00Z'),
        travelerIds: [],
        metadata: {},
        property: { name: 'Manhattan Grand Hotel' },
        location: { name: 'Manhattan Grand Hotel', address: { city: 'New York', country: 'US' } },
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        roomCount: 1,
        amenities: [],
      };

      const gaps = service.detectLocationGaps([flight, hotel]);

      expect(gaps).toHaveLength(1);
      expect(gaps[0]?.gapType).toBe(GapType.LOCAL_TRANSFER);
      expect(gaps[0]?.suggestedType).toBe('TRANSFER');
      expect(gaps[0]?.description).toContain('JFK');
      expect(gaps[0]?.description).toContain('Manhattan Grand Hotel');
    });

    it('should detect international gap (missing flight)', () => {
      const hotel1: HotelSegment = {
        id: generateSegmentId(),
        type: 'HOTEL',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T15:00:00Z'),
        endDatetime: new Date('2024-01-03T11:00:00Z'),
        travelerIds: [],
        metadata: {},
        property: { name: 'Philadelphia Hotel' },
        location: { name: 'Philadelphia Hotel', address: { city: 'Philadelphia', country: 'US' } },
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        roomCount: 1,
        amenities: [],
      };

      const hotel2: HotelSegment = {
        id: generateSegmentId(),
        type: 'HOTEL',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-04T15:00:00Z'),
        endDatetime: new Date('2024-01-06T11:00:00Z'),
        travelerIds: [],
        metadata: {},
        property: { name: 'Milan Grand Hotel' },
        location: { name: 'Milan Grand Hotel', address: { city: 'Milan', country: 'IT' } },
        checkInDate: new Date('2024-01-04'),
        checkOutDate: new Date('2024-01-06'),
        roomCount: 1,
        amenities: [],
      };

      const gaps = service.detectLocationGaps([hotel1, hotel2]);

      expect(gaps).toHaveLength(1);
      expect(gaps[0]?.gapType).toBe(GapType.INTERNATIONAL_GAP);
      expect(gaps[0]?.suggestedType).toBe('FLIGHT');
      expect(gaps[0]?.description).toContain('International flight needed');
    });

    it('should not detect gaps when transfer exists', () => {
      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: 'FLIGHT',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T10:00:00Z'),
        endDatetime: new Date('2024-01-01T13:00:00Z'),
        travelerIds: [],
        metadata: {},
        airline: { name: 'American Airlines', code: 'AA' },
        flightNumber: 'AA100',
        origin: { name: 'PHL Airport', code: 'PHL' },
        destination: { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } },
      };

      const transfer: TransferSegment = {
        id: generateSegmentId(),
        type: 'TRANSFER',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T13:00:00Z'),
        endDatetime: new Date('2024-01-01T14:00:00Z'),
        travelerIds: [],
        metadata: {},
        transferType: 'TAXI',
        pickupLocation: { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } },
        dropoffLocation: { name: 'Manhattan Grand Hotel', address: { city: 'New York', country: 'US' } },
      };

      const hotel: HotelSegment = {
        id: generateSegmentId(),
        type: 'HOTEL',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T15:00:00Z'),
        endDatetime: new Date('2024-01-03T11:00:00Z'),
        travelerIds: [],
        metadata: {},
        property: { name: 'Manhattan Grand Hotel' },
        location: { name: 'Manhattan Grand Hotel', address: { city: 'New York', country: 'US' } },
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        roomCount: 1,
        amenities: [],
      };

      const gaps = service.detectLocationGaps([flight, transfer, hotel]);

      expect(gaps).toHaveLength(0);
    });
  });

  describe('sortSegments', () => {
    it('should sort segments by start datetime', () => {
      const segment1: Segment = {
        id: generateSegmentId(),
        type: 'HOTEL',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-03T15:00:00Z'),
        endDatetime: new Date('2024-01-05T11:00:00Z'),
        travelerIds: [],
        metadata: {},
        property: { name: 'Hotel C' },
        location: { name: 'Location C' },
        checkInDate: new Date('2024-01-03'),
        checkOutDate: new Date('2024-01-05'),
        roomCount: 1,
        amenities: [],
      } as HotelSegment;

      const segment2: Segment = {
        id: generateSegmentId(),
        type: 'HOTEL',
        status: 'CONFIRMED',
        startDatetime: new Date('2024-01-01T15:00:00Z'),
        endDatetime: new Date('2024-01-03T11:00:00Z'),
        travelerIds: [],
        metadata: {},
        property: { name: 'Hotel A' },
        location: { name: 'Location A' },
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        roomCount: 1,
        amenities: [],
      } as HotelSegment;

      const sorted = service.sortSegments([segment1, segment2]);

      expect(sorted[0]).toBe(segment2); // Earlier date
      expect(sorted[1]).toBe(segment1); // Later date
    });
  });
});

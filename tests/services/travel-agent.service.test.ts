/**
 * Tests for TravelAgentService
 * @module services/__tests__/travel-agent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TravelAgentService } from '../../src/services/travel-agent.service.js';
import type { LocationGap } from '../../src/services/segment-continuity.service.js';
import { GapType } from '../../src/services/segment-continuity.service.js';
import type { FlightSegment, HotelSegment, Segment } from '../../src/domain/types/segment.js';
import { CabinClass, SegmentType, SegmentStatus } from '../../src/domain/types/common.js';
import { generateSegmentId } from '../../src/domain/types/branded.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('TravelAgentService', () => {
  let service: TravelAgentService;

  beforeEach(() => {
    service = new TravelAgentService({ apiKey: 'test-api-key' });
    vi.clearAllMocks();
  });

  describe('inferTravelClass', () => {
    it('should infer ECONOMY from economy flights', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.ECONOMY }),
        createFlightSegment({ cabinClass: CabinClass.ECONOMY }),
      ];

      const result = service.inferTravelClass(segments);
      expect(result).toBe(CabinClass.ECONOMY);
    });

    it('should infer BUSINESS from business flights', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.BUSINESS }),
        createFlightSegment({ cabinClass: CabinClass.BUSINESS }),
      ];

      const result = service.inferTravelClass(segments);
      expect(result).toBe(CabinClass.BUSINESS);
    });

    it('should return most common cabin class', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.ECONOMY }),
        createFlightSegment({ cabinClass: CabinClass.BUSINESS }),
        createFlightSegment({ cabinClass: CabinClass.BUSINESS }),
      ];

      const result = service.inferTravelClass(segments);
      expect(result).toBe(CabinClass.BUSINESS);
    });

    it('should default to ECONOMY when no flights exist', () => {
      const segments: Segment[] = [];

      const result = service.inferTravelClass(segments);
      expect(result).toBe(CabinClass.ECONOMY);
    });

    it('should default to ECONOMY when cabin class not specified', () => {
      const segments: Segment[] = [createFlightSegment({ cabinClass: undefined })];

      const result = service.inferTravelClass(segments);
      expect(result).toBe(CabinClass.ECONOMY);
    });
  });

  describe('inferHotelTier', () => {
    it('should infer 5-star from luxury brand hotels', () => {
      const segments: Segment[] = [
        createHotelSegment({ propertyName: 'Four Seasons Resort' }),
        createHotelSegment({ propertyName: 'Ritz Carlton Hotel' }),
      ];

      const result = service.inferHotelTier(segments);
      expect(result).toBe(5);
    });

    it('should infer 4-star from premium brand hotels', () => {
      const segments: Segment[] = [
        createHotelSegment({ propertyName: 'Marriott Hotel' }),
        createHotelSegment({ propertyName: 'Hilton Garden Inn' }),
      ];

      const result = service.inferHotelTier(segments);
      expect(result).toBe(4);
    });

    it('should default to 3-star when no hotels exist', () => {
      const segments: Segment[] = [];

      const result = service.inferHotelTier(segments);
      expect(result).toBe(3);
    });

    it('should default to 3-star for unknown brands', () => {
      const segments: Segment[] = [createHotelSegment({ propertyName: 'Local Boutique Hotel' })];

      const result = service.inferHotelTier(segments);
      expect(result).toBe(3);
    });
  });

  describe('inferPreferences', () => {
    it('should infer luxury preferences from business class and 5-star hotels', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.BUSINESS }),
        createHotelSegment({ propertyName: 'Four Seasons Resort' }),
      ];

      const preferences = service.inferPreferences(segments);

      expect(preferences.cabinClass).toBe(CabinClass.BUSINESS);
      expect(preferences.hotelStarRating).toBe(5);
      expect(preferences.budgetTier).toBe('luxury');
    });

    it('should infer premium preferences from premium economy and 4-star hotels', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.PREMIUM_ECONOMY }),
        createHotelSegment({ propertyName: 'Marriott Hotel' }),
      ];

      const preferences = service.inferPreferences(segments);

      expect(preferences.cabinClass).toBe(CabinClass.PREMIUM_ECONOMY);
      expect(preferences.hotelStarRating).toBe(4);
      expect(preferences.budgetTier).toBe('premium');
    });

    it('should infer economy preferences by default', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.ECONOMY }),
        createHotelSegment({ propertyName: 'Budget Inn' }),
      ];

      const preferences = service.inferPreferences(segments);

      expect(preferences.cabinClass).toBe(CabinClass.ECONOMY);
      expect(preferences.hotelStarRating).toBe(3);
      expect(preferences.budgetTier).toBe('economy');
    });
  });

  describe('searchFlight', () => {
    it('should search for flights and create flight segment', async () => {
      const gap = createGap({
        gapType: GapType.INTERNATIONAL_GAP,
        endLocation: { name: 'JFK Airport', code: 'JFK', address: { country: 'US' } },
        startLocation: { name: 'Milan Malpensa', code: 'MXP', address: { country: 'IT' } },
      });

      const mockResponse = {
        search_metadata: { status: 'success' },
        best_flights: [
          {
            flights: [
              {
                departure_airport: { id: 'JFK', name: 'John F. Kennedy International Airport' },
                arrival_airport: { id: 'MXP', name: 'Milan Malpensa Airport' },
                airline: 'Delta Air Lines',
                flight_number: 'DL404',
                departure_time: '2024-01-02T18:00:00',
                arrival_time: '2024-01-03T08:00:00',
                duration: 480,
                airplane: 'Boeing 767',
                travel_class: 'Economy',
              },
            ],
            price: 650,
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const preferences = {
        cabinClass: CabinClass.ECONOMY,
        hotelStarRating: 3,
        budgetTier: 'economy' as const,
      };

      const result = await service.searchFlight(gap, preferences);

      expect(result.found).toBe(true);
      expect(result.segment).toBeDefined();
      expect(result.segment?.type).toBe(SegmentType.FLIGHT);

      const flightSegment = result.segment as FlightSegment;
      expect(flightSegment.airline.name).toBe('Delta Air Lines');
      expect(flightSegment.flightNumber).toBe('DL404');
      expect(flightSegment.origin.code).toBe('JFK');
      expect(flightSegment.destination.code).toBe('MXP');
      expect(flightSegment.price?.amount).toBe(650);
      expect(flightSegment.inferred).toBe(true);
    });

    it('should return error when airport codes cannot be determined', async () => {
      const gap = createGap({
        endLocation: { name: 'Unknown Location' },
        startLocation: { name: 'Another Unknown' },
      });

      const preferences = {
        cabinClass: CabinClass.ECONOMY,
        hotelStarRating: 3,
        budgetTier: 'economy' as const,
      };

      const result = await service.searchFlight(gap, preferences);

      expect(result.found).toBe(false);
      expect(result.error).toContain('airport codes');
    });

    it('should handle SerpAPI errors gracefully', async () => {
      const gap = createGap({
        endLocation: { name: 'JFK Airport', code: 'JFK' },
        startLocation: { name: 'LAX Airport', code: 'LAX' },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);

      const preferences = {
        cabinClass: CabinClass.ECONOMY,
        hotelStarRating: 3,
        budgetTier: 'economy' as const,
      };

      const result = await service.searchFlight(gap, preferences);

      expect(result.found).toBe(false);
      expect(result.error).toContain('429');
    });

    it('should handle no flights found', async () => {
      const gap = createGap({
        endLocation: { name: 'JFK Airport', code: 'JFK' },
        startLocation: { name: 'LAX Airport', code: 'LAX' },
      });

      const mockResponse = {
        search_metadata: { status: 'success' },
        best_flights: [],
        other_flights: [],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const preferences = {
        cabinClass: CabinClass.ECONOMY,
        hotelStarRating: 3,
        budgetTier: 'economy' as const,
      };

      const result = await service.searchFlight(gap, preferences);

      expect(result.found).toBe(false);
      expect(result.error).toContain('No flights found');
    });
  });

  describe('searchHotel', () => {
    it('should search for hotels and create hotel segment', async () => {
      const location = {
        name: 'Milan',
        address: { city: 'Milan', country: 'IT' },
      };
      const checkInDate = new Date('2024-01-03');
      const checkOutDate = new Date('2024-01-05');

      const mockResponse = {
        search_metadata: { status: 'success' },
        properties: [
          {
            name: 'Grand Hotel Milan',
            description: 'Luxury hotel in city center',
            gps_coordinates: { latitude: 45.4642, longitude: 9.19 },
            check_in_time: '15:00',
            check_out_time: '11:00',
            rate_per_night: { lowest: '$200', extracted_lowest: 200 },
            overall_rating: 4.5,
            hotel_class: '4',
            link: 'https://example.com/hotel',
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const preferences = {
        cabinClass: CabinClass.BUSINESS,
        hotelStarRating: 4,
        budgetTier: 'premium' as const,
      };

      const result = await service.searchHotel(location, checkInDate, checkOutDate, preferences);

      expect(result.found).toBe(true);
      expect(result.segment).toBeDefined();
      expect(result.segment?.type).toBe(SegmentType.HOTEL);

      const hotelSegment = result.segment as HotelSegment;
      expect(hotelSegment.property.name).toBe('Grand Hotel Milan');
      expect(hotelSegment.checkInTime).toBe('15:00');
      expect(hotelSegment.checkOutTime).toBe('11:00');
      expect(hotelSegment.price?.amount).toBe(400); // 2 nights * 200
      expect(hotelSegment.inferred).toBe(true);
    });

    it('should filter hotels by star rating preference', async () => {
      const location = {
        name: 'Milan',
        address: { city: 'Milan', country: 'IT' },
      };
      const checkInDate = new Date('2024-01-03');
      const checkOutDate = new Date('2024-01-05');

      const mockResponse = {
        search_metadata: { status: 'success' },
        properties: [
          {
            name: 'Budget Hotel',
            hotel_class: '2',
            overall_rating: 3.0,
            rate_per_night: { extracted_lowest: 50 },
          },
          {
            name: 'Premium Hotel',
            hotel_class: '4',
            overall_rating: 4.5,
            rate_per_night: { extracted_lowest: 200 },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const preferences = {
        cabinClass: CabinClass.BUSINESS,
        hotelStarRating: 4,
        budgetTier: 'premium' as const,
      };

      const result = await service.searchHotel(location, checkInDate, checkOutDate, preferences);

      expect(result.found).toBe(true);
      const hotelSegment = result.segment as HotelSegment;
      expect(hotelSegment.property.name).toBe('Premium Hotel'); // Higher rating
    });

    it('should handle no suitable hotels found', async () => {
      const location = {
        name: 'Milan',
        address: { city: 'Milan', country: 'IT' },
      };
      const checkInDate = new Date('2024-01-03');
      const checkOutDate = new Date('2024-01-05');

      const mockResponse = {
        search_metadata: { status: 'success' },
        properties: [],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const preferences = {
        cabinClass: CabinClass.ECONOMY,
        hotelStarRating: 3,
        budgetTier: 'economy' as const,
      };

      const result = await service.searchHotel(location, checkInDate, checkOutDate, preferences);

      expect(result.found).toBe(false);
      expect(result.error).toContain('No suitable hotels found');
    });
  });

  describe('searchTransfer', () => {
    it('should create transfer segment for local gaps', async () => {
      const gap = createGap({
        gapType: GapType.LOCAL_TRANSFER,
        endLocation: { name: 'JFK Airport', code: 'JFK' },
        startLocation: { name: 'Manhattan Hotel' },
      });

      const preferences = {
        cabinClass: CabinClass.ECONOMY,
        hotelStarRating: 3,
        budgetTier: 'economy' as const,
      };

      const result = await service.searchTransfer(gap, preferences);

      expect(result.found).toBe(true);
      expect(result.segment).toBeDefined();
      expect(result.segment?.type).toBe(SegmentType.TRANSFER);
      expect(result.segment?.inferred).toBe(true);
    });

    it('should use PRIVATE transfer for luxury preferences', async () => {
      const gap = createGap({
        gapType: GapType.LOCAL_TRANSFER,
        endLocation: { name: 'JFK Airport', code: 'JFK' },
        startLocation: { name: 'Manhattan Hotel' },
      });

      const preferences = {
        cabinClass: CabinClass.FIRST,
        hotelStarRating: 5,
        budgetTier: 'luxury' as const,
      };

      const result = await service.searchTransfer(gap, preferences);

      expect(result.found).toBe(true);
      const transferSegment = result.segment as any;
      expect(transferSegment.transferType).toBe('PRIVATE');
    });
  });

  describe('fillGapIntelligently', () => {
    it('should search for flight for INTERNATIONAL_GAP', async () => {
      const gap = createGap({
        gapType: GapType.INTERNATIONAL_GAP,
        suggestedType: 'FLIGHT',
        endLocation: { name: 'JFK Airport', code: 'JFK' },
        startLocation: { name: 'MXP Airport', code: 'MXP' },
      });

      const mockResponse = {
        best_flights: [
          {
            flights: [
              {
                departure_airport: { id: 'JFK', name: 'JFK Airport' },
                arrival_airport: { id: 'MXP', name: 'MXP Airport' },
                airline: 'Delta',
                flight_number: 'DL404',
                departure_time: '2024-01-02T18:00:00',
                arrival_time: '2024-01-03T08:00:00',
                duration: 480,
              },
            ],
            price: 650,
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const existingSegments = [createFlightSegment({ cabinClass: CabinClass.ECONOMY })];

      const result = await service.fillGapIntelligently(gap, existingSegments);

      expect(result.found).toBe(true);
      expect(result.segment?.type).toBe(SegmentType.FLIGHT);
    });

    it('should create transfer for LOCAL_TRANSFER gap', async () => {
      const gap = createGap({
        gapType: GapType.LOCAL_TRANSFER,
        suggestedType: 'TRANSFER',
        endLocation: { name: 'Airport', code: 'JFK' },
        startLocation: { name: 'Hotel' },
      });

      const existingSegments = [createFlightSegment({ cabinClass: CabinClass.ECONOMY })];

      const result = await service.fillGapIntelligently(gap, existingSegments);

      expect(result.found).toBe(true);
      expect(result.segment?.type).toBe(SegmentType.TRANSFER);
    });
  });
});

// Helper functions to create test data

function createFlightSegment(overrides: Partial<FlightSegment> = {}): FlightSegment {
  return {
    id: generateSegmentId(),
    type: SegmentType.FLIGHT,
    status: SegmentStatus.CONFIRMED,
    startDatetime: new Date('2024-01-01T10:00:00Z'),
    endDatetime: new Date('2024-01-01T13:00:00Z'),
    travelerIds: [],
    metadata: {},
    airline: { name: 'Test Airline', code: 'TA' },
    flightNumber: 'TA100',
    origin: { name: 'Origin Airport', code: 'ORG' },
    destination: { name: 'Destination Airport', code: 'DST' },
    ...overrides,
  };
}

function createHotelSegment(overrides: { propertyName: string }): HotelSegment {
  return {
    id: generateSegmentId(),
    type: SegmentType.HOTEL,
    status: SegmentStatus.CONFIRMED,
    startDatetime: new Date('2024-01-01T15:00:00Z'),
    endDatetime: new Date('2024-01-03T11:00:00Z'),
    travelerIds: [],
    metadata: {},
    property: { name: overrides.propertyName },
    location: { name: overrides.propertyName },
    checkInDate: new Date('2024-01-01'),
    checkOutDate: new Date('2024-01-03'),
    roomCount: 1,
    amenities: [],
  };
}

function createGap(
  overrides: Partial<LocationGap> & {
    endLocation?: { name: string; code?: string; address?: { country?: string } };
    startLocation?: { name: string; code?: string; address?: { country?: string } };
  },
): LocationGap {
  const beforeSegment = createFlightSegment();
  const afterSegment = createHotelSegment({ propertyName: 'Test Hotel' });

  return {
    beforeIndex: 0,
    afterIndex: 1,
    beforeSegment,
    afterSegment,
    endLocation: overrides.endLocation || null,
    startLocation: overrides.startLocation || null,
    gapType: overrides.gapType || GapType.LOCAL_TRANSFER,
    description: overrides.description || 'Test gap',
    suggestedType: overrides.suggestedType || 'TRANSFER',
  };
}

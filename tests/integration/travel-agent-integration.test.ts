/**
 * Integration tests for Travel Agent Service
 * @module integration/__tests__/travel-agent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TravelAgentService } from '../../src/services/travel-agent.service.js';
import { SegmentContinuityService } from '../../src/services/segment-continuity.service.js';
import type { Segment, FlightSegment, HotelSegment } from '../../src/domain/types/segment.js';
import { CabinClass, SegmentType, SegmentStatus } from '../../src/domain/types/common.js';
import { generateSegmentId } from '../../src/domain/types/branded.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('Travel Agent Integration Tests', () => {
  let travelAgent: TravelAgentService;
  let continuityService: SegmentContinuityService;

  beforeEach(() => {
    travelAgent = new TravelAgentService({ apiKey: 'test-api-key' });
    continuityService = new SegmentContinuityService();
    vi.clearAllMocks();
  });

  describe('End-to-End Gap Filling', () => {
    it('should detect gaps and fill with real flight data from SerpAPI', async () => {
      // Step 1: Create trip with missing flight segment
      const segments: Segment[] = [
        // Business trip to Milan - flying out from JFK
        createFlightSegment({
          airline: { name: 'Delta', code: 'DL' },
          flightNumber: 'DL100',
          origin: { name: 'Philadelphia', code: 'PHL', address: { country: 'US' } },
          destination: { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } },
          startDatetime: new Date('2024-01-01T08:00:00Z'),
          endDatetime: new Date('2024-01-01T09:00:00Z'),
          cabinClass: CabinClass.BUSINESS,
        }),
        // Transfer to hotel in NYC
        createTransferSegment({
          pickupLocation: { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } },
          dropoffLocation: { name: 'Manhattan Hotel', address: { city: 'New York', country: 'US' } },
          startDatetime: new Date('2024-01-01T09:30:00Z'),
          endDatetime: new Date('2024-01-01T10:30:00Z'),
        }),
        // Transfer from hotel to JFK
        createTransferSegment({
          pickupLocation: { name: 'Manhattan Hotel', address: { city: 'New York', country: 'US' } },
          dropoffLocation: { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } },
          startDatetime: new Date('2024-01-02T12:00:00Z'),
          endDatetime: new Date('2024-01-02T13:00:00Z'),
        }),
        // GAP HERE - Missing flight JFK → MXP
        // Transfer from MXP airport to hotel
        createTransferSegment({
          pickupLocation: { name: 'Milan Malpensa Airport', code: 'MXP', address: { city: 'Milan', country: 'IT' } },
          dropoffLocation: { name: 'Grand Hotel Milan', address: { city: 'Milan', country: 'IT' } },
          startDatetime: new Date('2024-01-03T09:00:00Z'),
          endDatetime: new Date('2024-01-03T10:00:00Z'),
        }),
        // Hotel in Milan (after the gap)
        createHotelSegment({
          propertyName: 'Grand Hotel Milan',
          city: 'Milan',
          country: 'IT',
          checkInDate: new Date('2024-01-03'),
          checkOutDate: new Date('2024-01-05'),
          startDatetime: new Date('2024-01-03T15:00:00Z'),
          endDatetime: new Date('2024-01-05T11:00:00Z'),
        }),
      ];

      // Step 2: Detect gaps
      const sortedSegments = continuityService.sortSegments(segments);
      const gaps = continuityService.detectLocationGaps(sortedSegments);

      // Should detect at least one international gap (NYC → Milan)
      expect(gaps.length).toBeGreaterThanOrEqual(1);

      // Find the international gap
      const internationalGap = gaps.find(g => g.gapType === 'INTERNATIONAL_GAP');
      expect(internationalGap).toBeDefined();
      expect(internationalGap?.suggestedType).toBe('FLIGHT');

      // Step 3: Mock SerpAPI response for flight search
      const mockFlightResponse = {
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
                travel_class: 'Business',
              },
            ],
            price: 2500,
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFlightResponse,
      } as Response);

      // Step 4: Fill the international gap intelligently
      if (!internationalGap) throw new Error('No international gap found');

      const result = await travelAgent.fillGapIntelligently(internationalGap, sortedSegments);

      // Step 5: Verify result
      expect(result.found).toBe(true);
      expect(result.segment).toBeDefined();
      expect(result.segment?.type).toBe(SegmentType.FLIGHT);
      expect(result.segment?.inferred).toBe(true);

      const flightSegment = result.segment as FlightSegment;
      expect(flightSegment.airline.name).toBe('Delta Air Lines');
      expect(flightSegment.flightNumber).toBe('DL404');
      expect(flightSegment.origin.code).toBe('JFK');
      expect(flightSegment.destination.code).toBe('MXP');
      expect(flightSegment.cabinClass).toBe(CabinClass.BUSINESS); // Inferred from existing flights
      expect(flightSegment.price?.amount).toBe(2500);
      expect(flightSegment.metadata?.source).toBe('serpapi-google-flights');
    });

    it('should infer business class preference and search accordingly', async () => {
      // Trip with all business class flights
      const segments: Segment[] = [
        createFlightSegment({
          cabinClass: CabinClass.BUSINESS,
          origin: { name: 'NYC', code: 'JFK' },
          destination: { name: 'LAX', code: 'LAX' },
          startDatetime: new Date('2024-01-01T08:00:00Z'),
          endDatetime: new Date('2024-01-01T11:00:00Z'),
        }),
        createFlightSegment({
          cabinClass: CabinClass.BUSINESS,
          origin: { name: 'LAX', code: 'LAX' },
          destination: { name: 'SFO', code: 'SFO' },
          startDatetime: new Date('2024-01-02T10:00:00Z'),
          endDatetime: new Date('2024-01-02T11:30:00Z'),
        }),
      ];

      // Infer preferences
      const preferences = travelAgent.inferPreferences(segments);

      expect(preferences.cabinClass).toBe(CabinClass.BUSINESS);
      expect(preferences.budgetTier).toBe('luxury');
    });

    it('should handle complete trip with multiple gaps', async () => {
      // Complex trip: Philadelphia → NYC → Milan → Rome → Home
      const segments: Segment[] = [
        // Segment 1: PHL → JFK flight
        createFlightSegment({
          origin: { name: 'Philadelphia', code: 'PHL', address: { country: 'US' } },
          destination: { name: 'JFK Airport', code: 'JFK', address: { city: 'New York', country: 'US' } },
          startDatetime: new Date('2024-01-01T08:00:00Z'),
          endDatetime: new Date('2024-01-01T09:00:00Z'),
        }),
        // GAP 1: JFK → Manhattan Hotel (local transfer)
        // Segment 2: NYC hotel
        createHotelSegment({
          propertyName: 'Manhattan Hotel',
          city: 'New York',
          country: 'US',
          checkInDate: new Date('2024-01-01'),
          checkOutDate: new Date('2024-01-02'),
          startDatetime: new Date('2024-01-01T15:00:00Z'),
          endDatetime: new Date('2024-01-02T11:00:00Z'),
        }),
        // GAP 2: NYC → Milan (international flight)
        // Segment 3: Milan hotel
        createHotelSegment({
          propertyName: 'Milan Hotel',
          city: 'Milan',
          country: 'IT',
          checkInDate: new Date('2024-01-03'),
          checkOutDate: new Date('2024-01-05'),
          startDatetime: new Date('2024-01-03T15:00:00Z'),
          endDatetime: new Date('2024-01-05T11:00:00Z'),
        }),
        // GAP 3: Milan → Rome (domestic flight or train)
        // Segment 4: Rome hotel
        createHotelSegment({
          propertyName: 'Rome Hotel',
          city: 'Rome',
          country: 'IT',
          checkInDate: new Date('2024-01-06'),
          checkOutDate: new Date('2024-01-08'),
          startDatetime: new Date('2024-01-06T15:00:00Z'),
          endDatetime: new Date('2024-01-08T11:00:00Z'),
        }),
      ];

      // Detect all gaps
      const sortedSegments = continuityService.sortSegments(segments);
      const gaps = continuityService.detectLocationGaps(sortedSegments);

      expect(gaps.length).toBeGreaterThanOrEqual(2); // At least local transfer and international flight

      // Categorize gaps
      const localTransfers = gaps.filter(g => g.gapType === 'LOCAL_TRANSFER');
      const internationalFlights = gaps.filter(g => g.gapType === 'INTERNATIONAL_GAP');
      const domesticFlights = gaps.filter(g => g.gapType === 'DOMESTIC_GAP');

      console.log('Gap Summary:');
      console.log(`  Local Transfers: ${localTransfers.length}`);
      console.log(`  International Flights: ${internationalFlights.length}`);
      console.log(`  Domestic Flights: ${domesticFlights.length}`);

      expect(localTransfers.length).toBeGreaterThan(0);
      expect(internationalFlights.length).toBeGreaterThan(0);
    });
  });

  describe('Preference Inference Accuracy', () => {
    it('should correctly infer luxury tier from first class and 5-star hotels', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.FIRST }),
        createHotelSegment({ propertyName: 'Ritz Carlton New York', city: 'New York', country: 'US' }),
      ];

      const prefs = travelAgent.inferPreferences(segments);

      expect(prefs.cabinClass).toBe(CabinClass.FIRST);
      expect(prefs.hotelStarRating).toBe(5);
      expect(prefs.budgetTier).toBe('luxury');
    });

    it('should correctly infer economy tier from economy class and budget hotels', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.ECONOMY }),
        createHotelSegment({ propertyName: 'Budget Inn', city: 'Cleveland', country: 'US' }),
      ];

      const prefs = travelAgent.inferPreferences(segments);

      expect(prefs.cabinClass).toBe(CabinClass.ECONOMY);
      expect(prefs.hotelStarRating).toBe(3);
      expect(prefs.budgetTier).toBe('economy');
    });

    it('should handle mixed preferences and choose most common', () => {
      const segments: Segment[] = [
        createFlightSegment({ cabinClass: CabinClass.ECONOMY }),
        createFlightSegment({ cabinClass: CabinClass.BUSINESS }),
        createFlightSegment({ cabinClass: CabinClass.BUSINESS }),
      ];

      const prefs = travelAgent.inferPreferences(segments);

      expect(prefs.cabinClass).toBe(CabinClass.BUSINESS); // Most common
    });
  });
});

// Helper functions

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

function createHotelSegment(config: {
  propertyName: string;
  city?: string;
  country?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  startDatetime?: Date;
  endDatetime?: Date;
}): HotelSegment {
  const checkInDate = config.checkInDate || new Date('2024-01-01');
  const checkOutDate = config.checkOutDate || new Date('2024-01-03');

  return {
    id: generateSegmentId(),
    type: SegmentType.HOTEL,
    status: SegmentStatus.CONFIRMED,
    startDatetime: config.startDatetime || new Date('2024-01-01T15:00:00Z'),
    endDatetime: config.endDatetime || new Date('2024-01-03T11:00:00Z'),
    travelerIds: [],
    metadata: {},
    property: { name: config.propertyName },
    location: {
      name: config.propertyName,
      address: config.city && config.country ? { city: config.city, country: config.country } : undefined,
    },
    checkInDate,
    checkOutDate,
    roomCount: 1,
    amenities: [],
  };
}

function createTransferSegment(config: {
  pickupLocation: any;
  dropoffLocation: any;
  startDatetime?: Date;
  endDatetime?: Date;
}): Segment {
  return {
    id: generateSegmentId(),
    type: SegmentType.TRANSFER,
    status: SegmentStatus.CONFIRMED,
    startDatetime: config.startDatetime || new Date('2024-01-01T13:00:00Z'),
    endDatetime: config.endDatetime || new Date('2024-01-01T14:00:00Z'),
    travelerIds: [],
    metadata: {},
    transferType: 'TAXI',
    pickupLocation: config.pickupLocation,
    dropoffLocation: config.dropoffLocation,
  };
}

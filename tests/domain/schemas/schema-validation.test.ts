/**
 * Schema validation tests
 * @module domain/schemas/__tests__/schema-validation
 */

import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  addressSchema,
  currencyCodeSchema,
  dateSchema,
  flightSegmentSchema,
  hotelSegmentSchema,
  itineraryCreateSchema,
  locationSchema,
  moneyInputSchema,
  moneySchema,
  segmentSchema,
  travelerSchema,
} from '../../../src/domain/schemas/index.js';

describe('Common Schemas', () => {
  describe('dateSchema', () => {
    it('should parse ISO date string', () => {
      const result = dateSchema.parse('2025-12-25T10:00:00Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse Date object', () => {
      const date = new Date();
      const result = dateSchema.parse(date);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('currencyCodeSchema', () => {
    it('should accept valid 3-letter code', () => {
      const result = currencyCodeSchema.parse('USD');
      expect(result).toBe('USD');
    });

    it('should uppercase currency code', () => {
      const result = currencyCodeSchema.parse('usd');
      expect(result).toBe('USD');
    });

    it('should reject invalid length', () => {
      expect(() => currencyCodeSchema.parse('US')).toThrow(ZodError);
    });
  });
});

describe('Location Schemas', () => {
  describe('locationSchema', () => {
    it('should validate a complete location', () => {
      const result = locationSchema.parse({
        name: 'San Francisco International Airport',
        code: 'SFO',
        address: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      });

      expect(result.name).toBe('San Francisco International Airport');
      expect(result.code).toBe('SFO');
      expect(result.address?.country).toBe('US');
    });

    it('should uppercase IATA code', () => {
      const result = locationSchema.parse({
        name: 'Airport',
        code: 'sfo',
      });
      expect(result.code).toBe('SFO');
    });

    it('should reject invalid IATA code length', () => {
      expect(() =>
        locationSchema.parse({
          name: 'Airport',
          code: 'INVALID',
        })
      ).toThrow(ZodError);
    });
  });

  describe('addressSchema', () => {
    it('should uppercase country code', () => {
      const result = addressSchema.parse({ country: 'us' });
      expect(result.country).toBe('US');
    });

    it('should reject invalid country code length', () => {
      expect(() => addressSchema.parse({ country: 'USA' })).toThrow(ZodError);
    });
  });
});

describe('Money Schemas', () => {
  describe('moneySchema', () => {
    it('should validate money in cents', () => {
      const result = moneySchema.parse({
        amount: 1050,
        currency: 'USD',
      });
      expect(result.amount).toBe(1050);
      expect(result.currency).toBe('USD');
    });

    it('should reject negative amounts', () => {
      expect(() =>
        moneySchema.parse({
          amount: -100,
          currency: 'USD',
        })
      ).toThrow(ZodError);
    });
  });

  describe('moneyInputSchema', () => {
    it('should convert decimal to cents', () => {
      const result = moneyInputSchema.parse({
        amount: 10.5,
        currency: 'USD',
      });
      expect(result.amount).toBe(1050);
    });

    it('should round to nearest cent', () => {
      const result = moneyInputSchema.parse({
        amount: 10.506,
        currency: 'USD',
      });
      expect(result.amount).toBe(1051);
    });
  });
});

describe('Traveler Schema', () => {
  it('should validate a complete traveler', () => {
    const result = travelerSchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'ADULT',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      dateOfBirth: '1990-01-01',
      loyaltyPrograms: [
        {
          carrier: 'UA',
          number: '123456789',
          tier: 'Gold',
        },
      ],
      specialRequests: ['Vegetarian meal'],
      metadata: {},
    });

    expect(result.firstName).toBe('John');
    expect(result.email).toBe('john.doe@example.com');
    expect(result.loyaltyPrograms).toHaveLength(1);
  });

  it('should reject invalid email', () => {
    expect(() =>
      travelerSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'ADULT',
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
      })
    ).toThrow(ZodError);
  });
});

describe('Segment Schemas', () => {
  const baseFields = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'CONFIRMED' as const,
    startDatetime: '2025-12-25T08:00:00Z',
    endDatetime: '2025-12-25T12:00:00Z',
    travelerIds: ['550e8400-e29b-41d4-a716-446655440001'],
  };

  describe('flightSegmentSchema', () => {
    it('should validate a flight segment', () => {
      const result = flightSegmentSchema.parse({
        ...baseFields,
        type: 'FLIGHT',
        airline: { name: 'United Airlines', code: 'UA' },
        flightNumber: 'UA123',
        origin: { name: 'SFO', code: 'SFO' },
        destination: { name: 'LAX', code: 'LAX' },
      });

      expect(result.type).toBe('FLIGHT');
      expect(result.flightNumber).toBe('UA123');
    });

    it('should reject invalid flight number format', () => {
      expect(() =>
        flightSegmentSchema.parse({
          ...baseFields,
          type: 'FLIGHT',
          airline: { name: 'United Airlines', code: 'UA' },
          flightNumber: 'INVALID',
          origin: { name: 'SFO', code: 'SFO' },
          destination: { name: 'LAX', code: 'LAX' },
        })
      ).toThrow(ZodError);
    });
  });

  describe('hotelSegmentSchema', () => {
    it('should validate a hotel segment', () => {
      const result = hotelSegmentSchema.parse({
        ...baseFields,
        type: 'HOTEL',
        property: { name: 'Hilton', code: 'HIL' },
        location: { name: 'Downtown Hotel' },
        checkInDate: '2025-12-25',
        checkOutDate: '2025-12-27',
      });

      expect(result.type).toBe('HOTEL');
      expect(result.checkInTime).toBe('15:00'); // Default value
      expect(result.roomCount).toBe(1); // Default value
    });

    it('should reject check-out before check-in', () => {
      expect(() =>
        hotelSegmentSchema.parse({
          ...baseFields,
          type: 'HOTEL',
          property: { name: 'Hilton' },
          location: { name: 'Downtown Hotel' },
          checkInDate: '2025-12-27',
          checkOutDate: '2025-12-25',
        })
      ).toThrow(ZodError);
    });
  });

  describe('segmentSchema (discriminated union)', () => {
    it('should parse flight segment', () => {
      const result = segmentSchema.parse({
        ...baseFields,
        type: 'FLIGHT',
        airline: { name: 'United Airlines', code: 'UA' },
        flightNumber: 'UA123',
        origin: { name: 'SFO', code: 'SFO' },
        destination: { name: 'LAX', code: 'LAX' },
      });

      expect(result.type).toBe('FLIGHT');
    });

    it('should parse hotel segment', () => {
      const result = segmentSchema.parse({
        ...baseFields,
        type: 'HOTEL',
        property: { name: 'Hilton' },
        location: { name: 'Downtown Hotel' },
        checkInDate: '2025-12-25',
        checkOutDate: '2025-12-27',
      });

      expect(result.type).toBe('HOTEL');
    });

    it('should reject invalid segment type', () => {
      expect(() =>
        segmentSchema.parse({
          ...baseFields,
          type: 'INVALID_TYPE',
        })
      ).toThrow(ZodError);
    });

    it('should reject end datetime before start datetime', () => {
      expect(() =>
        segmentSchema.parse({
          ...baseFields,
          startDatetime: '2025-12-25T12:00:00Z',
          endDatetime: '2025-12-25T08:00:00Z',
          type: 'FLIGHT',
          airline: { name: 'United Airlines' },
          flightNumber: 'UA123',
          origin: { name: 'SFO' },
          destination: { name: 'LAX' },
        })
      ).toThrow(ZodError);
    });
  });
});

describe('Itinerary Schema', () => {
  describe('itineraryCreateSchema', () => {
    it('should validate a new itinerary', () => {
      const result = itineraryCreateSchema.parse({
        title: 'Trip to Europe',
        description: 'Summer vacation',
        startDate: '2025-06-01',
        endDate: '2025-06-15',
        tripType: 'LEISURE',
        tags: ['vacation', 'europe'],
      });

      expect(result.title).toBe('Trip to Europe');
      expect(result.tags).toEqual(['vacation', 'europe']);
    });

    it('should reject end date before start date', () => {
      expect(() =>
        itineraryCreateSchema.parse({
          title: 'Trip',
          startDate: '2025-06-15',
          endDate: '2025-06-01',
        })
      ).toThrow(ZodError);
    });

    it('should accept same start and end date', () => {
      const result = itineraryCreateSchema.parse({
        title: 'Day Trip',
        startDate: '2025-06-01',
        endDate: '2025-06-01',
      });

      expect(result.title).toBe('Day Trip');
    });
  });
});

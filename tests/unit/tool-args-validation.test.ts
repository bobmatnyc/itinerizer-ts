/**
 * Tool argument validation tests
 * @module tests/unit/tool-args-validation
 */

import { describe, it, expect } from 'vitest';
import {
  addFlightArgsSchema,
  addHotelArgsSchema,
  addActivityArgsSchema,
  updateItineraryArgsSchema,
  searchWebArgsSchema,
  getDistanceArgsSchema,
} from '../../src/domain/schemas/index.js';

describe('Tool Argument Validation', () => {
  describe('addFlightArgsSchema', () => {
    it('should validate valid flight arguments', () => {
      const validArgs = {
        airline: { name: 'United Airlines', code: 'UA' },
        flightNumber: 'UA123',
        origin: { name: 'San Francisco International Airport', code: 'SFO' },
        destination: { name: 'John F. Kennedy International Airport', code: 'JFK' },
        departureTime: '2025-01-15T10:00:00Z',
        arrivalTime: '2025-01-15T18:30:00Z',
      };

      const result = addFlightArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidArgs = {
        airline: { name: 'United Airlines', code: 'UA' },
        // Missing flightNumber, origin, destination, times
      };

      const result = addFlightArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject invalid price format', () => {
      const invalidArgs = {
        airline: { name: 'United Airlines', code: 'UA' },
        flightNumber: 'UA123',
        origin: { name: 'San Francisco International Airport', code: 'SFO' },
        destination: { name: 'John F. Kennedy International Airport', code: 'JFK' },
        departureTime: '2025-01-15T10:00:00Z',
        arrivalTime: '2025-01-15T18:30:00Z',
        price: { amount: 'not a number', currency: 'USD' },
      };

      const result = addFlightArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const validArgs = {
        airline: { name: 'United Airlines', code: 'UA' },
        flightNumber: 'UA123',
        origin: { name: 'San Francisco International Airport', code: 'SFO' },
        destination: { name: 'John F. Kennedy International Airport', code: 'JFK' },
        departureTime: '2025-01-15T10:00:00Z',
        arrivalTime: '2025-01-15T18:30:00Z',
        cabinClass: 'BUSINESS',
        price: { amount: 450.50, currency: 'USD' },
        confirmationNumber: 'ABC123',
        notes: 'Window seat preferred',
      };

      const result = addFlightArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });
  });

  describe('addHotelArgsSchema', () => {
    it('should validate valid hotel arguments', () => {
      const validArgs = {
        property: { name: 'Marriott Hotel' },
        location: { name: '123 Main St, New York, NY' },
        checkInDate: '2025-01-15',
        checkOutDate: '2025-01-17',
      };

      const result = addHotelArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidArgs = {
        property: { name: 'Marriott Hotel' },
        location: { name: '123 Main St' },
        checkInDate: '01/15/2025', // Wrong format
        checkOutDate: '2025-01-17',
      };

      const result = addHotelArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should validate check-in/out time format', () => {
      const validArgs = {
        property: { name: 'Marriott Hotel' },
        location: { name: '123 Main St' },
        checkInDate: '2025-01-15',
        checkOutDate: '2025-01-17',
        checkInTime: '15:00',
        checkOutTime: '11:00',
      };

      const result = addHotelArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });

    it('should reject invalid time format', () => {
      const invalidArgs = {
        property: { name: 'Marriott Hotel' },
        location: { name: '123 Main St' },
        checkInDate: '2025-01-15',
        checkOutDate: '2025-01-17',
        checkInTime: '3pm', // Invalid format
      };

      const result = addHotelArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });
  });

  describe('addActivityArgsSchema', () => {
    it('should validate valid activity arguments', () => {
      const validArgs = {
        name: 'Eiffel Tower Tour',
        location: { name: 'Eiffel Tower, Paris' },
        startTime: '2025-01-15T14:00:00Z',
      };

      const result = addActivityArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });

    it('should accept either endTime or durationHours', () => {
      const withEndTime = {
        name: 'Museum Visit',
        location: { name: 'Louvre Museum' },
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T14:00:00Z',
      };

      const withDuration = {
        name: 'Museum Visit',
        location: { name: 'Louvre Museum' },
        startTime: '2025-01-15T10:00:00Z',
        durationHours: 4,
      };

      expect(addActivityArgsSchema.safeParse(withEndTime).success).toBe(true);
      expect(addActivityArgsSchema.safeParse(withDuration).success).toBe(true);
    });

    it('should reject negative duration', () => {
      const invalidArgs = {
        name: 'Museum Visit',
        location: { name: 'Louvre Museum' },
        startTime: '2025-01-15T10:00:00Z',
        durationHours: -1,
      };

      const result = addActivityArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });
  });

  describe('updateItineraryArgsSchema', () => {
    it('should accept partial updates', () => {
      const titleOnly = { title: 'New Trip Title' };
      const datesOnly = { startDate: '2025-01-15', endDate: '2025-01-20' };
      const all = {
        title: 'Complete Trip',
        description: 'A wonderful journey',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
        destinations: ['Paris', 'London'],
      };

      expect(updateItineraryArgsSchema.safeParse(titleOnly).success).toBe(true);
      expect(updateItineraryArgsSchema.safeParse(datesOnly).success).toBe(true);
      expect(updateItineraryArgsSchema.safeParse(all).success).toBe(true);
    });

    it('should accept empty object (no updates)', () => {
      const result = updateItineraryArgsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('searchWebArgsSchema', () => {
    it('should validate valid search query', () => {
      const validArgs = { query: 'weather in Paris January' };
      const result = searchWebArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const invalidArgs = { query: '' };
      const result = searchWebArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject missing query', () => {
      const invalidArgs = {};
      const result = searchWebArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });
  });

  describe('getDistanceArgsSchema', () => {
    it('should validate valid locations', () => {
      const validArgs = {
        from: 'Paris',
        to: 'London',
      };
      const result = getDistanceArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });

    it('should reject empty locations', () => {
      const invalidArgs = { from: '', to: 'London' };
      const result = getDistanceArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });
  });

  describe('Security - Type Coercion', () => {
    it('should normalize airport codes to uppercase', () => {
      const args = {
        airline: { name: 'United', code: 'ua' },
        flightNumber: 'UA123',
        origin: { name: 'San Francisco', code: 'sfo' },
        destination: { name: 'New York', code: 'jfk' },
        departureTime: '2025-01-15T10:00:00Z',
        arrivalTime: '2025-01-15T18:30:00Z',
      };

      const result = addFlightArgsSchema.safeParse(args);
      if (result.success) {
        expect(result.data.airline.code).toBe('UA');
        expect(result.data.origin.code).toBe('SFO');
        expect(result.data.destination.code).toBe('JFK');
      }
    });

    it('should convert price amounts to cents', () => {
      const args = {
        property: { name: 'Hotel' },
        location: { name: 'Location' },
        checkInDate: '2025-01-15',
        checkOutDate: '2025-01-17',
        price: { amount: 150.75, currency: 'USD' },
      };

      const result = addHotelArgsSchema.safeParse(args);
      if (result.success) {
        // moneyInputSchema transforms to cents
        expect(result.data.price?.amount).toBe(15075);
      }
    });
  });
});

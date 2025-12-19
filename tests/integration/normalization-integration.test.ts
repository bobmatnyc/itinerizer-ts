/**
 * Integration test demonstrating schema normalization with real import scenarios
 * @module tests/integration/normalization-integration
 */

import { describe, it, expect } from 'vitest';
import { itinerarySchema } from '../../src/domain/schemas/itinerary.schema.js';
import { normalizeImportData } from '../../src/services/schema-normalizer.service.js';

describe('Schema Normalization Integration', () => {
  it('should successfully validate LLM output with common variations', () => {
    // Simulate LLM output with common variations that would normally fail validation
    const llmOutput = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'European Business Trip',
      startDate: '2024-03-01', // Date-only string
      endDate: '2024-03-05', // Date-only string
      status: 'CONFIRMED',
      tripType: 'BUSINESS',
      createdAt: '2024-03-01T00:00:00Z',
      updatedAt: '2024-03-01T00:00:00Z',
      segments: [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          type: 'FLIGHT',
          status: 'CONFIRMED',
          source: 'import',
          startDatetime: '2024-03-01T08:00:00', // Missing timezone
          endDatetime: '2024-03-01T11:00:00', // Missing timezone
          travelerIds: [],
          airline: {
            name: 'Air France',
            code: 'AF',
          },
          flightNumber: 'AF123',
          origin: {
            name: 'Paris Charles de Gaulle',
            code: 'PARIS', // ← Too long! Should be PAR
            address: { country: 'FR' },
          },
          destination: {
            name: 'London Heathrow',
            code: 'LHR',
            address: { country: 'GB' },
          },
          metadata: {},
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          type: 'TRANSFER',
          status: 'CONFIRMED',
          source: 'import',
          startDatetime: '2024-03-01T11:30:00', // Missing timezone
          endDatetime: '2024-03-01T12:30:00', // Missing timezone
          travelerIds: [],
          transferType: 'TRAIN', // ← Not in original enum! Should map to RAIL
          pickupLocation: {
            name: 'Heathrow Airport',
            code: 'LHR',
            address: { country: 'GB' },
          },
          dropoffLocation: {
            name: 'London Paddington',
            code: 'PAD',
            address: { country: 'GB' },
          },
          metadata: {},
        },
        {
          id: '423e4567-e89b-12d3-a456-426614174003',
          type: 'HOTEL',
          status: 'CONFIRMED',
          source: 'import',
          startDatetime: '2024-03-01T15:00:00',
          endDatetime: '2024-03-05T11:00:00',
          travelerIds: [],
          property: {
            name: 'The Ritz London',
            code: 'RITZ',
          },
          location: {
            name: 'The Ritz London',
            code: 'RITZHOTEL', // ← Too long! Should be RIT
            address: {
              street: '150 Piccadilly',
              city: 'London',
              country: 'GB',
            },
          },
          checkInDate: '2024-03-01', // Date-only
          checkOutDate: '2024-03-05', // Date-only
          roomCount: 1,
          amenities: [],
          metadata: {},
        },
        {
          id: '523e4567-e89b-12d3-a456-426614174004',
          type: 'TRANSFER',
          status: 'TENTATIVE',
          source: 'import',
          startDatetime: '2024-03-02T09:00:00',
          endDatetime: '2024-03-02T09:15:00',
          travelerIds: [],
          transferType: 'WALKING', // ← New type!
          pickupLocation: {
            name: 'The Ritz London',
            address: { country: 'GB' },
          },
          dropoffLocation: {
            name: 'Client Office',
            code: 'NYC', // ← Inconsistent naming but valid length
            address: { country: 'GB' },
          },
          metadata: {},
        },
      ],
      travelers: [],
      metadata: {},
    };

    // WITHOUT normalization, this would fail validation
    const directValidation = itinerarySchema.safeParse(llmOutput);
    expect(directValidation.success).toBe(false);

    if (!directValidation.success) {
      const errors = directValidation.error.errors;
      // Verify we get the expected errors
      expect(errors.some((e) => e.path.join('.').includes('origin.code'))).toBe(true); // PARIS too long
      expect(errors.some((e) => e.path.join('.').includes('location.code'))).toBe(true); // RITZHOTEL too long
    }

    // WITH normalization, validation should succeed
    const normalized = normalizeImportData(llmOutput);
    const validationResult = itinerarySchema.safeParse(normalized);

    if (!validationResult.success) {
      console.error('\n[TEST DEBUG] Validation errors after normalization:');
      validationResult.error.errors.slice(0, 10).forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }

    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const itinerary = validationResult.data;

      // Verify normalizations were applied correctly
      const flight = itinerary.segments[0];
      expect(flight.type).toBe('FLIGHT');
      if (flight.type === 'FLIGHT') {
        expect(flight.origin.code).toBe('PAR'); // Truncated from PARIS
        expect(flight.destination.code).toBe('LHR');
      }

      const railTransfer = itinerary.segments[1];
      expect(railTransfer.type).toBe('TRANSFER');
      if (railTransfer.type === 'TRANSFER') {
        expect(railTransfer.transferType).toBe('RAIL'); // Mapped from TRAIN
      }

      const hotel = itinerary.segments[2];
      expect(hotel.type).toBe('HOTEL');
      if (hotel.type === 'HOTEL') {
        expect(hotel.location.code).toBe('RIT'); // Truncated from RITZHOTEL
        expect(hotel.checkInDate.toISOString()).toBe('2024-03-01T00:00:00.000Z'); // Date-only normalized
      }

      const walkingTransfer = itinerary.segments[3];
      expect(walkingTransfer.type).toBe('TRANSFER');
      if (walkingTransfer.type === 'TRANSFER') {
        expect(walkingTransfer.transferType).toBe('WALKING'); // New type supported
      }

      // Verify dates were normalized
      expect(itinerary.startDate.toISOString()).toBe('2024-03-01T00:00:00.000Z');
      expect(itinerary.endDate.toISOString()).toBe('2024-03-05T00:00:00.000Z');
    }
  });

  it('should handle ferry transfers', () => {
    const llmOutput = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Cross-Channel Trip',
      startDate: '2024-04-01T00:00:00Z',
      endDate: '2024-04-02T00:00:00Z',
      status: 'PLANNED',
      tripType: 'LEISURE',
      createdAt: '2024-04-01T00:00:00Z',
      updatedAt: '2024-04-01T00:00:00Z',
      segments: [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          type: 'TRANSFER',
          status: 'CONFIRMED',
          source: 'import',
          startDatetime: '2024-04-01T10:00:00',
          endDatetime: '2024-04-01T12:00:00',
          travelerIds: [],
          transferType: 'FERRY', // ← New type!
          pickupLocation: {
            name: 'Dover Port',
            address: { country: 'GB' },
          },
          dropoffLocation: {
            name: 'Calais Port',
            address: { country: 'FR' },
          },
          metadata: {},
        },
      ],
      travelers: [],
      metadata: {},
    };

    const normalized = normalizeImportData(llmOutput);
    const validationResult = itinerarySchema.safeParse(normalized);

    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const ferry = validationResult.data.segments[0];
      expect(ferry.type).toBe('TRANSFER');
      if (ferry.type === 'TRANSFER') {
        expect(ferry.transferType).toBe('FERRY');
      }
    }
  });

  it('should map unknown transfer types to OTHER', () => {
    const llmOutput = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Exotic Transport',
      startDate: '2024-05-01T00:00:00Z',
      endDate: '2024-05-02T00:00:00Z',
      status: 'PLANNED',
      tripType: 'LEISURE',
      createdAt: '2024-05-01T00:00:00Z',
      updatedAt: '2024-05-01T00:00:00Z',
      segments: [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          type: 'TRANSFER',
          status: 'TENTATIVE',
          source: 'import',
          startDatetime: '2024-05-01T10:00:00Z',
          endDatetime: '2024-05-01T10:30:00Z',
          travelerIds: [],
          transferType: 'HELICOPTER', // ← Unknown type!
          pickupLocation: {
            name: 'Hotel',
            address: { country: 'US' },
          },
          dropoffLocation: {
            name: 'Airport',
            address: { country: 'US' },
          },
          metadata: {},
        },
      ],
      travelers: [],
      metadata: {},
    };

    const normalized = normalizeImportData(llmOutput);
    const validationResult = itinerarySchema.safeParse(normalized);

    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const transfer = validationResult.data.segments[0];
      expect(transfer.type).toBe('TRANSFER');
      if (transfer.type === 'TRANSFER') {
        expect(transfer.transferType).toBe('OTHER'); // Mapped from unknown HELICOPTER
      }
    }
  });
});

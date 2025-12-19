/**
 * Schema normalizer service tests
 * @module tests/services/schema-normalizer
 */

import { describe, it, expect } from 'vitest';
import { normalizeImportData } from '../../src/services/schema-normalizer.service.js';

describe('Schema Normalizer Service', () => {
  describe('Location code normalization', () => {
    it('should truncate codes longer than 3 characters', () => {
      const input = {
        segments: [
          {
            type: 'FLIGHT',
            origin: { name: 'Paris', code: 'PARIS' },
            destination: { name: 'London', code: 'LONDON' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T12:00:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].origin.code).toBe('PAR');
      expect(result.segments[0].destination.code).toBe('LON');
    });

    it('should pad codes shorter than 3 characters', () => {
      const input = {
        segments: [
          {
            type: 'FLIGHT',
            origin: { name: 'New York', code: 'NY' },
            destination: { name: 'Los Angeles', code: 'LA' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T12:00:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].origin.code).toBe('NYX');
      expect(result.segments[0].destination.code).toBe('LAX');
    });

    it('should make codes uppercase', () => {
      const input = {
        segments: [
          {
            type: 'FLIGHT',
            origin: { name: 'Seattle', code: 'sea' },
            destination: { name: 'Portland', code: 'pdx' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T12:00:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].origin.code).toBe('SEA');
      expect(result.segments[0].destination.code).toBe('PDX');
    });

    it('should handle missing codes gracefully', () => {
      const input = {
        segments: [
          {
            type: 'FLIGHT',
            origin: { name: 'Paris' },
            destination: { name: 'London', code: '' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T12:00:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].origin.code).toBeUndefined();
      expect(result.segments[0].destination.code).toBeUndefined();
    });
  });

  describe('Transfer type normalization', () => {
    it('should map RAIL to RAIL', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'RAIL',
            pickupLocation: { name: 'Paris Gare du Nord' },
            dropoffLocation: { name: 'London St Pancras' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T12:00:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].transferType).toBe('RAIL');
    });

    it('should map TRAIN to RAIL', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'TRAIN',
            pickupLocation: { name: 'Central Station' },
            dropoffLocation: { name: 'Airport' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T12:00:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].transferType).toBe('RAIL');
    });

    it('should map FERRY to FERRY', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'FERRY',
            pickupLocation: { name: 'Dover' },
            dropoffLocation: { name: 'Calais' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T12:00:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].transferType).toBe('FERRY');
    });

    it('should map WALKING to WALKING', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'WALKING',
            pickupLocation: { name: 'Hotel' },
            dropoffLocation: { name: 'Restaurant' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T10:15:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].transferType).toBe('WALKING');
    });

    it('should map unknown types to OTHER', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'HELICOPTER',
            pickupLocation: { name: 'Downtown' },
            dropoffLocation: { name: 'Airport' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T10:30:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].transferType).toBe('OTHER');
    });

    it('should handle case-insensitive transfer types', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'railway',
            pickupLocation: { name: 'Station A' },
            dropoffLocation: { name: 'Station B' },
            startDatetime: '2024-01-01T10:00:00Z',
            endDatetime: '2024-01-01T11:00:00Z',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].transferType).toBe('RAIL');
    });
  });

  describe('Datetime validation fixes', () => {
    it('should fix segment where endDatetime equals startDatetime', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'TAXI',
            pickupLocation: { name: 'Hotel' },
            dropoffLocation: { name: 'Airport' },
            startDatetime: '2023-01-01T10:00:00.000Z',
            endDatetime: '2023-01-01T10:00:00.000Z', // Equal to start
          },
        ],
      };

      const result = normalizeImportData(input);
      const segment = result.segments[0];

      const start = new Date(segment.startDatetime);
      const end = new Date(segment.endDatetime);

      expect(end.getTime()).toBeGreaterThan(start.getTime());
      expect(end.getTime() - start.getTime()).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('should fix segment where endDatetime is before startDatetime', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'TAXI',
            pickupLocation: { name: 'Hotel' },
            dropoffLocation: { name: 'Airport' },
            startDatetime: '2023-01-01T22:00:00.000Z',
            endDatetime: '2023-01-01T14:45:00.000Z', // Before start
          },
        ],
      };

      const result = normalizeImportData(input);
      const segment = result.segments[0];

      const start = new Date(segment.startDatetime);
      const end = new Date(segment.endDatetime);

      expect(end.getTime()).toBeGreaterThan(start.getTime());
      expect(end.getTime() - start.getTime()).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('should set endDatetime to startDatetime + 30min when missing', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'TAXI',
            pickupLocation: { name: 'Hotel' },
            dropoffLocation: { name: 'Airport' },
            startDatetime: '2023-01-01T10:00:00.000Z',
            // endDatetime missing
          },
        ],
      };

      const result = normalizeImportData(input);
      const segment = result.segments[0];

      const start = new Date(segment.startDatetime);
      const end = new Date(segment.endDatetime);

      expect(end.getTime()).toBeGreaterThan(start.getTime());
      expect(end.getTime() - start.getTime()).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('should not modify valid datetime ranges', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'TAXI',
            pickupLocation: { name: 'Hotel' },
            dropoffLocation: { name: 'Airport' },
            startDatetime: '2023-01-01T10:00:00.000Z',
            endDatetime: '2023-01-01T11:00:00.000Z', // Valid
          },
        ],
      };

      const result = normalizeImportData(input);
      const segment = result.segments[0];

      expect(segment.endDatetime).toBe('2023-01-01T11:00:00.000Z'); // Unchanged
    });

    it('should fix multiple segments with datetime issues', () => {
      const input = {
        segments: [
          {
            type: 'TRANSFER',
            transferType: 'TAXI',
            pickupLocation: { name: 'A' },
            dropoffLocation: { name: 'B' },
            startDatetime: '2023-01-01T10:00:00.000Z',
            endDatetime: '2023-01-01T09:00:00.000Z', // Before
          },
          {
            type: 'FLIGHT',
            airline: { name: 'Test Air' },
            flightNumber: 'TA123',
            origin: { name: 'JFK' },
            destination: { name: 'LAX' },
            startDatetime: '2023-01-01T12:00:00.000Z',
            endDatetime: '2023-01-01T12:00:00.000Z', // Equal
          },
          {
            type: 'HOTEL',
            property: { name: 'Test Hotel' },
            location: { name: 'Downtown' },
            checkInDate: '2023-01-01T14:00:00.000Z',
            checkOutDate: '2023-01-02T10:00:00.000Z',
            startDatetime: '2023-01-01T14:00:00.000Z',
            endDatetime: '2023-01-02T10:00:00.000Z', // Valid
            roomCount: 1,
          },
        ],
      };

      const result = normalizeImportData(input);

      // First segment (before) - should be fixed
      const seg1 = result.segments[0];
      const start1 = new Date(seg1.startDatetime);
      const end1 = new Date(seg1.endDatetime);
      expect(end1.getTime()).toBeGreaterThan(start1.getTime());
      expect(end1.getTime() - start1.getTime()).toBe(30 * 60 * 1000);

      // Second segment (equal) - should be fixed
      const seg2 = result.segments[1];
      const start2 = new Date(seg2.startDatetime);
      const end2 = new Date(seg2.endDatetime);
      expect(end2.getTime()).toBeGreaterThan(start2.getTime());
      expect(end2.getTime() - start2.getTime()).toBe(30 * 60 * 1000);

      // Third segment (valid) - should be unchanged
      const seg3 = result.segments[2];
      expect(seg3.endDatetime).toBe('2023-01-02T10:00:00.000Z');
    });
  });

  describe('Date/time normalization', () => {
    it('should handle date-only strings by appending time', () => {
      const input = {
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        segments: [
          {
            type: 'HOTEL',
            checkInDate: '2024-01-01',
            checkOutDate: '2024-01-05',
            startDatetime: '2024-01-01',
            endDatetime: '2024-01-05',
            location: { name: 'Grand Hotel' },
            property: { name: 'Grand Hotel' },
            roomCount: 1,
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.startDate).toBe('2024-01-01T00:00:00Z');
      expect(result.endDate).toBe('2024-01-05T00:00:00Z');
      expect(result.segments[0].checkInDate).toBe('2024-01-01T00:00:00Z');
      expect(result.segments[0].checkOutDate).toBe('2024-01-05T00:00:00Z');
    });

    it('should handle datetime without timezone by appending Z', () => {
      const input = {
        segments: [
          {
            type: 'MEETING',
            title: 'Client Meeting',
            location: { name: 'Office' },
            startDatetime: '2024-01-01T14:00:00',
            endDatetime: '2024-01-01T16:00:00',
            attendees: [],
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].startDatetime).toBe('2024-01-01T14:00:00Z');
      expect(result.segments[0].endDatetime).toBe('2024-01-01T16:00:00Z');
    });

    it('should preserve datetime with timezone', () => {
      const input = {
        segments: [
          {
            type: 'ACTIVITY',
            name: 'City Tour',
            location: { name: 'Downtown' },
            startDatetime: '2024-01-01T10:00:00+01:00',
            endDatetime: '2024-01-01T12:00:00+01:00',
          },
        ],
      };

      const result = normalizeImportData(input);

      expect(result.segments[0].startDatetime).toBe('2024-01-01T10:00:00+01:00');
      expect(result.segments[0].endDatetime).toBe('2024-01-01T12:00:00+01:00');
    });
  });

  describe('Complex scenarios', () => {
    it('should normalize multiple segment types in one itinerary', () => {
      const input = {
        segments: [
          {
            type: 'FLIGHT',
            origin: { name: 'Paris', code: 'PARIS' },
            destination: { name: 'New York', code: 'NY' },
            startDatetime: '2024-01-01',
            endDatetime: '2024-01-01T08:00:00',
          },
          {
            type: 'TRANSFER',
            transferType: 'TRAIN',
            pickupLocation: { name: 'JFK Airport', code: 'JFK' },
            dropoffLocation: { name: 'Manhattan', code: 'MAN' },
            startDatetime: '2024-01-01T09:00:00',
            endDatetime: '2024-01-01T10:00:00',
          },
          {
            type: 'HOTEL',
            location: { name: 'Grand Hotel', code: 'GRAND' },
            property: { name: 'Grand Hotel' },
            checkInDate: '2024-01-01',
            checkOutDate: '2024-01-05',
            startDatetime: '2024-01-01T15:00:00',
            endDatetime: '2024-01-05T11:00:00',
            roomCount: 1,
          },
        ],
      };

      const result = normalizeImportData(input);

      // Flight locations
      expect(result.segments[0].origin.code).toBe('PAR');
      expect(result.segments[0].destination.code).toBe('NYX');
      expect(result.segments[0].startDatetime).toBe('2024-01-01T00:00:00Z');

      // Transfer
      expect(result.segments[1].transferType).toBe('RAIL');
      expect(result.segments[1].pickupLocation.code).toBe('JFK');
      expect(result.segments[1].dropoffLocation.code).toBe('MAN');

      // Hotel
      expect(result.segments[2].location.code).toBe('GRA');
      expect(result.segments[2].checkInDate).toBe('2024-01-01T00:00:00Z');
    });
  });
});

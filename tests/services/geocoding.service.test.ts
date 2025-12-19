/**
 * Tests for GeocodingService
 * @module tests/services/geocoding
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeocodingService } from '../../src/services/geocoding.service.js';
import type { Location } from '../../src/domain/types/location.js';

describe('GeocodingService', () => {
  let geocodingService: GeocodingService;

  beforeEach(() => {
    geocodingService = new GeocodingService();
    // Clear any mocks
    vi.clearAllMocks();
  });

  describe('buildLocationQuery', () => {
    it('should build query from location name and city', () => {
      const location: Location = {
        name: 'Marriott Times Square',
        address: {
          city: 'New York',
          country: 'US',
        },
      };

      const query = geocodingService.buildLocationQuery(location);
      expect(query).toBe('Marriott Times Square, New York, US');
    });

    it('should build query from location name only', () => {
      const location: Location = {
        name: 'JFK Airport',
      };

      const query = geocodingService.buildLocationQuery(location);
      expect(query).toBe('JFK Airport');
    });

    it('should build query from location with full address', () => {
      const location: Location = {
        name: 'Empire State Building',
        address: {
          city: 'New York',
          state: 'NY',
          country: 'US',
        },
      };

      const query = geocodingService.buildLocationQuery(location);
      expect(query).toBe('Empire State Building, New York, NY, US');
    });

    it('should return empty string for location without name or address', () => {
      const location: Location = {
        name: '',
      };

      const query = geocodingService.buildLocationQuery(location);
      expect(query).toBe('');
    });

    it('should handle location with coordinates already present', () => {
      const location: Location = {
        name: 'Tokyo Tower',
        address: {
          city: 'Tokyo',
          country: 'JP',
        },
        coordinates: {
          latitude: 35.6586,
          longitude: 139.7454,
        },
      };

      const query = geocodingService.buildLocationQuery(location);
      expect(query).toBe('Tokyo Tower, Tokyo, JP');
    });
  });

  describe('geocode', () => {
    it('should return null for empty query', async () => {
      const result = await geocodingService.geocode('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only query', async () => {
      const result = await geocodingService.geocode('   ');
      expect(result).toBeNull();
    });

    // Note: These tests would require mocking fetch or using integration tests
    // For now, we'll skip actual API calls to avoid rate limiting during tests
    it.skip('should geocode a valid location (integration test)', async () => {
      const result = await geocodingService.geocode('JFK Airport, New York');

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(40.6413, 1); // ~40.64N
      expect(result?.longitude).toBeCloseTo(-73.7781, 1); // ~73.78W
      expect(result?.displayName).toContain('John F. Kennedy');
      expect(result?.confidence).toBeGreaterThan(0);
    }, 10000);

    it.skip('should geocode an international location (integration test)', async () => {
      const result = await geocodingService.geocode('Eiffel Tower, Paris, France');

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(48.8584, 1); // ~48.86N
      expect(result?.longitude).toBeCloseTo(2.2945, 1); // ~2.29E
      expect(result?.displayName).toContain('Eiffel');
      expect(result?.confidence).toBeGreaterThan(0);
    }, 10000);

    it.skip('should return null for non-existent location (integration test)', async () => {
      const result = await geocodingService.geocode(
        'Nonexistent Place That Does Not Exist 123456789'
      );

      expect(result).toBeNull();
    }, 10000);
  });

  describe('geocodeBatch', () => {
    it('should handle empty array', async () => {
      const results = await geocodingService.geocodeBatch([]);
      expect(results.size).toBe(0);
    });

    it('should remove duplicates', async () => {
      // Mock the geocode method to avoid actual API calls
      const mockGeocode = vi.spyOn(geocodingService, 'geocode').mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.006,
        displayName: 'New York, NY, USA',
        confidence: 85,
      });

      const results = await geocodingService.geocodeBatch([
        'New York',
        'New York',
        'New York',
      ]);

      expect(results.size).toBe(1);
      expect(mockGeocode).toHaveBeenCalledTimes(1);
      expect(results.get('New York')).not.toBeNull();
    });

    it('should geocode multiple locations', async () => {
      const mockGeocode = vi
        .spyOn(geocodingService, 'geocode')
        .mockImplementation(async (query: string) => {
          if (query === 'New York') {
            return {
              latitude: 40.7128,
              longitude: -74.006,
              displayName: 'New York, NY, USA',
              confidence: 85,
            };
          } else if (query === 'Paris') {
            return {
              latitude: 48.8566,
              longitude: 2.3522,
              displayName: 'Paris, France',
              confidence: 90,
            };
          }
          return null;
        });

      const results = await geocodingService.geocodeBatch(['New York', 'Paris']);

      expect(results.size).toBe(2);
      expect(results.get('New York')?.latitude).toBeCloseTo(40.7128);
      expect(results.get('Paris')?.latitude).toBeCloseTo(48.8566);
      expect(mockGeocode).toHaveBeenCalledTimes(2);
    });

    it('should handle mix of successful and failed geocoding', async () => {
      const mockGeocode = vi
        .spyOn(geocodingService, 'geocode')
        .mockImplementation(async (query: string) => {
          if (query === 'Valid Location') {
            return {
              latitude: 40.0,
              longitude: -74.0,
              displayName: 'Valid Location',
              confidence: 80,
            };
          }
          return null; // Invalid location returns null
        });

      const results = await geocodingService.geocodeBatch([
        'Valid Location',
        'Invalid Location',
      ]);

      expect(results.size).toBe(2);
      expect(results.get('Valid Location')).not.toBeNull();
      expect(results.get('Invalid Location')).toBeNull();
    });
  });

  describe('geocodeLocation', () => {
    it('should geocode a Location object', async () => {
      const mockGeocode = vi.spyOn(geocodingService, 'geocode').mockResolvedValue({
        latitude: 40.6413,
        longitude: -73.7781,
        displayName: 'JFK Airport, New York, NY, USA',
        confidence: 95,
      });

      const location: Location = {
        name: 'JFK Airport',
        code: 'JFK',
        address: {
          city: 'New York',
          state: 'NY',
          country: 'US',
        },
      };

      const result = await geocodingService.geocodeLocation(location);

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(40.6413);
      expect(result?.longitude).toBeCloseTo(-73.7781);
      expect(mockGeocode).toHaveBeenCalledWith('JFK Airport, New York, NY, US');
    });

    it('should return null for location with no queryable data', async () => {
      const location: Location = {
        name: '',
      };

      const result = await geocodingService.geocodeLocation(location);
      expect(result).toBeNull();
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limit between requests', async () => {
      // Mock fetch instead of geocode to test rate limiting logic
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: '40.0',
            lon: '-74.0',
            display_name: 'Test Location',
            importance: 0.8,
            type: 'test',
          },
        ],
      });

      const startTime = Date.now();

      // Make 3 requests
      await geocodingService.geocodeBatch(['Location 1', 'Location 2', 'Location 3']);

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should take at least 2 seconds (3 requests with 1 second between each)
      // We allow some tolerance for execution time
      expect(elapsed).toBeGreaterThanOrEqual(2000);
    }, 10000);
  });
});

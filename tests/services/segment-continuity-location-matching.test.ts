/**
 * Tests for improved location matching in segment continuity service
 */

import { describe, it, expect } from 'vitest';
import { SegmentContinuityService } from '../../src/services/segment-continuity.service.js';
import type { Location } from '../../src/domain/types/location.js';

describe('SegmentContinuityService - Location Matching', () => {
  const service = new SegmentContinuityService();

  describe('isSameLocation', () => {
    it('should match locations with identical airport codes', () => {
      const loc1: Location = {
        name: 'John F. Kennedy International Airport',
        code: 'JFK',
      };
      const loc2: Location = {
        name: 'JFK Airport',
        code: 'JFK',
      };

      // Use type assertion to access private method for testing
      const result = (service as any).isSameLocation(loc1, loc2);
      expect(result).toBe(true);
    });

    it('should NOT match airport vs hotel in same city (different names)', () => {
      const airport: Location = {
        name: 'Athens International Airport',
        code: 'ATH',
        address: {
          city: 'Athens',
          country: 'GR',
        },
      };
      const hotel: Location = {
        name: 'King George Hotel',
        address: {
          city: 'Athens',
          country: 'GR',
        },
      };

      const result = (service as any).isSameLocation(airport, hotel);
      expect(result).toBe(false);
    });

    it('should match same airport when one has code and other does not', () => {
      const airportWithCode: Location = {
        name: 'Athens International Airport',
        code: 'ATH',
      };
      const airportWithoutCode: Location = {
        name: 'Athens International Airport',
      };

      const result = (service as any).isSameLocation(airportWithCode, airportWithoutCode);
      expect(result).toBe(true);
    });

    it('should NOT match different airports even if only one has code', () => {
      const airport1: Location = {
        name: 'Athens International Airport',
        code: 'ATH',
      };
      const airport2: Location = {
        name: 'Heraklion Airport',
      };

      const result = (service as any).isSameLocation(airport1, airport2);
      expect(result).toBe(false);
    });

    it('should match locations with same normalized names', () => {
      const loc1: Location = {
        name: 'Four Seasons Resort',
      };
      const loc2: Location = {
        name: 'FOUR SEASONS RESORT',
      };

      const result = (service as any).isSameLocation(loc1, loc2);
      expect(result).toBe(true);
    });

    it('should match when one name contains the other', () => {
      const loc1: Location = {
        name: 'Four Seasons',
      };
      const loc2: Location = {
        name: 'Four Seasons Resort Oahu',
      };

      const result = (service as any).isSameLocation(loc1, loc2);
      expect(result).toBe(true);
    });

    it('should match locations with similar words (fuzzy matching)', () => {
      const loc1: Location = {
        name: 'King George Hotel',
      };
      const loc2: Location = {
        name: 'George Hotel',
      };

      const result = (service as any).isSameLocation(loc1, loc2);
      expect(result).toBe(true);
    });

    it('should match locations with coordinates within 100 meters', () => {
      const loc1: Location = {
        name: 'Hotel A',
        coordinates: {
          latitude: 37.9753,
          longitude: 23.7348,
        },
      };
      const loc2: Location = {
        name: 'Hotel B',
        coordinates: {
          latitude: 37.9754, // ~11 meters away
          longitude: 23.7349,
        },
      };

      const result = (service as any).isSameLocation(loc1, loc2);
      expect(result).toBe(true);
    });

    it('should NOT match locations with coordinates >100 meters apart', () => {
      const loc1: Location = {
        name: 'Hotel A',
        coordinates: {
          latitude: 37.9753,
          longitude: 23.7348,
        },
      };
      const loc2: Location = {
        name: 'Hotel B',
        coordinates: {
          latitude: 37.9800, // ~500+ meters away
          longitude: 23.7400,
        },
      };

      const result = (service as any).isSameLocation(loc1, loc2);
      expect(result).toBe(false);
    });

    it('should match when one location\'s street address matches another\'s name', () => {
      const hotel: Location = {
        name: 'King George Hotel',
        address: {
          street: '3 Vasileos Georgiou A\' St',
          city: 'Athens',
          country: 'GR',
        },
      };
      const addressLocation: Location = {
        name: '3 Vasileos Georgiou A\' St',
        address: {
          city: 'Athens',
          country: 'GR',
        },
      };

      const result = (service as any).isSameLocation(hotel, addressLocation);
      expect(result).toBe(true);
    });

    it('should NOT match different hotels in same city', () => {
      const loc1: Location = {
        name: 'King George Hotel',
        address: {
          city: 'Athens',
          country: 'GR',
        },
      };
      const loc2: Location = {
        name: 'Grande Bretagne Hotel',
        address: {
          city: 'Athens',
          country: 'GR',
        },
      };

      const result = (service as any).isSameLocation(loc1, loc2);
      expect(result).toBe(false);
    });
  });

  describe('haveSimilarWords', () => {
    it('should match when >70% of words overlap', () => {
      const name1 = 'king george hotel';
      const name2 = 'george hotel';

      const result = (service as any).haveSimilarWords(name1, name2);
      expect(result).toBe(true);
    });

    it('should NOT match when <70% of words overlap', () => {
      const name1 = 'king george luxury hotel';
      const name2 = 'royal palace resort';

      const result = (service as any).haveSimilarWords(name1, name2);
      expect(result).toBe(false);
    });

    it('should ignore stop words in matching', () => {
      const name1 = 'the four seasons resort';
      const name2 = 'four seasons resort';

      const result = (service as any).haveSimilarWords(name1, name2);
      expect(result).toBe(true);
    });
  });

  describe('areWordsSimilar', () => {
    it('should match identical words', () => {
      const result = (service as any).areWordsSimilar('george', 'george');
      expect(result).toBe(true);
    });

    it('should match when one word contains another', () => {
      const result = (service as any).areWordsSimilar('king', 'kings');
      expect(result).toBe(true);
    });

    it('should NOT match george vs georgiou (different words)', () => {
      // These are actually different: "george" vs "georgiou" (edit distance 3)
      const result = (service as any).areWordsSimilar('george', 'georgiou');
      expect(result).toBe(false);
    });

    it('should match words with edit distance <= 2 for long words', () => {
      const result = (service as any).areWordsSimilar('seasons', 'season');
      expect(result).toBe(true);
    });

    it('should NOT match completely different words', () => {
      const result = (service as any).areWordsSimilar('athens', 'rome');
      expect(result).toBe(false);
    });
  });

  describe('areCoordinatesClose', () => {
    it('should return true for coordinates within 100 meters', () => {
      const loc1: Location = {
        name: 'A',
        coordinates: { latitude: 37.9753, longitude: 23.7348 },
      };
      const loc2: Location = {
        name: 'B',
        coordinates: { latitude: 37.9754, longitude: 23.7349 },
      };

      const result = (service as any).areCoordinatesClose(loc1, loc2);
      expect(result).toBe(true);
    });

    it('should return false for coordinates >100 meters apart', () => {
      const loc1: Location = {
        name: 'A',
        coordinates: { latitude: 37.9753, longitude: 23.7348 },
      };
      const loc2: Location = {
        name: 'B',
        coordinates: { latitude: 37.9800, longitude: 23.7400 },
      };

      const result = (service as any).areCoordinatesClose(loc1, loc2);
      expect(result).toBe(false);
    });

    it('should return false when coordinates are missing', () => {
      const loc1: Location = { name: 'A' };
      const loc2: Location = { name: 'B' };

      const result = (service as any).areCoordinatesClose(loc1, loc2);
      expect(result).toBe(false);
    });
  });
});

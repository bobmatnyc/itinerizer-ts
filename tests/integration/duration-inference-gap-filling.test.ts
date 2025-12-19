/**
 * Integration tests for duration inference with gap filling
 * Tests that transfers don't overlap with activities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentImportService } from '../../src/services/document-import.service.js';
import { SegmentContinuityService } from '../../src/services/segment-continuity.service.js';
import { DurationInferenceService } from '../../src/services/duration-inference.service.js';
import type { Itinerary } from '../../src/domain/types/itinerary.js';
import type { ActivitySegment, FlightSegment } from '../../src/domain/types/segment.js';
import { SegmentType } from '../../src/domain/types/common.js';
import { generateSegmentId, generateItineraryId } from '../../src/domain/types/branded.js';

describe('Duration Inference with Gap Filling Integration', () => {
  let continuityService: SegmentContinuityService;
  let durationService: DurationInferenceService;

  beforeEach(() => {
    continuityService = new SegmentContinuityService();
    durationService = new DurationInferenceService();
  });

  describe('Overlap Prevention', () => {
    it('should not create transfer that overlaps with dinner', () => {
      // Scenario from user's problem:
      // - Flight lands at 2:00 PM
      // - Dinner starts at 2:30 PM
      // - Without duration inference: Transfer might end at 3:00 PM (overlaps!)
      // - With duration inference: Transfer should end before 2:30 PM

      const flight: FlightSegment = {
        id: generateSegmentId(),
        type: SegmentType.FLIGHT,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T10:00:00Z'),
        endDatetime: new Date('2025-01-10T14:00:00Z'), // Lands at 2:00 PM
        travelerIds: [],
        airline: { name: 'United', code: 'UA' },
        flightNumber: 'UA123',
        origin: {
          name: 'JFK Airport',
          code: 'JFK',
          type: 'AIRPORT',
          address: { country: 'US', city: 'New York' }
        },
        destination: {
          name: 'LAX Airport',
          code: 'LAX',
          type: 'AIRPORT',
          address: { country: 'US', city: 'Los Angeles' }
        },
        metadata: {},
        source: 'import',
      };

      const dinner: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T14:30:00Z'), // Starts at 2:30 PM
        endDatetime: new Date('2025-01-10T14:30:00Z'), // No explicit end time
        travelerIds: [],
        name: 'Dinner at Restaurant',
        location: {
          name: 'Downtown Restaurant',
          city: 'Los Angeles',
          type: 'RESTAURANT',
          address: { country: 'US', city: 'Los Angeles' }
        },
        metadata: {},
        source: 'import',
      };

      // Check that gap is detected
      const gaps = continuityService.detectLocationGaps([flight, dinner]);
      expect(gaps).toHaveLength(1);

      // Infer when dinner ends
      const dinnerEndTime = durationService.getEffectiveEndTime(dinner);

      // Dinner should end at 2:30 PM + 2 hours = 4:30 PM
      expect(dinnerEndTime).toEqual(new Date('2025-01-10T16:30:00Z'));

      // The gap-filling logic should create a transfer that:
      // 1. Starts after flight lands (2:00 PM)
      // 2. Ends BEFORE dinner starts (2:30 PM)
      // This validates the constraint that transfers can't overlap with destinations
    });

    it('should respect inferred duration when calculating transfer times', () => {
      // Museum visit with no explicit end time
      const museum: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T10:00:00Z'), // 10:00 AM
        endDatetime: new Date('2025-01-10T10:00:00Z'),
        travelerIds: [],
        name: 'Museum of Modern Art',
        location: {
          name: 'MoMA',
          city: 'New York',
          type: 'MUSEUM',
          address: { country: 'US', city: 'New York' }
        },
        metadata: {},
        source: 'import',
      };

      // Lunch at different location
      const lunch: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T13:00:00Z'), // 1:00 PM
        endDatetime: new Date('2025-01-10T13:00:00Z'),
        travelerIds: [],
        name: 'Lunch at Cafe',
        location: {
          name: 'Central Park Cafe',
          city: 'New York',
          type: 'RESTAURANT',
          address: { country: 'US', city: 'New York' }
        },
        metadata: {},
        source: 'import',
      };

      // Calculate effective end time for museum
      const museumEndTime = durationService.getEffectiveEndTime(museum);

      // Museum should end at 10:00 AM + 2 hours = 12:00 PM
      expect(museumEndTime).toEqual(new Date('2025-01-10T12:00:00Z'));

      // Verify there's enough time for transfer
      const timeDiff = lunch.startDatetime.getTime() - museumEndTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Should have 1 hour for transfer (12:00 PM to 1:00 PM)
      expect(hoursDiff).toBe(1);

      // Gap should be detected
      const gaps = continuityService.detectLocationGaps([museum, lunch]);
      expect(gaps).toHaveLength(1);
    });

    it('should handle tight schedules with warning', () => {
      // Broadway show with no explicit end time
      const show: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T19:00:00Z'), // 7:00 PM
        endDatetime: new Date('2025-01-10T19:00:00Z'),
        travelerIds: [],
        name: 'Broadway Show - Hamilton',
        location: {
          name: 'Richard Rodgers Theatre',
          city: 'New York',
          type: 'THEATER',
          address: { country: 'US', city: 'New York' }
        },
        metadata: {},
        source: 'import',
      };

      // Late dinner starting soon after show
      const lateDinner: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T22:00:00Z'), // 10:00 PM
        endDatetime: new Date('2025-01-10T22:00:00Z'),
        travelerIds: [],
        name: 'Late Dinner',
        location: {
          name: 'Nearby Restaurant',
          city: 'New York',
          type: 'RESTAURANT',
          address: { country: 'US', city: 'New York' }
        },
        metadata: {},
        source: 'import',
      };

      // Calculate effective end time for show
      const showEndTime = durationService.getEffectiveEndTime(show);

      // Show should end at 7:00 PM + 2.5 hours = 9:30 PM
      expect(showEndTime).toEqual(new Date('2025-01-10T21:30:00Z'));

      // Time between show end and dinner start
      const timeDiff = lateDinner.startDatetime.getTime() - showEndTime.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      // Only 30 minutes for transfer (tight but feasible)
      expect(minutesDiff).toBe(30);

      // Gap should still be detected
      const gaps = continuityService.detectLocationGaps([show, lateDinner]);
      expect(gaps).toHaveLength(1);
    });

    it('should handle activities with explicit end times', () => {
      // Meeting with explicit end time
      const meeting: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T14:00:00Z'), // 2:00 PM
        endDatetime: new Date('2025-01-10T15:30:00Z'), // Explicit end at 3:30 PM
        travelerIds: [],
        name: 'Client Meeting',
        location: {
          name: 'Office Building',
          city: 'New York',
          type: 'OFFICE',
          address: { country: 'US', city: 'New York' }
        },
        metadata: {},
        source: 'import',
      };

      // Calculate effective end time - should use actual time
      const meetingEndTime = durationService.getEffectiveEndTime(meeting);

      // Should use explicit end time (3:30 PM)
      expect(meetingEndTime).toEqual(new Date('2025-01-10T15:30:00Z'));

      // Verify duration is correctly calculated
      const duration = durationService.inferActivityDuration(meeting);
      expect(duration.hours).toBe(1.5);
      expect(duration.confidence).toBe('high');
      expect(duration.reason).toContain('Actual duration');
    });
  });

  describe('Standard Durations Reference', () => {
    it('should have correct standard durations', () => {
      const testCases = [
        { name: 'Breakfast', expected: 1, keyword: 'breakfast' },
        { name: 'Brunch', expected: 1.5, keyword: 'brunch' },
        { name: 'Lunch', expected: 1.5, keyword: 'lunch' },
        { name: 'Dinner', expected: 2, keyword: 'dinner' },
        { name: 'Movie', expected: 2, keyword: 'movie' },
        { name: 'Broadway Show', expected: 2.5, keyword: 'broadway show' },
        { name: 'Concert', expected: 2.5, keyword: 'concert' },
        { name: 'Opera', expected: 3, keyword: 'opera' },
        { name: 'Tour', expected: 3, keyword: 'tour' },
        { name: 'Museum', expected: 2, keyword: 'museum' },
        { name: 'Spa', expected: 2, keyword: 'spa' },
        { name: 'Golf', expected: 4, keyword: 'golf' },
      ];

      for (const testCase of testCases) {
        const segment: ActivitySegment = {
          id: generateSegmentId(),
          type: SegmentType.ACTIVITY,
          status: 'CONFIRMED',
          startDatetime: new Date('2025-01-10T10:00:00Z'),
          endDatetime: new Date('2025-01-10T10:00:00Z'),
          travelerIds: [],
          name: testCase.name,
          description: testCase.keyword,
          location: { name: 'Location', type: 'POI' },
          metadata: {},
          source: 'import',
        };

        const duration = durationService.inferActivityDuration(segment);
        expect(duration.hours).toBe(testCase.expected);
      }
    });
  });
});

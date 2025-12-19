/**
 * Tests for duration inference service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DurationInferenceService } from '../../src/services/duration-inference.service.js';
import type { ActivitySegment, MeetingSegment, Segment } from '../../src/domain/types/segment.js';
import { SegmentType } from '../../src/domain/types/common.js';
import { generateSegmentId } from '../../src/domain/types/branded.js';

describe('DurationInferenceService', () => {
  let service: DurationInferenceService;

  beforeEach(() => {
    service = new DurationInferenceService();
  });

  describe('Meal durations', () => {
    it('should infer 1 hour for breakfast', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T08:00:00Z'),
        endDatetime: new Date('2025-01-10T08:00:00Z'), // Will be ignored
        travelerIds: [],
        name: 'Breakfast at The Ritz',
        location: { name: 'The Ritz', type: 'RESTAURANT' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(1);
      expect(result.confidence).toBe('high');
      expect(result.reason).toContain('breakfast');
    });

    it('should infer 1.5 hours for lunch', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T12:00:00Z'),
        endDatetime: new Date('2025-01-10T12:00:00Z'),
        travelerIds: [],
        name: 'Lunch at Le Café',
        location: { name: 'Le Café', type: 'RESTAURANT' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(1.5);
      expect(result.confidence).toBe('high');
    });

    it('should infer 2 hours for dinner', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T19:00:00Z'),
        endDatetime: new Date('2025-01-10T19:00:00Z'),
        travelerIds: [],
        name: 'Dinner at Bad Roman',
        location: { name: 'Bad Roman', type: 'RESTAURANT' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(2);
      expect(result.confidence).toBe('high');
    });

    it('should infer 1.5 hours for brunch', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T10:00:00Z'),
        endDatetime: new Date('2025-01-10T10:00:00Z'),
        travelerIds: [],
        name: 'Brunch at Central Park Cafe',
        location: { name: 'Central Park Cafe', type: 'RESTAURANT' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(1.5);
      expect(result.confidence).toBe('high');
    });
  });

  describe('Entertainment durations', () => {
    it('should infer 2.5 hours for Broadway show', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T19:30:00Z'),
        endDatetime: new Date('2025-01-10T19:30:00Z'),
        travelerIds: [],
        name: 'Broadway Show - Hamilton',
        location: { name: 'Richard Rodgers Theatre', type: 'THEATER' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(2.5);
      expect(result.confidence).toBe('high');
    });

    it('should infer 2 hours for movie', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T20:00:00Z'),
        endDatetime: new Date('2025-01-10T20:00:00Z'),
        travelerIds: [],
        name: 'Movie screening',
        location: { name: 'AMC Theater', type: 'THEATER' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(2);
      expect(result.confidence).toBe('high');
    });

    it('should infer 2.5 hours for concert', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T20:00:00Z'),
        endDatetime: new Date('2025-01-10T20:00:00Z'),
        travelerIds: [],
        name: 'Taylor Swift Concert',
        location: { name: 'Madison Square Garden', type: 'VENUE' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(2.5);
      expect(result.confidence).toBe('high');
    });

    it('should infer 3 hours for opera', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T19:00:00Z'),
        endDatetime: new Date('2025-01-10T19:00:00Z'),
        travelerIds: [],
        name: 'Opera performance',
        location: { name: 'Metropolitan Opera', type: 'VENUE' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(3);
      expect(result.confidence).toBe('high');
    });
  });

  describe('Activity durations', () => {
    it('should infer 3 hours for tour', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T10:00:00Z'),
        endDatetime: new Date('2025-01-10T10:00:00Z'),
        travelerIds: [],
        name: 'Guided city tour',
        location: { name: 'Downtown', type: 'POI' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(3);
      expect(result.confidence).toBe('medium');
    });

    it('should infer 2 hours for museum visit', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T14:00:00Z'),
        endDatetime: new Date('2025-01-10T14:00:00Z'),
        travelerIds: [],
        name: 'Museum of Modern Art',
        location: { name: 'MoMA', type: 'MUSEUM' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(2);
      expect(result.confidence).toBe('medium');
    });

    it('should infer 2 hours for spa', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T15:00:00Z'),
        endDatetime: new Date('2025-01-10T15:00:00Z'),
        travelerIds: [],
        name: 'Spa treatment',
        location: { name: 'Luxury Spa', type: 'SPA' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(2);
      expect(result.confidence).toBe('medium');
    });

    it('should infer 4 hours for golf', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T09:00:00Z'),
        endDatetime: new Date('2025-01-10T09:00:00Z'),
        travelerIds: [],
        name: 'Golf at Pebble Beach',
        location: { name: 'Pebble Beach Golf Links', type: 'GOLF_COURSE' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(4);
      expect(result.confidence).toBe('medium');
    });
  });

  describe('Meeting durations', () => {
    it('should infer 1 hour for generic meeting', () => {
      const segment: MeetingSegment = {
        id: generateSegmentId(),
        type: SegmentType.MEETING,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T10:00:00Z'),
        endDatetime: new Date('2025-01-10T10:00:00Z'),
        travelerIds: [],
        title: 'Team Sync',
        location: { name: 'Conference Room A', type: 'OFFICE' },
        attendees: [],
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(1);
      expect(result.confidence).toBe('medium');
    });
  });

  describe('Default durations', () => {
    it('should infer 2 hours for unknown activity type', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T14:00:00Z'),
        endDatetime: new Date('2025-01-10T14:00:00Z'),
        travelerIds: [],
        name: 'Unknown Activity',
        location: { name: 'Some Place', type: 'POI' },
        metadata: {},
      };

      const result = service.inferActivityDuration(segment);

      expect(result.hours).toBe(2);
      expect(result.confidence).toBe('low');
      expect(result.reason).toContain('Default');
    });
  });

  describe('getEffectiveEndTime', () => {
    it('should use actual endDatetime if available', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T14:00:00Z'),
        endDatetime: new Date('2025-01-10T16:30:00Z'), // Actual end time
        travelerIds: [],
        name: 'Custom Activity',
        location: { name: 'Some Place', type: 'POI' },
        metadata: {},
      };

      const endTime = service.getEffectiveEndTime(segment);

      expect(endTime).toEqual(new Date('2025-01-10T16:30:00Z'));
    });

    it('should calculate end time based on inferred duration for dinner', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T19:00:00Z'),
        endDatetime: new Date('2025-01-10T19:00:00Z'), // Same as start (will be inferred)
        travelerIds: [],
        name: 'Dinner at Restaurant',
        location: { name: 'Fine Dining', type: 'RESTAURANT' },
        metadata: {},
      };

      const endTime = service.getEffectiveEndTime(segment);

      // Dinner = 2 hours, so 19:00 + 2h = 21:00
      expect(endTime).toEqual(new Date('2025-01-10T21:00:00Z'));
    });

    it('should calculate end time based on inferred duration for museum', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T14:00:00Z'),
        endDatetime: new Date('2025-01-10T14:00:00Z'),
        travelerIds: [],
        name: 'Museum visit',
        location: { name: 'Art Museum', type: 'MUSEUM' },
        metadata: {},
      };

      const endTime = service.getEffectiveEndTime(segment);

      // Museum = 2 hours, so 14:00 + 2h = 16:00
      expect(endTime).toEqual(new Date('2025-01-10T16:00:00Z'));
    });

    it('should calculate end time based on inferred duration for Broadway show', () => {
      const segment: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T19:30:00Z'),
        endDatetime: new Date('2025-01-10T19:30:00Z'),
        travelerIds: [],
        name: 'Broadway show',
        location: { name: 'Theater', type: 'THEATER' },
        metadata: {},
      };

      const endTime = service.getEffectiveEndTime(segment);

      // Show = 2.5 hours, so 19:30 + 2.5h = 22:00
      expect(endTime).toEqual(new Date('2025-01-10T22:00:00Z'));
    });
  });

  describe('Overlap prevention', () => {
    it('should prevent transfer from overlapping with dinner', () => {
      // Scenario: Dinner at 2:30 PM, inferred to end at 4:30 PM
      // Transfer should not start until after 4:30 PM
      const dinner: ActivitySegment = {
        id: generateSegmentId(),
        type: SegmentType.ACTIVITY,
        status: 'CONFIRMED',
        startDatetime: new Date('2025-01-10T14:30:00Z'), // 2:30 PM
        endDatetime: new Date('2025-01-10T14:30:00Z'),
        travelerIds: [],
        name: 'Lunch at restaurant',
        location: { name: 'Restaurant', type: 'RESTAURANT' },
        metadata: {},
      };

      const effectiveEnd = service.getEffectiveEndTime(dinner);

      // Lunch = 1.5 hours, so 14:30 + 1.5h = 16:00 (4:00 PM)
      expect(effectiveEnd).toEqual(new Date('2025-01-10T16:00:00Z'));

      // Transfer should not start before 16:00
      const transferStart = new Date('2025-01-10T16:15:00Z'); // 4:15 PM - OK
      expect(transferStart.getTime()).toBeGreaterThan(effectiveEnd.getTime());
    });
  });
});

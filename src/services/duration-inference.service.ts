/**
 * Duration inference service - infers standard durations for activities
 * Prevents overlapping transfers by understanding when activities end
 * @module services/duration-inference
 */

import type { Segment, ActivitySegment, MeetingSegment } from '../domain/types/segment.js';
import { SegmentType } from '../domain/types/common.js';

/**
 * Confidence level for inferred duration
 */
export type DurationConfidence = 'high' | 'medium' | 'low';

/**
 * Inferred duration result
 */
export interface InferredDuration {
  /** Duration in hours */
  hours: number;
  /** Confidence in the inference */
  confidence: DurationConfidence;
  /** Reason for the inference */
  reason: string;
}

/**
 * Service for inferring standard activity durations
 */
export class DurationInferenceService {
  /**
   * Infer activity duration based on segment type and description
   * @param segment - Segment to infer duration for
   * @returns Inferred duration
   */
  inferActivityDuration(segment: Segment): InferredDuration {
    // If segment has a meaningful endDatetime (different from startDatetime), use actual duration
    if (segment.endDatetime && segment.startDatetime) {
      const actualDurationMs = segment.endDatetime.getTime() - segment.startDatetime.getTime();

      // Only use actual duration if it's > 0 (not the same as start time)
      if (actualDurationMs > 0) {
        const actualDurationHours = actualDurationMs / (1000 * 60 * 60);
        return {
          hours: actualDurationHours,
          confidence: 'high',
          reason: 'Actual duration from segment timestamps',
        };
      }
    }

    // No meaningful endDatetime, infer from pattern matching
    const searchText = this.getSearchableText(segment).toLowerCase();

    // Try pattern matching
    return this.inferFromPattern(searchText, segment.type);
  }

  /**
   * Get the effective end time of a segment
   * Uses actual endDatetime if available, otherwise infers based on duration
   * @param segment - Segment to get end time for
   * @returns End datetime
   */
  getEffectiveEndTime(segment: Segment): Date {
    // Check if endDatetime is meaningful (different from startDatetime)
    if (segment.endDatetime && segment.startDatetime) {
      const durationMs = segment.endDatetime.getTime() - segment.startDatetime.getTime();

      // Only use actual endDatetime if it's > 0
      if (durationMs > 0) {
        return segment.endDatetime;
      }
    }

    // No meaningful endDatetime, infer duration and calculate end time
    const { hours } = this.inferActivityDuration(segment);
    const durationMs = hours * 60 * 60 * 1000;
    return new Date(segment.startDatetime.getTime() + durationMs);
  }

  /**
   * Extract searchable text from segment
   */
  private getSearchableText(segment: Segment): string {
    const parts: string[] = [];

    // Add type-specific fields
    switch (segment.type) {
      case SegmentType.ACTIVITY:
        const activity = segment as ActivitySegment;
        parts.push(activity.name || '');
        parts.push(activity.description || '');
        parts.push(activity.category || '');
        break;

      case SegmentType.MEETING:
        const meeting = segment as MeetingSegment;
        parts.push(meeting.title || '');
        parts.push(meeting.agenda || '');
        break;

      case SegmentType.CUSTOM:
        parts.push(segment.notes || '');
        break;
    }

    // Add location name if available
    if ('location' in segment && segment.location) {
      parts.push(segment.location.name || '');
    }

    // Add generic notes
    parts.push(segment.notes || '');

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Infer duration from pattern matching
   */
  private inferFromPattern(text: string, segmentType: string): InferredDuration {
    // Meals - high confidence
    if (text.includes('breakfast')) {
      return { hours: 1, confidence: 'high', reason: 'Standard breakfast duration' };
    }
    if (text.includes('brunch')) {
      return { hours: 1.5, confidence: 'high', reason: 'Standard brunch duration' };
    }
    if (text.includes('lunch')) {
      return { hours: 1.5, confidence: 'high', reason: 'Standard lunch duration' };
    }
    if (text.includes('dinner')) {
      return { hours: 2, confidence: 'high', reason: 'Standard dinner duration' };
    }
    if (text.includes('cocktail') || text.includes('drinks')) {
      return { hours: 1.5, confidence: 'medium', reason: 'Standard cocktail/drinks duration' };
    }

    // Entertainment - high confidence
    // Check movie/film BEFORE show (since "movie" is more specific)
    if (text.includes('movie') || text.includes('film') || text.includes('cinema')) {
      return { hours: 2, confidence: 'high', reason: 'Standard movie duration' };
    }
    if (text.includes('show') || text.includes('broadway') || text.includes('theatre') || text.includes('theater')) {
      return { hours: 2.5, confidence: 'high', reason: 'Standard show/theater duration' };
    }
    if (text.includes('concert')) {
      return { hours: 2.5, confidence: 'high', reason: 'Standard concert duration' };
    }
    if (text.includes('opera') || text.includes('ballet')) {
      return { hours: 3, confidence: 'high', reason: 'Standard opera/ballet duration' };
    }

    // Activities - medium confidence
    if (text.includes('tour')) {
      return { hours: 3, confidence: 'medium', reason: 'Standard tour duration' };
    }
    if (text.includes('museum') || text.includes('gallery') || text.includes('exhibition')) {
      return { hours: 2, confidence: 'medium', reason: 'Standard museum/gallery visit duration' };
    }
    if (text.includes('spa') || text.includes('massage')) {
      return { hours: 2, confidence: 'medium', reason: 'Standard spa/massage duration' };
    }
    if (text.includes('golf')) {
      return { hours: 4, confidence: 'medium', reason: 'Standard golf round duration' };
    }
    if (text.includes('hike') || text.includes('hiking')) {
      return { hours: 3, confidence: 'medium', reason: 'Standard hiking duration' };
    }
    if (text.includes('wine tasting') || text.includes('vineyard')) {
      return { hours: 2, confidence: 'medium', reason: 'Standard wine tasting duration' };
    }
    if (text.includes('cooking class') || text.includes('culinary')) {
      return { hours: 3, confidence: 'medium', reason: 'Standard cooking class duration' };
    }

    // Shopping
    if (text.includes('shopping')) {
      return { hours: 2, confidence: 'medium', reason: 'Standard shopping duration' };
    }

    // Meetings
    if (segmentType === SegmentType.MEETING) {
      return { hours: 1, confidence: 'medium', reason: 'Standard meeting duration' };
    }

    // Workshops and classes
    if (text.includes('workshop') || text.includes('class') || text.includes('lesson')) {
      return { hours: 2, confidence: 'medium', reason: 'Standard workshop/class duration' };
    }

    // Sports events
    if (text.includes('game') || text.includes('match') || text.includes('sporting')) {
      return { hours: 3, confidence: 'medium', reason: 'Standard sporting event duration' };
    }

    // Default for unknown activities - low confidence
    return {
      hours: 2,
      confidence: 'low',
      reason: 'Default duration for unknown activity type',
    };
  }
}

/**
 * Itinerary summarizer - generates concise text summaries for context injection
 * @module services/trip-designer/itinerary-summarizer
 */

import type { Itinerary } from '../../domain/types/itinerary.js';
import type { Segment } from '../../domain/types/segment.js';

/**
 * Format date as readable string (e.g., "Jan 15, 2025")
 * Uses UTC to avoid timezone conversion issues
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format date range (e.g., "Jan 15-22, 2025")
 * Uses UTC to avoid timezone conversion issues
 */
function formatDateRange(start: Date, end: Date): string {
  const startDate = formatDate(start);
  const endDate = formatDate(end);

  // If same month/year, abbreviate (use UTC methods)
  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} ${start.getUTCDate()}-${end.getUTCDate()}, ${start.getUTCFullYear()}`;
  }

  return `${startDate} - ${endDate}`;
}

/**
 * Calculate trip duration in days
 */
function calculateDuration(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Group segments by type and count them
 */
function summarizeSegments(segments: Segment[]): {
  flights: number;
  hotels: number;
  activities: number;
  other: number;
} {
  const summary = { flights: 0, hotels: 0, activities: 0, other: 0 };

  for (const segment of segments) {
    switch (segment.type) {
      case 'FLIGHT':
        summary.flights++;
        break;
      case 'HOTEL':
        summary.hotels++;
        break;
      case 'ACTIVITY':
        summary.activities++;
        break;
      default:
        summary.other++;
    }
  }

  return summary;
}

/**
 * Format segment counts as readable string
 */
function formatSegmentCounts(counts: ReturnType<typeof summarizeSegments>): string {
  const parts: string[] = [];

  if (counts.flights > 0) parts.push(`${counts.flights} flight${counts.flights > 1 ? 's' : ''}`);
  if (counts.hotels > 0) parts.push(`${counts.hotels} hotel${counts.hotels > 1 ? 's' : ''}`);
  if (counts.activities > 0) parts.push(`${counts.activities} activit${counts.activities > 1 ? 'ies' : 'y'}`);
  if (counts.other > 0) parts.push(`${counts.other} other segment${counts.other > 1 ? 's' : ''}`);

  return parts.join(', ');
}

/**
 * Format traveler preferences as readable string
 */
function formatPreferences(itinerary: Itinerary): string[] {
  const prefs: string[] = [];
  const tripPrefs = itinerary.tripPreferences;

  if (!tripPrefs) return prefs;

  // Travel style and pace
  if (tripPrefs.travelStyle && tripPrefs.pace) {
    prefs.push(`Style: ${tripPrefs.travelStyle} budget, ${tripPrefs.pace} pace`);
  } else if (tripPrefs.travelStyle) {
    prefs.push(`Style: ${tripPrefs.travelStyle} budget`);
  } else if (tripPrefs.pace) {
    prefs.push(`Pace: ${tripPrefs.pace}`);
  }

  // Interests
  if (tripPrefs.interests && tripPrefs.interests.length > 0) {
    prefs.push(`Interests: ${tripPrefs.interests.join(', ')}`);
  }

  // Origin
  if (tripPrefs.origin) {
    prefs.push(`Traveling from: ${tripPrefs.origin}`);
  }

  // Dietary restrictions
  if (tripPrefs.dietaryRestrictions) {
    prefs.push(`Diet: ${tripPrefs.dietaryRestrictions}`);
  }

  // Mobility restrictions
  if (tripPrefs.mobilityRestrictions) {
    prefs.push(`Mobility: ${tripPrefs.mobilityRestrictions}`);
  }

  // Accommodation preferences
  if (tripPrefs.accommodationPreference) {
    prefs.push(`Accommodation: ${tripPrefs.accommodationPreference}`);
  }

  // Budget flexibility
  if (tripPrefs.budgetFlexibility !== undefined) {
    const flexibility = ['very strict', 'strict', 'moderate', 'flexible', 'very flexible'][tripPrefs.budgetFlexibility - 1] || 'moderate';
    prefs.push(`Budget flexibility: ${flexibility}`);
  }

  return prefs;
}

/**
 * Summarize segments with brief details
 */
function summarizeSegmentDetails(segments: Segment[], maxCount: number = 8): string[] {
  const details: string[] = [];

  for (let i = 0; i < Math.min(segments.length, maxCount); i++) {
    const seg = segments[i];
    const date = formatDate(new Date(seg.startDatetime));

    switch (seg.type) {
      case 'FLIGHT':
        details.push(`- Flight: ${date}${seg.metadata?.route ? ` (${seg.metadata.route})` : ''}`);
        break;
      case 'HOTEL': {
        const nights = seg.metadata?.nights || 1;
        details.push(`- Hotel: ${date} (${nights} night${nights > 1 ? 's' : ''}${seg.metadata?.name ? `, ${seg.metadata.name}` : ''})`);
        break;
      }
      case 'ACTIVITY':
        details.push(`- Activity: ${date}${seg.metadata?.name ? ` - ${seg.metadata.name}` : ''}`);
        break;
      default:
        details.push(`- ${seg.type}: ${date}`);
    }
  }

  if (segments.length > maxCount) {
    details.push(`  ... and ${segments.length - maxCount} more segment${segments.length - maxCount > 1 ? 's' : ''}`);
  }

  return details;
}

/**
 * Generate a concise summary of the itinerary for context injection
 *
 * This summary is used in the Trip Designer system prompt when editing
 * existing itineraries, providing the agent with key context about the
 * current state of the trip.
 *
 * @param itinerary - The itinerary to summarize
 * @returns Formatted markdown summary
 */
export function summarizeItinerary(itinerary: Itinerary): string {
  const lines: string[] = [];

  // Header with title and dates
  const duration = calculateDuration(itinerary.startDate, itinerary.endDate);
  lines.push(`**Trip**: ${itinerary.title}`);
  lines.push(`**Dates**: ${formatDateRange(itinerary.startDate, itinerary.endDate)} (${duration} days)`);

  // Travelers
  const travelerCount = itinerary.travelers.length;
  if (travelerCount > 0) {
    const travelerNames = itinerary.travelers.map(t => `${t.firstName} ${t.lastName}`).join(', ');
    lines.push(`**Travelers**: ${travelerNames}`);
  } else {
    lines.push(`**Travelers**: Not specified`);
  }

  // Destinations
  if (itinerary.destinations.length > 0) {
    const destNames = itinerary.destinations
      .map(d => d.city || d.name)
      .filter(Boolean)
      .join(', ');
    lines.push(`**Destinations**: ${destNames}`);
  }

  // Preferences
  const prefs = formatPreferences(itinerary);
  if (prefs.length > 0) {
    lines.push('');
    lines.push('**Preferences**:');
    for (const pref of prefs) {
      lines.push(`- ${pref}`);
    }
  }

  // Budget
  if (itinerary.totalPrice) {
    lines.push('');
    lines.push(`**Budget**: ${itinerary.totalPrice.amount} ${itinerary.totalPrice.currency}`);
  }

  // Segments summary
  if (itinerary.segments.length > 0) {
    const segmentCounts = summarizeSegments(itinerary.segments);
    const countsStr = formatSegmentCounts(segmentCounts);

    lines.push('');
    lines.push(`**Segments**: ${countsStr} (${itinerary.segments.length} total)`);

    // Show first few segments with details
    const segmentDetails = summarizeSegmentDetails(itinerary.segments);
    lines.push(...segmentDetails);
  }

  return lines.join('\n');
}

/**
 * Generate a minimal summary for session compression
 * Focuses on just the essential facts without formatting
 */
export function summarizeItineraryMinimal(itinerary: Itinerary): string {
  const parts: string[] = [];

  // Basic info
  parts.push(`${itinerary.title} (${formatDateRange(itinerary.startDate, itinerary.endDate)})`);

  // Destinations
  if (itinerary.destinations.length > 0) {
    const destNames = itinerary.destinations
      .map(d => d.city || d.name)
      .filter(Boolean)
      .join(', ');
    parts.push(`Destinations: ${destNames}`);
  }

  // Segments
  if (itinerary.segments.length > 0) {
    const counts = summarizeSegments(itinerary.segments);
    parts.push(formatSegmentCounts(counts));
  }

  return parts.join(' | ');
}

/**
 * Segment continuity service - detects geographic gaps in itineraries
 * @module services/segment-continuity
 */

import type {
  ActivitySegment,
  CustomSegment,
  FlightSegment,
  HotelSegment,
  MeetingSegment,
  Segment,
  TransferSegment,
} from '../domain/types/segment.js';
import type { Location } from '../domain/types/location.js';

/**
 * Type of geographic gap between segments
 */
export enum GapType {
  /** Same city, different locations (needs ground transfer) */
  LOCAL_TRANSFER = 'LOCAL_TRANSFER',
  /** Different cities in same country (needs domestic flight or long transfer) */
  DOMESTIC_GAP = 'DOMESTIC_GAP',
  /** Different countries (needs international flight) */
  INTERNATIONAL_GAP = 'INTERNATIONAL_GAP',
  /** Unknown gap type (insufficient location data) */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Geographic gap between two segments
 */
export interface LocationGap {
  /** Index of segment before gap */
  beforeIndex: number;
  /** Index of segment after gap */
  afterIndex: number;
  /** Segment before gap */
  beforeSegment: Segment;
  /** Segment after gap */
  afterSegment: Segment;
  /** End location of before segment */
  endLocation: Location | null;
  /** Start location of after segment */
  startLocation: Location | null;
  /** Type of gap detected */
  gapType: GapType;
  /** Human-readable description of gap */
  description: string;
  /** Suggested segment type to fill gap */
  suggestedType: 'FLIGHT' | 'TRANSFER';
}

/**
 * Service for detecting geographic discontinuities between segments
 */
export class SegmentContinuityService {
  /**
   * Get the starting geographic location for any segment type
   * @param segment - Segment to extract start location from
   * @returns Start location or null if not applicable
   */
  getStartLocation(segment: Segment): Location | null {
    switch (segment.type) {
      case 'FLIGHT':
        return (segment as FlightSegment).origin;

      case 'TRANSFER':
        return (segment as TransferSegment).pickupLocation;

      case 'HOTEL':
        return (segment as HotelSegment).location;

      case 'ACTIVITY':
        return (segment as ActivitySegment).location;

      case 'MEETING':
        return (segment as MeetingSegment).location;

      case 'CUSTOM':
        return (segment as CustomSegment).location ?? null;

      default:
        return null;
    }
  }

  /**
   * Get the ending geographic location for any segment type
   * @param segment - Segment to extract end location from
   * @returns End location or null if not applicable
   */
  getEndLocation(segment: Segment): Location | null {
    switch (segment.type) {
      case 'FLIGHT':
        return (segment as FlightSegment).destination;

      case 'TRANSFER':
        return (segment as TransferSegment).dropoffLocation;

      case 'HOTEL':
        // Hotel stays end at the same location they start
        return (segment as HotelSegment).location;

      case 'ACTIVITY':
        // Activities end at the same location they start
        return (segment as ActivitySegment).location;

      case 'MEETING':
        // Meetings end at the same location they start
        return (segment as MeetingSegment).location;

      case 'CUSTOM':
        return (segment as CustomSegment).location ?? null;

      default:
        return null;
    }
  }

  /**
   * Detect geographic gaps between consecutive segments
   * @param segments - Array of segments in chronological order
   * @returns Array of detected gaps
   */
  detectLocationGaps(segments: Segment[]): LocationGap[] {
    const gaps: LocationGap[] = [];

    for (let i = 0; i < segments.length - 1; i++) {
      const currentSegment = segments[i];
      const nextSegment = segments[i + 1];

      if (!currentSegment || !nextSegment) {
        continue;
      }

      const endLocation = this.getEndLocation(currentSegment);
      const startLocation = this.getStartLocation(nextSegment);

      // If either location is missing, we can't determine continuity
      if (!endLocation || !startLocation) {
        continue;
      }

      // Check if locations are different (case-insensitive comparison)
      const locationsDiffer = !this.isSameLocation(endLocation, startLocation);

      if (locationsDiffer) {
        const gapType = this.classifyGap(endLocation, startLocation);
        const gap: LocationGap = {
          beforeIndex: i,
          afterIndex: i + 1,
          beforeSegment: currentSegment,
          afterSegment: nextSegment,
          endLocation,
          startLocation,
          gapType,
          description: this.describeGap(endLocation, startLocation, gapType),
          suggestedType: this.suggestSegmentType(gapType),
        };
        gaps.push(gap);
      }
    }

    return gaps;
  }

  /**
   * Classify the type of gap between two locations
   * @param endLoc - End location of previous segment
   * @param startLoc - Start location of next segment
   * @returns Gap classification
   */
  classifyGap(endLoc: Location, startLoc: Location): GapType {
    // Check for country information
    const endCountry = endLoc.address?.country || this.inferCountryFromCode(endLoc.code);
    const startCountry = startLoc.address?.country || this.inferCountryFromCode(startLoc.code);

    // If we can't determine countries, return UNKNOWN
    if (!endCountry || !startCountry) {
      return GapType.UNKNOWN;
    }

    // Different countries = international gap
    if (endCountry.toUpperCase() !== startCountry.toUpperCase()) {
      return GapType.INTERNATIONAL_GAP;
    }

    // Same country, check cities
    const endCity = this.normalizeCity(endLoc.address?.city || endLoc.name);
    const startCity = this.normalizeCity(startLoc.address?.city || startLoc.name);

    // Different cities in same country = domestic gap
    if (endCity !== startCity) {
      return GapType.DOMESTIC_GAP;
    }

    // Same city = local transfer
    return GapType.LOCAL_TRANSFER;
  }

  /**
   * Check if two locations represent the same place
   * @param loc1 - First location
   * @param loc2 - Second location
   * @returns True if locations are considered the same
   */
  private isSameLocation(loc1: Location, loc2: Location): boolean {
    // Check airport codes first (most reliable for airports)
    if (loc1.code && loc2.code) {
      return loc1.code.toUpperCase() === loc2.code.toUpperCase();
    }

    // Check location names (normalized)
    const name1 = this.normalizeLocationName(loc1.name);
    const name2 = this.normalizeLocationName(loc2.name);

    if (name1 === name2) {
      return true;
    }

    // If one has a code and the other doesn't, they're different locations
    // (e.g., JFK Airport vs. Manhattan Hotel - both in NYC but different places)
    if ((loc1.code && !loc2.code) || (!loc1.code && loc2.code)) {
      return false;
    }

    // Check for address vs venue name match (e.g., "123 Main St" vs "Grand Hotel")
    // If both are in the same city/area and one could be an address, they might be same place
    if (this.looksLikeAddress(loc1.name) || this.looksLikeAddress(loc2.name)) {
      // Same city suggests same area - consider as same location to avoid false positives
      const city1 = loc1.address?.city || this.extractCityFromName(loc1.name);
      const city2 = loc2.address?.city || this.extractCityFromName(loc2.name);
      if (city1 && city2 && this.normalizeCity(city1) === this.normalizeCity(city2)) {
        return true;
      }
      // If one location name contains key venue identifier from the other
      if (this.shareSignificantWords(name1, name2)) {
        return true;
      }
    }

    // Check if one name contains the other (e.g., "Four Seasons" in "Four Seasons Resort Oahu")
    if (name1.length > 5 && name2.length > 5) {
      if (name1.includes(name2) || name2.includes(name1)) {
        return true;
      }
    }

    // Only treat as same location if names are very similar despite normalization
    // City/country match alone is not sufficient - that just means same city
    return false;
  }

  /**
   * Check if a string looks like a street address
   */
  private looksLikeAddress(name: string): boolean {
    // Street address patterns: numbers at start, "St", "Ave", "Blvd", etc.
    const addressPattern = /^\d+[\-\s]|(?:st|ave|blvd|rd|dr|ln|way|street|avenue|boulevard|road|drive|lane)\b/i;
    return addressPattern.test(name);
  }

  /**
   * Extract city name from a location name if embedded
   */
  private extractCityFromName(name: string): string | null {
    // Look for common patterns like "Hotel at/in/near City" or "City Hotel"
    const patterns = [
      /at\s+(.+)$/i,
      /in\s+(.+)$/i,
      /,\s*(.+)$/,
    ];
    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Check if two names share significant words (venue identifiers)
   */
  private shareSignificantWords(name1: string, name2: string): boolean {
    const stopWords = new Set([
      'the', 'at', 'in', 'on', 'of', 'and', 'a', 'an', 'to', 'for',
      'resort', 'hotel', 'inn', 'suites', 'lodge', 'airport', 'international',
      'st', 'ave', 'blvd', 'rd', 'street', 'avenue', 'boulevard', 'road',
      'drive', 'lane', 'way', 'place', 'hi', 'ca', 'ny', 'tx', 'fl', // US state abbrevs
    ]);

    const words1 = name1.split(/[\s,]+/).filter(w => w.length > 2 && !stopWords.has(w));
    const words2 = name2.split(/[\s,]+/).filter(w => w.length > 2 && !stopWords.has(w));

    // Check if any significant word from name1 is in name2 or vice versa
    for (const word of words1) {
      if (words2.some(w2 => w2.includes(word) || word.includes(w2))) {
        return true;
      }
    }

    // Also check for location patterns like "Ko Olina" that might span two words
    const locationPattern1 = this.extractLocationPattern(name1);
    const locationPattern2 = this.extractLocationPattern(name2);
    if (locationPattern1 && locationPattern2) {
      if (locationPattern1 === locationPattern2 ||
          locationPattern1.includes(locationPattern2) ||
          locationPattern2.includes(locationPattern1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract location patterns from name (e.g., "Ko Olina", "Kapolei")
   */
  private extractLocationPattern(name: string): string | null {
    // Look for capitalized multi-word patterns that might be place names
    const patterns = [
      /(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    ];
    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }
    return null;
  }

  /**
   * Normalize location name for comparison
   * @param name - Location name
   * @returns Normalized name
   */
  private normalizeLocationName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Normalize city name for comparison
   * @param city - City name
   * @returns Normalized city name
   */
  private normalizeCity(city: string): string {
    // Remove common suffixes and normalize
    return city
      .toLowerCase()
      .trim()
      .replace(/\s+(airport|international|city|municipal)$/i, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Infer country from airport or location code
   * @param code - IATA airport code or location code
   * @returns Inferred country code or null
   */
  private inferCountryFromCode(code?: string): string | null {
    if (!code || code.length !== 3) {
      return null;
    }

    // This is a simplified mapping - in production, use a comprehensive IATA code database
    const codeToCountry: Record<string, string> = {
      // USA airports
      JFK: 'US',
      LAX: 'US',
      ORD: 'US',
      ATL: 'US',
      DFW: 'US',
      SFO: 'US',
      EWR: 'US',
      PHL: 'US',
      BOS: 'US',
      // Italy airports
      MXP: 'IT', // Milan Malpensa
      LIN: 'IT', // Milan Linate
      FCO: 'IT', // Rome Fiumicino
      CIA: 'IT', // Rome Ciampino
      VCE: 'IT', // Venice
      // UK airports
      LHR: 'GB',
      LGW: 'GB',
      // France airports
      CDG: 'FR',
      ORY: 'FR',
      // Add more as needed
    };

    return codeToCountry[code.toUpperCase()] ?? null;
  }

  /**
   * Describe a gap in human-readable format
   * @param endLoc - End location
   * @param startLoc - Start location
   * @param gapType - Gap classification
   * @returns Human-readable description
   */
  private describeGap(endLoc: Location, startLoc: Location, gapType: GapType): string {
    const endName = this.getDisplayName(endLoc);
    const startName = this.getDisplayName(startLoc);

    switch (gapType) {
      case GapType.LOCAL_TRANSFER:
        return `Local transfer needed from ${endName} to ${startName}`;
      case GapType.DOMESTIC_GAP:
        return `Domestic transportation needed from ${endName} to ${startName}`;
      case GapType.INTERNATIONAL_GAP:
        return `International flight needed from ${endName} to ${startName}`;
      case GapType.UNKNOWN:
        return `Transportation gap between ${endName} and ${startName}`;
      default:
        return `Gap detected between ${endName} and ${startName}`;
    }
  }

  /**
   * Get display name for a location
   * @param loc - Location
   * @returns Display name (with code if available)
   */
  private getDisplayName(loc: Location): string {
    if (loc.code) {
      return `${loc.name} (${loc.code})`;
    }
    if (loc.address?.city) {
      return `${loc.name}, ${loc.address.city}`;
    }
    return loc.name;
  }

  /**
   * Suggest segment type to fill a gap
   * @param gapType - Type of gap
   * @returns Suggested segment type
   */
  private suggestSegmentType(gapType: GapType): 'FLIGHT' | 'TRANSFER' {
    switch (gapType) {
      case GapType.LOCAL_TRANSFER:
        return 'TRANSFER';
      case GapType.DOMESTIC_GAP:
      case GapType.INTERNATIONAL_GAP:
        return 'FLIGHT';
      default:
        return 'TRANSFER'; // Conservative default
    }
  }

  /**
   * Sort segments chronologically
   * @param segments - Array of segments
   * @returns Sorted array
   */
  sortSegments(segments: Segment[]): Segment[] {
    return [...segments].sort((a, b) => {
      return a.startDatetime.getTime() - b.startDatetime.getTime();
    });
  }
}

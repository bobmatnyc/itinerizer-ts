/**
 * Schema normalization service - makes LLM outputs resilient to variations
 * @module services/schema-normalizer
 *
 * Philosophy: Be lenient in what you accept, strict in what you produce.
 * This service transforms LLM output variations into valid schema-compliant data
 * BEFORE validation, rather than rejecting reasonable variations.
 */

/**
 * Transfer type normalization map
 * Maps common LLM variations to valid TransferType enum values
 */
const TRANSFER_TYPE_MAPPINGS: Record<string, string> = {
  // Rail/Train variations
  'RAIL': 'RAIL',
  'TRAIN': 'RAIL',
  'RAILWAY': 'RAIL',
  'SUBWAY': 'RAIL',
  'METRO': 'RAIL',

  // Ferry/Boat variations
  'FERRY': 'FERRY',
  'BOAT': 'FERRY',
  'WATER_TAXI': 'FERRY',

  // Walking variations
  'WALKING': 'WALKING',
  'WALK': 'WALKING',
  'ON_FOOT': 'WALKING',
  'FOOT': 'WALKING',

  // Existing types (ensure they map correctly)
  'TAXI': 'TAXI',
  'CAB': 'TAXI',
  'SHUTTLE': 'SHUTTLE',
  'PRIVATE': 'PRIVATE',
  'PRIVATE_CAR': 'PRIVATE',
  'PUBLIC': 'PUBLIC',
  'PUBLIC_TRANSPORT': 'PUBLIC',
  'BUS': 'PUBLIC',
  'RIDE_SHARE': 'RIDE_SHARE',
  'RIDESHARE': 'RIDE_SHARE',
  'UBER': 'RIDE_SHARE',
  'LYFT': 'RIDE_SHARE',
  'RENTAL_CAR': 'RENTAL_CAR',
  'RENTAL': 'RENTAL_CAR',
  'CAR_RENTAL': 'RENTAL_CAR',

  // Fallback to OTHER for unknown types
  'OTHER': 'OTHER',
  'UNKNOWN': 'OTHER',
};

/**
 * Normalize airport/station codes
 * - Truncate codes > 3 chars to first 3
 * - Pad codes < 3 chars with X
 * - Make codes uppercase
 * - Return undefined for invalid codes (they're optional)
 */
function normalizeLocationCode(code: string | undefined): string | undefined {
  if (!code) return undefined;

  const trimmed = code.trim().toUpperCase();

  // If empty after trim, return undefined
  if (trimmed.length === 0) return undefined;

  // Truncate if too long
  if (trimmed.length > 3) {
    console.warn(`[Normalizer] Truncating location code "${code}" to "${trimmed.slice(0, 3)}"`);
    return trimmed.slice(0, 3);
  }

  // Pad if too short
  if (trimmed.length < 3) {
    const padded = trimmed.padEnd(3, 'X');
    console.warn(`[Normalizer] Padding location code "${code}" to "${padded}"`);
    return padded;
  }

  return trimmed;
}

/**
 * Normalize transfer type enum value
 * Maps common variations to valid enum values
 */
function normalizeTransferType(type: string | undefined): string {
  if (!type) return 'OTHER';

  const upperType = type.trim().toUpperCase();
  const normalized = TRANSFER_TYPE_MAPPINGS[upperType];

  if (!normalized) {
    console.warn(`[Normalizer] Unknown transfer type "${type}", mapping to OTHER`);
    return 'OTHER';
  }

  if (normalized !== upperType) {
    console.log(`[Normalizer] Normalized transfer type "${type}" → "${normalized}"`);
  }

  return normalized;
}

/**
 * Normalize datetime values
 * Handles ISO strings with or without timezone, date-only strings
 */
function normalizeDatetime(value: unknown): Date | string {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    // Handle date-only strings (YYYY-MM-DD) by appending time
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const normalized = `${value}T00:00:00Z`;
      console.log(`[Normalizer] Date-only string "${value}" → "${normalized}"`);
      return normalized;
    }

    // Handle datetime strings without timezone by appending Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
      const normalized = `${value}Z`;
      console.log(`[Normalizer] Datetime without timezone "${value}" → "${normalized}"`);
      return normalized;
    }

    // Already has timezone or is in valid ISO format
    return value;
  }

  // Pass through other types (number timestamps, etc.) - let Zod coerce them
  return value as string;
}

/**
 * Normalize a location object
 */
function normalizeLocation(location: any): any {
  if (!location || typeof location !== 'object') {
    return location;
  }

  return {
    ...location,
    code: normalizeLocationCode(location.code),
  };
}

/**
 * Normalize a segment object
 */
function normalizeSegment(segment: any): any {
  if (!segment || typeof segment !== 'object') {
    return segment;
  }

  const normalized: any = {
    ...segment,
    startDatetime: normalizeDatetime(segment.startDatetime),
    endDatetime: normalizeDatetime(segment.endDatetime),
  };

  // Fix datetime validation issues: endDatetime must be after startDatetime
  // This happens when LLMs create segments with invalid time ranges
  const startDate = new Date(normalized.startDatetime);
  const endDate = normalized.endDatetime ? new Date(normalized.endDatetime) : null;

  // If endDatetime is missing or invalid, set it to startDatetime + 30 minutes
  if (!endDate || isNaN(endDate.getTime())) {
    const fixedEnd = new Date(startDate.getTime() + 30 * 60 * 1000);
    normalized.endDatetime = fixedEnd.toISOString();
    console.warn(
      `[Normalizer] Segment ${segment.id}: endDatetime missing/invalid, set to startDatetime + 30min`
    );
  }
  // If endDatetime <= startDatetime, set it to startDatetime + 30 minutes
  else if (endDate <= startDate) {
    const fixedEnd = new Date(startDate.getTime() + 30 * 60 * 1000);
    normalized.endDatetime = fixedEnd.toISOString();
    console.warn(
      `[Normalizer] Segment ${segment.id}: endDatetime (${segment.endDatetime}) <= startDatetime (${segment.startDatetime}), fixed to +30min`
    );
  }

  // Normalize segment-type-specific fields
  switch (segment.type) {
    case 'FLIGHT':
      if (segment.origin) {
        normalized.origin = normalizeLocation(segment.origin);
      }
      if (segment.destination) {
        normalized.destination = normalizeLocation(segment.destination);
      }
      break;

    case 'TRANSFER':
      if (segment.transferType) {
        normalized.transferType = normalizeTransferType(segment.transferType);
      }
      if (segment.pickupLocation) {
        normalized.pickupLocation = normalizeLocation(segment.pickupLocation);
      }
      if (segment.dropoffLocation) {
        normalized.dropoffLocation = normalizeLocation(segment.dropoffLocation);
      }
      break;

    case 'HOTEL':
      if (segment.checkInDate) {
        normalized.checkInDate = normalizeDatetime(segment.checkInDate);
      }
      if (segment.checkOutDate) {
        normalized.checkOutDate = normalizeDatetime(segment.checkOutDate);
      }
      if (segment.location) {
        normalized.location = normalizeLocation(segment.location);
      }
      break;

    case 'MEETING':
    case 'ACTIVITY':
      if (segment.location) {
        normalized.location = normalizeLocation(segment.location);
      }
      break;
  }

  // Handle null values for optional string fields - convert to undefined (remove)
  if (normalized.notes === null) {
    delete normalized.notes;
  }
  if (normalized.description === null) {
    delete normalized.description;
  }
  if (normalized.inferredReason === null) {
    delete normalized.inferredReason;
  }

  // Handle null in sourceDetails
  if (normalized.sourceDetails) {
    if (normalized.sourceDetails.model === null) {
      delete normalized.sourceDetails.model;
    }
    if (normalized.sourceDetails.mode === null) {
      delete normalized.sourceDetails.mode;
    }
  }

  return normalized;
}

/**
 * Normalize the entire import data structure
 * Called BEFORE schema validation to fix common LLM output variations
 *
 * @param data - Raw parsed JSON from LLM
 * @returns Normalized data ready for schema validation
 */
export function normalizeImportData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  console.log('[Normalizer] Starting schema normalization...');

  const normalized: any = {
    ...data,
  };

  // Normalize segments array
  if (Array.isArray(data.segments)) {
    normalized.segments = data.segments.map((segment: any, index: number) => {
      try {
        return normalizeSegment(segment);
      } catch (error) {
        console.error(`[Normalizer] Error normalizing segment ${index}:`, error);
        return segment; // Return original on error
      }
    });
  }

  // Normalize top-level dates
  if (data.startDate) {
    normalized.startDate = normalizeDatetime(data.startDate);
  }
  if (data.endDate) {
    normalized.endDate = normalizeDatetime(data.endDate);
  }

  console.log('[Normalizer] Schema normalization complete');

  return normalized;
}

/**
 * Get statistics about normalizations performed
 * Useful for debugging and understanding LLM output quality
 */
export interface NormalizationStats {
  locationCodesTruncated: number;
  locationCodesPadded: number;
  transferTypesMapped: number;
  datesNormalized: number;
}

// TODO: Implement stats tracking if needed for debugging

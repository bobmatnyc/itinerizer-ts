import { z } from 'zod';

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local date at noon.
 * This avoids timezone rollover issues where midnight UTC becomes
 * the previous day in US timezones.
 */
export function parseLocalDate(isoDateString: string): Date {
  if (!isoDateString) return new Date();

  // Handle full ISO datetime strings (YYYY-MM-DDTHH:MM:SS)
  if (isoDateString.includes('T')) {
    return new Date(isoDateString);
  }

  // Parse date-only strings as local noon to avoid timezone rollover
  const parts = isoDateString.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  // Validate that we have all required parts
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid date format: ${isoDateString}. Expected YYYY-MM-DD`);
  }

  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Parse a datetime string, preserving time if provided.
 * For date-only strings, uses noon local time.
 */
export function parseLocalDateTime(dateTimeString: string): Date {
  if (!dateTimeString) return new Date();

  if (dateTimeString.includes('T')) {
    // Full datetime - parse normally
    return new Date(dateTimeString);
  }

  // Date only - use noon
  return parseLocalDate(dateTimeString);
}

/**
 * Safely parse date input of any type, returning undefined for invalid input.
 * This is the single source of truth for date parsing across the application.
 *
 * Behavior:
 * - Date objects are returned as-is
 * - Date-only strings (YYYY-MM-DD) are parsed as local noon to avoid timezone rollover
 * - Datetime strings (YYYY-MM-DDTHH:MM:SS) preserve the provided time
 * - undefined/null returns undefined
 * - Invalid dates return undefined
 *
 * @example
 * parseDateSafe('2025-12-25') // Date at 2025-12-25T12:00:00 local
 * parseDateSafe('2025-12-25T10:30:00') // Date at specified time
 * parseDateSafe(new Date()) // Returns same Date object
 * parseDateSafe(undefined) // Returns undefined
 * parseDateSafe('invalid') // Returns undefined
 */
export function parseDateSafe(input: string | Date | undefined | null): Date | undefined {
  // Handle undefined/null
  if (input === undefined || input === null) {
    return undefined;
  }

  // Handle Date objects - return as-is
  if (input instanceof Date) {
    // Check if date is valid
    return isNaN(input.getTime()) ? undefined : input;
  }

  // Handle string input
  if (typeof input === 'string') {
    const trimmed = input.trim();

    // Empty string
    if (!trimmed) {
      return undefined;
    }

    try {
      // Handle full ISO datetime strings (YYYY-MM-DDTHH:MM:SS)
      if (trimmed.includes('T')) {
        const date = new Date(trimmed);
        return isNaN(date.getTime()) ? undefined : date;
      }

      // Handle date-only strings (YYYY-MM-DD)
      // Parse as local noon to avoid timezone rollover
      const parts = trimmed.split('-').map(Number);
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];

      // Validate format
      if (
        parts.length !== 3 ||
        year === undefined ||
        month === undefined ||
        day === undefined ||
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day)
      ) {
        return undefined;
      }

      // Validate ranges
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return undefined;
      }

      const date = new Date(year, month - 1, day, 12, 0, 0);

      // Final validation - check if date is valid and didn't roll over
      // (e.g., Feb 30 becomes Mar 2, which we want to reject)
      if (
        isNaN(date.getTime()) ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return undefined;
      }

      return date;
    } catch {
      return undefined;
    }
  }

  // Unknown input type
  return undefined;
}

/**
 * Zod schema for safe date parsing.
 * Accepts Date objects, ISO date strings (YYYY-MM-DD), or datetime strings.
 * Date-only strings are parsed as local noon to avoid timezone rollover.
 * Returns undefined for invalid/missing input.
 *
 * @example
 * const schema = z.object({
 *   startDate: safeDateSchema,
 *   endDate: safeDateSchema
 * });
 *
 * schema.parse({ startDate: '2025-12-25' }); // { startDate: Date, endDate: undefined }
 */
export const safeDateSchema = z
  .union([z.date(), z.string(), z.undefined(), z.null()])
  .transform((val) => parseDateSafe(val))
  .optional();

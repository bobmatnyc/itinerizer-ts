/**
 * Common Zod schemas for enums and primitives
 * @module domain/schemas/common
 */

import { z } from 'zod';

// ===========================
// Primitive schemas
// ===========================

/**
 * UUID schema - validates UUID v4 format
 */
export const uuidSchema = z.string().uuid();

/**
 * Date schema - coerces string/number to Date
 */
export const dateSchema = z.coerce.date();

/**
 * ISO date schema - validates YYYY-MM-DD format only
 */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format');

/**
 * Time schema - validates HH:mm format
 */
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format');

// ===========================
// Branded ID schemas
// ===========================

/**
 * Itinerary ID schema with branding
 */
export const itineraryIdSchema = uuidSchema.brand<'ItineraryId'>();

/**
 * Segment ID schema with branding
 */
export const segmentIdSchema = uuidSchema.brand<'SegmentId'>();

/**
 * Traveler ID schema with branding
 */
export const travelerIdSchema = uuidSchema.brand<'TravelerId'>();

// ===========================
// Enum schemas
// ===========================

/**
 * Itinerary status enum schema
 */
export const itineraryStatusSchema = z.enum([
  'DRAFT',
  'PLANNED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

/**
 * Trip type enum schema
 */
export const tripTypeSchema = z.enum(['LEISURE', 'BUSINESS', 'MIXED']);

/**
 * Segment type enum schema
 */
export const segmentTypeSchema = z.enum([
  'FLIGHT',
  'HOTEL',
  'MEETING',
  'ACTIVITY',
  'TRANSFER',
  'CUSTOM',
]);

/**
 * Segment status enum schema
 */
export const segmentStatusSchema = z.enum([
  'TENTATIVE',
  'CONFIRMED',
  'WAITLISTED',
  'CANCELLED',
  'COMPLETED',
]);

/**
 * Traveler type enum schema
 */
export const travelerTypeSchema = z.enum(['ADULT', 'CHILD', 'INFANT', 'SENIOR']);

/**
 * Cabin class enum schema
 */
export const cabinClassSchema = z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']);

/**
 * Transfer type enum schema
 */
export const transferTypeSchema = z.enum([
  'TAXI',
  'SHUTTLE',
  'PRIVATE',
  'PUBLIC',
  'RIDE_SHARE',
  'RENTAL_CAR',
  'RAIL',
  'FERRY',
  'WALKING',
  'OTHER',
]);

/**
 * Board basis enum schema
 */
export const boardBasisSchema = z.enum([
  'ROOM_ONLY',
  'BED_BREAKFAST',
  'HALF_BOARD',
  'FULL_BOARD',
  'ALL_INCLUSIVE',
]);

/**
 * Seat preference enum schema
 */
export const seatPreferenceSchema = z.enum(['AISLE', 'WINDOW', 'MIDDLE']);

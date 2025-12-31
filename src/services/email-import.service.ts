/**
 * Email Import Service - Extract travel booking details from emails
 * @module services/email-import
 */

import OpenAI from 'openai';
import { err, ok } from '../core/result.js';
import type { Result } from '../core/result.js';
import { createValidationError } from '../core/errors.js';
import type { ValidationError } from '../core/errors.js';
import type { Segment } from '../domain/types/segment.js';
import { SegmentType, SegmentStatus } from '../domain/types/common.js';

/**
 * Configuration for email import service
 */
export interface EmailImportConfig {
  /** OpenRouter API key */
  apiKey: string;
  /** Model to use for extraction (default: claude-3.5-haiku) */
  model?: string;
}

/**
 * Email data from inbound.new webhook
 */
export interface InboundEmail {
  id: string;
  from: { address: string; name?: string };
  to: { address: string; name?: string }[];
  subject: string;
  textBody: string;
  htmlBody: string;
  date: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    url: string;
  }>;
}

/**
 * Extracted booking details with confidence score
 */
export interface ExtractedBooking {
  /** Array of segments extracted from the email */
  segments: Array<Omit<Segment, 'id' | 'metadata' | 'travelerIds'>>;
  /** Confidence score (0-1) for the extraction */
  confidence: number;
  /** Human-readable explanation of what was found */
  summary: string;
  /** Warnings or issues during extraction */
  warnings?: string[];
}

/**
 * Default model for email extraction
 * Claude 3.5 Haiku: Fast, accurate, cost-effective
 */
const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku';

/**
 * System prompt for email extraction
 */
const EMAIL_EXTRACTION_PROMPT = `You are an expert at extracting travel booking details from confirmation emails.

Extract ALL booking information from the email and return structured JSON matching the segment schema.

Common email types to handle:
- Flight confirmations (airlines: United, Delta, American, Southwest, etc.)
- Hotel confirmations (Marriott, Hilton, Hyatt, Airbnb, Booking.com, etc.)
- Activity bookings (tours, tickets, reservations)
- Car rentals (Hertz, Enterprise, Budget, etc.)
- Restaurant reservations (OpenTable, Resy, etc.)

For each booking found, extract:
- Type: FLIGHT, HOTEL, ACTIVITY, TRANSFER, or CUSTOM
- Start/end dates and times
- Location details (airports, addresses, coordinates if available)
- Confirmation numbers
- Provider information
- Prices (if available)

Return JSON in this exact format:
{
  "segments": [
    {
      "type": "FLIGHT|HOTEL|ACTIVITY|TRANSFER|CUSTOM",
      "status": "CONFIRMED|TENTATIVE",
      "startDatetime": "ISO 8601 date-time",
      "endDatetime": "ISO 8601 date-time",
      "confirmationNumber": "string",
      "bookingReference": "string",
      "provider": { "name": "string", "code": "string" },
      "price": { "amount": number, "currency": "USD" },
      "notes": "string",
      "inferred": false,

      // Flight-specific fields (if type=FLIGHT):
      "airline": { "name": "string", "code": "string" },
      "flightNumber": "string",
      "origin": { "name": "string", "code": "string", "city": "string", "country": "string" },
      "destination": { "name": "string", "code": "string", "city": "string", "country": "string" },
      "departureTerminal": "string",
      "arrivalTerminal": "string",
      "cabinClass": "ECONOMY|PREMIUM_ECONOMY|BUSINESS|FIRST",
      "seatAssignments": {},

      // Hotel-specific fields (if type=HOTEL):
      "property": { "name": "string", "code": "string" },
      "location": { "name": "string", "address": "string", "city": "string", "country": "string" },
      "checkInDate": "ISO 8601 date",
      "checkOutDate": "ISO 8601 date",
      "checkInTime": "HH:MM",
      "checkOutTime": "HH:MM",
      "roomType": "string",
      "roomCount": number,
      "amenities": [],

      // Activity-specific fields (if type=ACTIVITY):
      "name": "string",
      "description": "string",
      "location": { "name": "string", "address": "string", "city": "string", "country": "string" },
      "category": "string",
      "voucherNumber": "string",

      // Transfer-specific fields (if type=TRANSFER):
      "transferType": "TAXI|UBER|RENTAL_CAR|SHUTTLE|TRAIN|BUS",
      "pickupLocation": { "name": "string", "address": "string", "city": "string", "country": "string" },
      "dropoffLocation": { "name": "string", "address": "string", "city": "string", "country": "string" },
      "vehicleDetails": "string"
    }
  ],
  "confidence": 0.0-1.0,
  "summary": "Brief description of what was found",
  "warnings": ["Optional warnings about missing or unclear data"]
}

CRITICAL RULES:
1. ONLY include fields relevant to the segment type
2. startDatetime and endDatetime are REQUIRED for all segments
3. Use ISO 8601 format for dates (YYYY-MM-DD) and datetimes (YYYY-MM-DDTHH:MM:SSZ)
4. Set confidence based on data clarity (0.9+ for clear confirmations, 0.5-0.8 for partial data)
5. If no bookings found, return empty segments array with confidence 0
6. For hotels: checkInDate/checkOutDate should match startDatetime/endDatetime dates
7. Provider name and code are REQUIRED when available
8. Extract ALL prices and confirmation numbers
9. Use "CUSTOM" type for anything that doesn't fit other categories

Examples:
- Flight: Extract airline, flight number, route, times, confirmation
- Hotel: Extract property, location, check-in/out dates, room details, confirmation
- Activity: Extract name, location, date/time, description, confirmation
- Car rental: Use TRANSFER type with transferType="RENTAL_CAR"`;

/**
 * Email Import Service
 * Extracts travel booking details from emails using LLM
 */
export class EmailImportService {
  private client: OpenAI;
  private config: EmailImportConfig;

  constructor(config: EmailImportConfig) {
    this.config = {
      ...config,
      model: config.model || DEFAULT_MODEL,
    };

    // Initialize OpenRouter client
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/itinerizer',
        'X-Title': 'Itinerizer Email Import',
      },
    });
  }

  /**
   * Extract booking details from an email
   * @param email - Email data from inbound.new webhook
   * @returns Result with extracted bookings or validation error
   */
  async extractBookings(email: InboundEmail): Promise<Result<ExtractedBooking, ValidationError>> {
    try {
      // Prepare email content for LLM
      const emailContent = this.formatEmailForExtraction(email);

      // Call LLM to extract bookings
      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          { role: 'system', content: EMAIL_EXTRACTION_PROMPT },
          {
            role: 'user',
            content: `Extract booking details from this email:\n\n${emailContent}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 4096,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        return err(
          createValidationError('INVALID_DATA', 'LLM returned empty response', 'email')
        );
      }

      // Parse LLM response
      const extracted = JSON.parse(result) as ExtractedBooking;

      // Validate the extracted data
      const validationResult = this.validateExtraction(extracted);
      if (!validationResult.success) {
        return validationResult;
      }

      // Add source metadata to segments
      const segmentsWithSource = extracted.segments.map((segment) => ({
        ...segment,
        source: 'import' as const,
        sourceDetails: {
          confidence: extracted.confidence,
          timestamp: new Date(),
          model: this.config.model,
        },
      }));

      return ok({
        ...extracted,
        segments: segmentsWithSource,
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        return err(
          createValidationError('INVALID_DATA', `Failed to parse LLM response: ${error.message}`, 'email')
        );
      }
      return err(
        createValidationError(
          'INVALID_DATA',
          error instanceof Error ? error.message : 'Unknown error during extraction',
          'email'
        )
      );
    }
  }

  /**
   * Format email for LLM extraction
   */
  private formatEmailForExtraction(email: InboundEmail): string {
    const parts = [
      `From: ${email.from.name || ''} <${email.from.address}>`,
      `To: ${email.to.map((t) => `${t.name || ''} <${t.address}>`).join(', ')}`,
      `Subject: ${email.subject}`,
      `Date: ${email.date}`,
      '',
      '--- Email Body ---',
      email.textBody || this.stripHtml(email.htmlBody),
    ];

    if (email.attachments && email.attachments.length > 0) {
      parts.push(
        '',
        '--- Attachments ---',
        email.attachments.map((a) => `${a.filename} (${a.contentType})`).join('\n')
      );
    }

    return parts.join('\n');
  }

  /**
   * Strip HTML tags from HTML body (simple version)
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate extracted booking data
   */
  private validateExtraction(
    extraction: ExtractedBooking
  ): Result<ExtractedBooking, ValidationError> {
    // Check required fields
    if (!extraction.segments || !Array.isArray(extraction.segments)) {
      return err(
        createValidationError('INVALID_DATA', 'Missing or invalid segments array', 'segments')
      );
    }

    if (typeof extraction.confidence !== 'number' || extraction.confidence < 0 || extraction.confidence > 1) {
      return err(
        createValidationError('INVALID_DATA', 'Confidence must be between 0 and 1', 'confidence')
      );
    }

    if (!extraction.summary || typeof extraction.summary !== 'string') {
      return err(
        createValidationError('INVALID_DATA', 'Missing or invalid summary', 'summary')
      );
    }

    // Validate each segment
    for (let i = 0; i < extraction.segments.length; i++) {
      const segment = extraction.segments[i];
      const prefix = `segments[${i}]`;

      // Check required base fields
      if (!segment.type || !Object.values(SegmentType).includes(segment.type)) {
        return err(
          createValidationError('INVALID_DATA', `Invalid segment type: ${segment.type}`, `${prefix}.type`)
        );
      }

      if (!segment.status || !Object.values(SegmentStatus).includes(segment.status)) {
        return err(
          createValidationError('INVALID_DATA', `Invalid segment status: ${segment.status}`, `${prefix}.status`)
        );
      }

      if (!segment.startDatetime) {
        return err(
          createValidationError('INVALID_DATA', 'Missing startDatetime', `${prefix}.startDatetime`)
        );
      }

      if (!segment.endDatetime) {
        return err(
          createValidationError('INVALID_DATA', 'Missing endDatetime', `${prefix}.endDatetime`)
        );
      }

      // Convert date strings to Date objects
      try {
        segment.startDatetime = new Date(segment.startDatetime);
        segment.endDatetime = new Date(segment.endDatetime);

        // Convert hotel dates if present
        if (segment.type === SegmentType.HOTEL) {
          const hotelSegment = segment as any;
          if (hotelSegment.checkInDate) {
            hotelSegment.checkInDate = new Date(hotelSegment.checkInDate);
          }
          if (hotelSegment.checkOutDate) {
            hotelSegment.checkOutDate = new Date(hotelSegment.checkOutDate);
          }
        }
      } catch (error) {
        return err(
          createValidationError('INVALID_DATA', 'Invalid date format', `${prefix}.startDatetime`)
        );
      }

      // Validate dates
      if (segment.startDatetime >= segment.endDatetime) {
        return err(
          createValidationError(
            'CONSTRAINT_VIOLATION',
            'Start datetime must be before end datetime',
            `${prefix}.endDatetime`
          )
        );
      }

      // Type-specific validation
      if (segment.type === SegmentType.FLIGHT) {
        const flightSegment = segment as any;
        if (!flightSegment.airline || !flightSegment.flightNumber) {
          return err(
            createValidationError('INVALID_DATA', 'Flight segments require airline and flightNumber', `${prefix}`)
          );
        }
        if (!flightSegment.origin || !flightSegment.destination) {
          return err(
            createValidationError('INVALID_DATA', 'Flight segments require origin and destination', `${prefix}`)
          );
        }
      }

      if (segment.type === SegmentType.HOTEL) {
        const hotelSegment = segment as any;
        if (!hotelSegment.property || !hotelSegment.location) {
          return err(
            createValidationError('INVALID_DATA', 'Hotel segments require property and location', `${prefix}`)
          );
        }
        if (!hotelSegment.checkInDate || !hotelSegment.checkOutDate) {
          return err(
            createValidationError('INVALID_DATA', 'Hotel segments require checkInDate and checkOutDate', `${prefix}`)
          );
        }
        if (typeof hotelSegment.roomCount !== 'number' || hotelSegment.roomCount < 1) {
          return err(
            createValidationError('INVALID_DATA', 'Hotel segments require roomCount >= 1', `${prefix}.roomCount`)
          );
        }
      }

      if (segment.type === SegmentType.ACTIVITY) {
        const activitySegment = segment as any;
        if (!activitySegment.name || !activitySegment.location) {
          return err(
            createValidationError('INVALID_DATA', 'Activity segments require name and location', `${prefix}`)
          );
        }
      }

      if (segment.type === SegmentType.TRANSFER) {
        const transferSegment = segment as any;
        if (!transferSegment.transferType) {
          return err(
            createValidationError('INVALID_DATA', 'Transfer segments require transferType', `${prefix}`)
          );
        }
        if (!transferSegment.pickupLocation || !transferSegment.dropoffLocation) {
          return err(
            createValidationError('INVALID_DATA', 'Transfer segments require pickup and dropoff locations', `${prefix}`)
          );
        }
      }
    }

    return ok(extraction);
  }
}

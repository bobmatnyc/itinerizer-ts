/**
 * LLM service for OpenRouter API integration
 * @module services/llm
 */

import OpenAI from 'openai';
import { createStorageError, createValidationError } from '../core/errors.js';
import type { StorageError, ValidationError } from '../core/errors.js';
import { err, ok } from '../core/result.js';
import type { Result } from '../core/result.js';
import type { ImportConfig, ModelPricing, TokenUsage } from '../domain/types/import.js';
import { DEFAULT_IMPORT_MODEL, MODEL_PRICING } from '../domain/types/import.js';
import type { Itinerary } from '../domain/types/itinerary.js';
import { generateItineraryId, generateSegmentId } from '../domain/types/branded.js';
import { itinerarySchema } from '../domain/schemas/itinerary.schema.js';

/**
 * LLM response with parsed itinerary
 */
export interface LLMParseResult {
  /** Parsed itinerary */
  itinerary: Itinerary;
  /** Token usage */
  usage: TokenUsage;
  /** Raw response for debugging */
  rawResponse?: string;
}

/**
 * Service for LLM-powered itinerary parsing via OpenRouter
 */
export class LLMService {
  private client: OpenAI;
  private config: ImportConfig;

  /**
   * Creates a new LLM service instance
   * @param config - Import configuration with API key
   */
  constructor(config: ImportConfig) {
    this.config = config;
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/itinerizer',
        'X-Title': 'Itinerizer',
      },
    });
  }

  /**
   * Parse markdown into an itinerary using LLM
   * @param markdown - Structured markdown from MarkdownConverterService
   * @param model - Model to use (default from config)
   * @returns Result with parsed itinerary and usage
   */
  async parseItinerary(
    markdown: string,
    model?: string
  ): Promise<Result<LLMParseResult, StorageError | ValidationError>> {
    const selectedModel = model ?? this.config.defaultModel ?? DEFAULT_IMPORT_MODEL;

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(markdown);

    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: this.config.maxTokens ?? 4096,
        temperature: this.config.temperature ?? 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        return err(
          createStorageError('READ_ERROR', 'LLM returned empty response', {
            model: selectedModel,
          })
        );
      }

      // Calculate usage
      const usage = this.calculateUsage(
        selectedModel,
        response.usage?.prompt_tokens ?? 0,
        response.usage?.completion_tokens ?? 0
      );

      // Parse JSON response
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(content);
      } catch {
        return err(
          createValidationError('INVALID_DATA', 'LLM returned invalid JSON', 'response')
        );
      }

      // Ensure required fields with defaults
      const jsonWithDefaults = this.addDefaults(parsedJson);

      // Validate against schema
      const validationResult = itinerarySchema.safeParse(jsonWithDefaults);

      if (!validationResult.success) {
        return err(
          createValidationError('INVALID_DATA', 'LLM response failed schema validation', 'response', {
            errors: validationResult.error.errors,
            rawResponse: content,
          })
        );
      }

      return ok({
        itinerary: validationResult.data as unknown as Itinerary,
        usage,
        rawResponse: content,
      });
    } catch (error) {
      // Handle API errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          return err(
            createStorageError('VALIDATION_ERROR', 'Invalid API key', {
              model: selectedModel,
            })
          );
        }

        if (error.message.includes('429') || error.message.includes('rate limit')) {
          return err(
            createStorageError('READ_ERROR', 'Rate limit exceeded', {
              model: selectedModel,
              hint: 'Wait and try again',
            })
          );
        }

        if (error.message.includes('timeout')) {
          return err(
            createStorageError('READ_ERROR', 'Request timeout', {
              model: selectedModel,
              durationMs: Date.now() - startTime,
            })
          );
        }
      }

      return err(
        createStorageError('READ_ERROR', 'LLM API request failed', {
          model: selectedModel,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Build the system prompt for itinerary parsing
   * Phase 2: Content cleanup - proper titles, summaries, structured content
   * Phase 3: Geographic continuity validation - detect and fill transportation gaps
   */
  private buildSystemPrompt(): string {
    return `You are a travel itinerary content specialist. Your task is to CLEAN UP and STRUCTURE the pre-categorized markdown into a properly formatted JSON itinerary, ensuring GEOGRAPHIC CONTINUITY between segments.

## Your Role: Content Cleanup & Continuity Validation (Phase 2 & 3)
The input markdown has already been categorized by segment type (flights, hotels, activities, transfers).
Your job is to:
1. Create CLEAR, DESCRIPTIVE titles for each segment
2. Write CONCISE summaries (1 sentence each)
3. Extract and BULLET POINT the key details
4. Infer missing information from context
5. Extract overall trip METADATA
6. **ENSURE GEOGRAPHIC CONTINUITY** - detect and fill transportation gaps

## Output Format
{
  "title": "Descriptive trip title (e.g., 'Family Adventure in Northern Italy')",
  "description": "Brief 2-3 sentence trip overview highlighting key destinations and experiences",
  "startDate": "ISO 8601 datetime",
  "endDate": "ISO 8601 datetime",
  "tripType": "LEISURE" | "BUSINESS" | "BLEISURE",
  "destinations": [{ "name": "Full name", "city": "City", "country": "Country", "type": "CITY|AIRPORT|HOTEL|ATTRACTION|OTHER" }],
  "tags": ["inferred", "from", "content"],
  "segments": [
    // FLIGHT: Clear route title
    {
      "type": "FLIGHT",
      "startDatetime": "ISO datetime",
      "endDatetime": "ISO datetime",
      "travelerIds": [],
      "notes": "Key flight details in sentence form",
      "airline": { "name": "Full Airline Name", "code": "XX" },
      "flightNumber": "XX1234",
      "origin": { "name": "Full Airport Name", "city": "City", "country": "Country", "code": "XXX", "type": "AIRPORT" },
      "destination": { "name": "Full Airport Name", "city": "City", "country": "Country", "code": "XXX", "type": "AIRPORT" },
      "cabin": "ECONOMY|BUSINESS|FIRST" (if mentioned)
    },
    // HOTEL: Property name as title
    {
      "type": "HOTEL",
      "startDatetime": "ISO datetime (check-in 3PM default)",
      "endDatetime": "ISO datetime (check-out 11AM default)",
      "travelerIds": [],
      "notes": "Key hotel highlights",
      "property": { "name": "Full Hotel/Resort Name" },
      "location": { "name": "Street address if known", "city": "City", "country": "Country", "type": "HOTEL" },
      "roomType": "Inferred or explicit room type",
      "checkInDate": "ISO date",
      "checkOutDate": "ISO date"
    },
    // ACTIVITY: Descriptive activity name
    {
      "type": "ACTIVITY",
      "startDatetime": "ISO datetime",
      "endDatetime": "ISO datetime (add 2-4 hours if not specified)",
      "travelerIds": [],
      "name": "Descriptive Activity Title",
      "description": "What the activity involves (1-2 sentences)",
      "notes": "Any special requirements or included items",
      "location": { "name": "Venue/Location name", "city": "City", "country": "Country", "type": "ATTRACTION" }
    },
    // TRANSFER: Route as title
    {
      "type": "TRANSFER",
      "startDatetime": "ISO datetime",
      "endDatetime": "ISO datetime (add 30-60 min if not specified)",
      "travelerIds": [],
      "notes": "Transfer details",
      "transferType": "TAXI|SHUTTLE|PRIVATE|PUBLIC|RIDE_SHARE",
      "pickupLocation": { "name": "Pickup point", "city": "City", "type": "OTHER" },
      "dropoffLocation": { "name": "Dropoff point", "city": "City", "type": "OTHER" }
    }
  ]
}

## Content Cleanup Rules
1. **Titles**: Make segment names descriptive and scannable
   - Flight: "SFO → JFK" or "San Francisco to New York"
   - Hotel: Use full property name
   - Activity: "Morning Wine Tasting at Tuscan Vineyard"
   - Transfer: "Airport Transfer to Hotel"

2. **Summaries**: Write clear notes field with key info
   - Flight: Duration, stops, meal service
   - Hotel: Highlights, view, amenities mentioned
   - Activity: What's included, duration, highlights
   - Transfer: Type, duration, meeting point

3. **Dates**: Use ISO 8601 format with timezone
   - Infer reasonable times if not specified
   - Flights: Use actual times or morning/evening defaults
   - Hotels: Check-in 3PM, check-out 11AM defaults
   - Activities: Morning (9AM), Afternoon (2PM), Evening (7PM)

4. **Metadata Extraction**:
   - Infer trip type from content (family, business, romantic, adventure)
   - Generate relevant tags (luxury, adventure, beach, cultural, etc.)
   - Create meaningful description summarizing the trip

5. **Geographic Continuity** (IMPORTANT):
   After parsing, check for missing transportation between segments:
   - Flight lands at airport → Hotel in city = ADD TRANSFER segment with inferred=true
   - Hotel in City A → Next segment in City B = ADD TRANSFER or FLIGHT with inferred=true
   - Mark any auto-added segments with: "inferred": true, "inferredReason": "Geographic gap between [A] and [B]"

6. Return ONLY valid JSON, no explanation`;
  }

  /**
   * Build the user prompt with markdown content
   */
  private buildUserPrompt(markdown: string): string {
    return `Parse this travel itinerary markdown into JSON:

\`\`\`markdown
${markdown}
\`\`\`

Remember: Return ONLY valid JSON matching the schema, no explanation.`;
  }

  /**
   * Add default values for required fields
   */
  private addDefaults(parsed: unknown): Record<string, unknown> {
    const json = parsed as Record<string, unknown>;

    // Ensure ID is generated
    if (!json.id) {
      json.id = generateItineraryId();
    }

    // Ensure version
    if (!json.version) {
      json.version = 1;
    }

    // Ensure timestamps
    const now = new Date().toISOString();
    if (!json.createdAt) {
      json.createdAt = now;
    }
    if (!json.updatedAt) {
      json.updatedAt = now;
    }

    // Ensure status
    if (!json.status) {
      json.status = 'DRAFT';
    }

    // Ensure arrays
    if (!json.destinations) {
      json.destinations = [];
    }
    if (!json.travelers) {
      json.travelers = [];
    }
    if (!json.segments) {
      json.segments = [];
    }
    if (!json.tags) {
      json.tags = [];
    }
    if (!json.metadata) {
      json.metadata = {};
    }

    // Process segments - ensure IDs and required fields
    if (Array.isArray(json.segments)) {
      json.segments = json.segments.map((segment: unknown) => {
        const seg = segment as Record<string, unknown>;
        if (!seg.id) seg.id = generateSegmentId();
        if (!seg.metadata) seg.metadata = {};
        // Always reset travelerIds to empty array - LLM can't know valid UUIDs
        // Travelers are linked later by the user
        seg.travelerIds = [];

        // Normalize segment type to valid values
        const validTypes = ['FLIGHT', 'HOTEL', 'MEETING', 'ACTIVITY', 'TRANSFER', 'CUSTOM'];
        if (!seg.type || !validTypes.includes(seg.type as string)) {
          // Try to infer type from content
          const segStr = JSON.stringify(seg).toLowerCase();
          if (segStr.includes('flight') || segStr.includes('airline') || seg.flightNumber) {
            seg.type = 'FLIGHT';
          } else if (segStr.includes('hotel') || segStr.includes('check-in') || seg.property) {
            seg.type = 'HOTEL';
          } else if (segStr.includes('transfer') || segStr.includes('pickup') || segStr.includes('dropoff')) {
            seg.type = 'TRANSFER';
          } else if (segStr.includes('meeting') || segStr.includes('conference')) {
            seg.type = 'MEETING';
          } else if (segStr.includes('tour') || segStr.includes('activity') || segStr.includes('visit')) {
            seg.type = 'ACTIVITY';
          } else {
            seg.type = 'CUSTOM';  // Fallback to CUSTOM
          }
        }
        // Normalize type to uppercase
        seg.type = (seg.type as string).toUpperCase();

        // Valid segment statuses: TENTATIVE, CONFIRMED, WAITLISTED, CANCELLED, COMPLETED
        if (!seg.status || !['TENTATIVE', 'CONFIRMED', 'WAITLISTED', 'CANCELLED', 'COMPLETED'].includes(seg.status as string)) {
          seg.status = 'CONFIRMED';
        }
        // Normalize transfer types (LLM might return PRIVATE_CAR instead of PRIVATE)
        if (seg.type === 'TRANSFER' && seg.transferType) {
          const typeMapping: Record<string, string> = {
            'PRIVATE_CAR': 'PRIVATE',
            'PRIVATE_TRANSFER': 'PRIVATE',
            'CAR': 'PRIVATE',
            'TRAIN': 'PUBLIC',
            'BUS': 'PUBLIC',
            'FERRY': 'PUBLIC',
            'OTHER': 'PUBLIC',
          };
          const mapped = typeMapping[seg.transferType as string];
          if (mapped) seg.transferType = mapped;
        }

        // Ensure datetime fields are valid
        if (seg.startDatetime && seg.endDatetime) {
          const start = new Date(seg.startDatetime as string);
          const end = new Date(seg.endDatetime as string);
          // If end is before start, add 2 hours to start for a reasonable end time
          if (end <= start) {
            const newEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);
            seg.endDatetime = newEnd.toISOString();
          }
        }

        // Ensure location objects have required name field
        const ensureLocationName = (loc: unknown) => {
          if (loc && typeof loc === 'object') {
            const location = loc as Record<string, unknown>;
            if (!location.name) location.name = 'Unknown';
          }
        };
        ensureLocationName(seg.origin);
        ensureLocationName(seg.destination);
        ensureLocationName(seg.location);
        ensureLocationName(seg.pickupLocation);
        ensureLocationName(seg.dropoffLocation);

        // Ensure required location field for ACTIVITY, HOTEL, MEETING segments
        if (['ACTIVITY', 'HOTEL', 'MEETING'].includes(seg.type as string)) {
          if (!seg.location || typeof seg.location !== 'object') {
            // Try to infer location from segment name or other fields
            const property = seg.property as Record<string, unknown> | undefined;
            const segName = (seg.name || seg.title || property?.name || 'Unknown') as string;
            seg.location = { name: segName, type: 'OTHER' };
          }
        }

        // Ensure TRANSFER has pickupLocation and dropoffLocation
        if (seg.type === 'TRANSFER') {
          if (!seg.pickupLocation || typeof seg.pickupLocation !== 'object') {
            seg.pickupLocation = { name: 'Pickup Point', type: 'OTHER' };
          }
          if (!seg.dropoffLocation || typeof seg.dropoffLocation !== 'object') {
            seg.dropoffLocation = { name: 'Dropoff Point', type: 'OTHER' };
          }
          // Ensure transferType has a valid value
          if (!seg.transferType) {
            seg.transferType = 'PRIVATE';
          }
        }

        // Ensure CUSTOM has required title field
        if (seg.type === 'CUSTOM') {
          if (!seg.title) {
            seg.title = (seg.name || seg.description || 'Custom Segment') as string;
          }
        }

        // Ensure ACTIVITY has required name field
        if (seg.type === 'ACTIVITY') {
          if (!seg.name) {
            seg.name = (seg.title || seg.description || 'Activity') as string;
          }
        }

        // Ensure MEETING has required title field
        if (seg.type === 'MEETING') {
          if (!seg.title) {
            seg.title = (seg.name || seg.description || 'Meeting') as string;
          }
        }

        // Handle flight segments with missing required fields
        if (seg.type === 'FLIGHT') {
          // Ensure airline object exists with defaults
          if (!seg.airline || typeof seg.airline !== 'object') {
            seg.airline = { name: 'Unknown', code: 'XX' };
          } else {
            const airline = seg.airline as Record<string, unknown>;
            if (!airline.name) airline.name = 'Unknown';
            if (!airline.code) airline.code = 'XX';
          }
          // Ensure flight number exists and normalize format
          if (!seg.flightNumber) {
            seg.flightNumber = 'XX0000';
          } else {
            // Normalize flight number: remove spaces/dashes, uppercase, ensure format
            let normalized = String(seg.flightNumber).replace(/[\s\-]/g, '').toUpperCase();
            // If it doesn't match the expected pattern, try to fix it
            if (!/^[A-Z0-9]{2,3}\d{1,4}$/.test(normalized)) {
              // Try to extract airline code and flight number
              const match = normalized.match(/^([A-Z]{1,3})?\s*(\d{1,4})/);
              if (match) {
                const code = match[1] || 'XX';
                const num = match[2] || '0000';
                normalized = code + num;
              } else {
                // Fallback to placeholder
                normalized = 'XX0000';
              }
            }
            seg.flightNumber = normalized;
          }
          // Ensure origin/destination have required code field
          if (seg.origin && typeof seg.origin === 'object') {
            const origin = seg.origin as Record<string, unknown>;
            if (!origin.code) origin.code = 'XXX';
          }
          if (seg.destination && typeof seg.destination === 'object') {
            const dest = seg.destination as Record<string, unknown>;
            if (!dest.code) dest.code = 'XXX';
          }
        }
        return seg;
      });
    }

    return json;
  }

  /**
   * Calculate token usage and cost
   */
  private calculateUsage(model: string, inputTokens: number, outputTokens: number): TokenUsage {
    const pricing = MODEL_PRICING[model] ?? this.getDefaultPricing(model);

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;

    return {
      model,
      inputTokens,
      outputTokens,
      costUSD: inputCost + outputCost,
      timestamp: new Date(),
    };
  }

  /**
   * Get default pricing for unknown models
   */
  private getDefaultPricing(model: string): ModelPricing {
    // Assume mid-range pricing for unknown models
    return {
      model,
      inputPerMillion: 0.5,
      outputPerMillion: 1.5,
    };
  }

  /**
   * Test connection with a simple request
   */
  async testConnection(): Promise<Result<boolean, StorageError>> {
    try {
      await this.client.chat.completions.create({
        model: this.config.defaultModel ?? DEFAULT_IMPORT_MODEL,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });
      return ok(true);
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', 'Failed to connect to OpenRouter', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Get list of available models for testing
   */
  getAvailableModels(): string[] {
    return Object.keys(MODEL_PRICING);
  }
}

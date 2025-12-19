/**
 * Travel Agent Service - uses SerpAPI to find real travel options
 * @module services/travel-agent
 */

import type { SerpApiConfig } from '../domain/types/import.js';
import type { Segment, FlightSegment, HotelSegment, TransferSegment } from '../domain/types/segment.js';
import type { LocationGap } from './segment-continuity.service.js';
import { GapType } from './segment-continuity.service.js';
import { SegmentType, SegmentStatus, CabinClass, TransferType } from '../domain/types/common.js';
import { generateSegmentId } from '../domain/types/branded.js';
import { isFlightSegment, isHotelSegment } from '../domain/types/segment.js';
import type { AgentMode, AgentModeConfig } from '../domain/types/agent.js';
import { DEFAULT_AGENT_MODE } from '../domain/types/agent.js';
import type { TripProfile } from '../domain/types/trip-taxonomy.js';
import { inferTripProfile } from '../domain/types/trip-taxonomy.js';
import type { Itinerary } from '../domain/types/itinerary.js';

/**
 * Travel class preferences inferred from existing segments
 */
export interface TravelPreferences {
  /** Preferred cabin class for flights */
  cabinClass: CabinClass;
  /** Preferred hotel star rating (1-5) */
  hotelStarRating: number;
  /** Budget tier (economy, premium, luxury) */
  budgetTier: 'economy' | 'premium' | 'luxury';
}

/**
 * Result of a travel search operation
 */
export interface TravelSearchResult {
  /** Whether a suitable option was found */
  found: boolean;
  /** Ready-to-use segment if found */
  segment?: Segment;
  /** Search query that was used */
  searchQuery?: string;
  /** Alternative options found */
  alternatives?: Array<{
    description: string;
    price?: number;
    url?: string;
  }>;
  /** Error message if search failed */
  error?: string;
}

/**
 * SerpAPI flight search response (simplified)
 */
interface SerpApiFlightResponse {
  search_metadata?: {
    status?: string;
  };
  best_flights?: Array<{
    flights: Array<{
      departure_airport: { id: string; name: string };
      arrival_airport: { id: string; name: string };
      airline: string;
      airline_logo?: string;
      flight_number?: string;
      departure_time: string;
      arrival_time: string;
      duration: number;
      airplane?: string;
      travel_class?: string;
    }>;
    price?: number;
    type?: string;
  }>;
  other_flights?: Array<{
    flights: Array<{
      departure_airport: { id: string; name: string };
      arrival_airport: { id: string; name: string };
      airline: string;
      flight_number?: string;
      departure_time: string;
      arrival_time: string;
      duration: number;
      travel_class?: string;
    }>;
    price?: number;
  }>;
  error?: string;
}

/**
 * SerpAPI hotel search response (simplified)
 */
interface SerpApiHotelResponse {
  search_metadata?: {
    status?: string;
  };
  properties?: Array<{
    name: string;
    description?: string;
    gps_coordinates?: { latitude: number; longitude: number };
    check_in_time?: string;
    check_out_time?: string;
    rate_per_night?: { lowest?: string; extracted_lowest?: number };
    overall_rating?: number;
    reviews?: number;
    hotel_class?: string;
    link?: string;
    nearby_places?: Array<{ name: string }>;
  }>;
  error?: string;
}

/**
 * Thinking models for advanced reasoning in travel planning
 */
const THINKING_MODELS = [
  'anthropic/claude-sonnet-4-20250514',      // Claude Sonnet 4
  'openai/gpt-4o',                           // GPT-4o
  'openai/o1-preview',                       // O1 reasoning
  'google/gemini-2.0-flash-thinking-exp',    // Gemini thinking
  'deepseek/deepseek-r1',                    // DeepSeek reasoning
] as const;

/**
 * Travel agent configuration
 */
export interface TravelAgentConfig extends SerpApiConfig {
  /** Thinking model to use for advanced reasoning */
  thinkingModel?: string;
  /** Agent mode configuration */
  modeConfig?: AgentModeConfig;
}

/**
 * Plausibility check result
 */
export interface PlausibilityResult {
  /** Whether the segment is plausible */
  plausible: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for the plausibility assessment */
  reason: string;
  /** SerpAPI search query used (if applicable) */
  searchQuery?: string;
}

/**
 * Service for intelligently finding real travel options using SerpAPI
 */
export class TravelAgentService {
  private readonly baseUrl = 'https://serpapi.com/search';
  private readonly apiKey: string;
  private mode: AgentMode;
  private thinkingModel: string;
  private modeConfig?: AgentModeConfig;

  /**
   * Creates a new travel agent service
   * @param config - Travel agent configuration
   */
  constructor(config: TravelAgentConfig) {
    this.apiKey = config.apiKey;
    this.mode = config.modeConfig?.mode || DEFAULT_AGENT_MODE;
    this.thinkingModel = config.thinkingModel || THINKING_MODELS[0];
    this.modeConfig = config.modeConfig;
  }

  /**
   * Set the operating mode
   * @param mode - Agent mode to use
   */
  setMode(mode: AgentMode): void {
    this.mode = mode;
  }

  /**
   * Get the current operating mode
   */
  getMode(): AgentMode {
    return this.mode;
  }

  /**
   * Set the thinking model
   * @param model - Model identifier to use
   */
  setThinkingModel(model: string): void {
    this.thinkingModel = model;
  }

  /**
   * Get available thinking models
   */
  static getThinkingModels(): readonly string[] {
    return THINKING_MODELS;
  }

  /**
   * Infer preferred travel class from existing flight segments
   * @param segments - Array of segments to analyze
   * @returns Inferred cabin class
   */
  inferTravelClass(segments: Segment[]): CabinClass {
    const flights = segments.filter(isFlightSegment);

    if (flights.length === 0) {
      return CabinClass.ECONOMY; // Default to economy
    }

    // Count cabin class occurrences
    const classCounts: Record<string, number> = {};
    for (const flight of flights) {
      if (flight.cabinClass) {
        classCounts[flight.cabinClass] = (classCounts[flight.cabinClass] || 0) + 1;
      }
    }

    // Return most common class, or economy if none specified
    if (Object.keys(classCounts).length === 0) {
      return CabinClass.ECONOMY;
    }

    const mostCommon = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0];
    return (mostCommon?.[0] as CabinClass) ?? CabinClass.ECONOMY;
  }

  /**
   * Infer preferred hotel tier from existing hotel segments
   * @param segments - Array of segments to analyze
   * @returns Star rating (1-5)
   */
  inferHotelTier(segments: Segment[]): number {
    const hotels = segments.filter(isHotelSegment);

    if (hotels.length === 0) {
      return 3; // Default to 3-star
    }

    // Try to infer from property names (e.g., "Four Seasons" = 5-star)
    const luxuryBrands = ['four seasons', 'ritz carlton', 'st regis', 'peninsula', 'mandarin oriental'];
    const premiumBrands = ['marriott', 'hilton', 'hyatt', 'intercontinental', 'westin'];

    for (const hotel of hotels) {
      const propertyName = hotel.property.name.toLowerCase();
      if (luxuryBrands.some((brand) => propertyName.includes(brand))) {
        return 5;
      }
      if (premiumBrands.some((brand) => propertyName.includes(brand))) {
        return 4;
      }
    }

    return 3; // Default to mid-tier
  }

  /**
   * Infer travel preferences from existing segments
   * @param segments - Array of segments to analyze
   * @returns Inferred preferences
   */
  inferPreferences(segments: Segment[]): TravelPreferences {
    const cabinClass = this.inferTravelClass(segments);
    const hotelStarRating = this.inferHotelTier(segments);

    // Determine budget tier
    let budgetTier: 'economy' | 'premium' | 'luxury' = 'economy';
    if (cabinClass === CabinClass.BUSINESS || cabinClass === CabinClass.FIRST || hotelStarRating >= 5) {
      budgetTier = 'luxury';
    } else if (cabinClass === CabinClass.PREMIUM_ECONOMY || hotelStarRating >= 4) {
      budgetTier = 'premium';
    }

    return {
      cabinClass,
      hotelStarRating,
      budgetTier,
    };
  }

  /**
   * Search for flights using SerpAPI Google Flights
   * @param gap - Geographic gap to fill
   * @param preferences - Travel preferences
   * @returns Search result with flight segment
   */
  async searchFlight(gap: LocationGap, preferences: TravelPreferences): Promise<TravelSearchResult> {
    try {
      const { endLocation, startLocation, beforeSegment } = gap;

      // Extract IATA codes or use location names
      const departureId = endLocation?.code || this.guessIataCode(endLocation?.name);
      const arrivalId = startLocation?.code || this.guessIataCode(startLocation?.name);

      if (!departureId || !arrivalId) {
        return {
          found: false,
          error: 'Could not determine airport codes for flight search',
        };
      }

      // Format date (day after beforeSegment ends)
      const departureDate = new Date(beforeSegment.endDatetime);
      departureDate.setDate(departureDate.getDate() + 1);
      const formattedDate = departureDate.toISOString().split('T')[0];

      // Build search query
      const params = new URLSearchParams({
        engine: 'google_flights',
        departure_id: departureId,
        arrival_id: arrivalId,
        outbound_date: formattedDate ?? '',
        type: '1', // One-way
        currency: 'USD',
        hl: 'en',
        api_key: this.apiKey,
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        return {
          found: false,
          error: `SerpAPI request failed: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as SerpApiFlightResponse;

      if (data.error) {
        return {
          found: false,
          error: `SerpAPI error: ${data.error}`,
        };
      }

      // Extract best flight
      const bestFlight = data.best_flights?.[0] || data.other_flights?.[0];
      if (!bestFlight || !bestFlight.flights?.[0]) {
        return {
          found: false,
          searchQuery: url,
          error: 'No flights found for this route',
        };
      }

      const flight = bestFlight.flights[0];
      if (!flight) {
        return {
          found: false,
          searchQuery: url,
          error: 'No flight details available',
        };
      }

      // Create flight segment
      const segment = this.createFlightSegment(flight, bestFlight.price, gap);

      // Collect alternatives
      const alternatives =
        data.other_flights?.slice(0, 3).map((f) => ({
          description: `${f.flights[0]?.airline} - ${f.flights[0]?.departure_time} to ${f.flights[0]?.arrival_time}`,
          price: f.price,
        })) || [];

      return {
        found: true,
        segment,
        searchQuery: url,
        alternatives,
      };
    } catch (error) {
      return {
        found: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Search for hotels using SerpAPI Google Hotels
   * @param location - Location to search
   * @param checkInDate - Check-in date
   * @param checkOutDate - Check-out date
   * @param preferences - Travel preferences
   * @returns Search result with hotel segment
   */
  async searchHotel(
    location: { name: string; code?: string; address?: { city?: string; country?: string } },
    checkInDate: Date,
    checkOutDate: Date,
    preferences: TravelPreferences,
  ): Promise<TravelSearchResult> {
    try {
      // Build search query (use city name or location name)
      const searchLocation = location.address?.city || location.name;

      const params = new URLSearchParams({
        engine: 'google_hotels',
        q: searchLocation,
        check_in_date: checkInDate.toISOString().split('T')[0] ?? '',
        check_out_date: checkOutDate.toISOString().split('T')[0] ?? '',
        currency: 'USD',
        hl: 'en',
        api_key: this.apiKey,
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        return {
          found: false,
          error: `SerpAPI request failed: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as SerpApiHotelResponse;

      if (data.error) {
        return {
          found: false,
          error: `SerpAPI error: ${data.error}`,
        };
      }

      // Filter by star rating preference
      const suitableHotels =
        data.properties?.filter((hotel) => {
          const hotelClass = Number.parseInt(hotel.hotel_class || '3');
          return hotelClass >= preferences.hotelStarRating - 1 && hotelClass <= preferences.hotelStarRating + 1;
        }) || [];

      if (suitableHotels.length === 0) {
        return {
          found: false,
          searchQuery: url,
          error: 'No suitable hotels found',
        };
      }

      // Pick best hotel (highest rating)
      const bestHotel = suitableHotels.sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))[0];

      if (!bestHotel) {
        return {
          found: false,
          searchQuery: url,
          error: 'No hotel details available',
        };
      }

      // Create hotel segment
      const segment = this.createHotelSegment(bestHotel, checkInDate, checkOutDate, location);

      // Collect alternatives
      const alternatives = suitableHotels.slice(0, 3).map((h) => ({
        description: `${h.name} - ${h.overall_rating || 'N/A'} stars - ${h.rate_per_night?.lowest || 'N/A'}`,
        price: h.rate_per_night?.extracted_lowest,
        url: h.link,
      }));

      return {
        found: true,
        segment,
        searchQuery: url,
        alternatives,
      };
    } catch (error) {
      return {
        found: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Search for ground transportation using SerpAPI local search
   * @param gap - Geographic gap to fill
   * @param preferences - Travel preferences
   * @returns Search result with transfer segment
   */
  async searchTransfer(gap: LocationGap, preferences: TravelPreferences): Promise<TravelSearchResult> {
    try {
      const { endLocation, startLocation, beforeSegment, afterSegment } = gap;

      // For local transfers, create a basic transfer segment
      // (SerpAPI local search is less structured for transfers)
      const transferType = this.determineTransferType(gap, preferences);

      const segment: TransferSegment = {
        id: generateSegmentId(),
        type: SegmentType.TRANSFER,
        status: SegmentStatus.TENTATIVE,
        startDatetime: new Date(beforeSegment.endDatetime.getTime() + 30 * 60 * 1000), // 30 mins after previous
        endDatetime: new Date(afterSegment.startDatetime.getTime() - 15 * 60 * 1000), // 15 mins before next
        travelerIds: [],
        source: 'agent',
        sourceDetails: {
          mode: this.mode,
          confidence: this.mode === 'dream' ? 0.6 : 0.8,
          timestamp: new Date(),
        },
        transferType,
        pickupLocation: {
          name: endLocation?.name || 'Unknown Pickup',
          code: endLocation?.code,
          address: endLocation?.address,
        },
        dropoffLocation: {
          name: startLocation?.name || 'Unknown Dropoff',
          code: startLocation?.code,
          address: startLocation?.address,
        },
        notes: `${transferType} transfer - Found via intelligent gap filling`,
        metadata: {
          source: 'travel-agent-service',
          gapType: gap.gapType,
        },
        inferred: true,
        inferredReason: gap.description,
      };

      return {
        found: true,
        segment,
        searchQuery: 'Local transfer (created from context)',
      };
    } catch (error) {
      return {
        found: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Intelligently fill a gap based on context
   * @param gap - Geographic gap to fill
   * @param existingSegments - All segments in the itinerary
   * @returns Search result with appropriate segment
   */
  async fillGapIntelligently(gap: LocationGap, existingSegments: Segment[]): Promise<TravelSearchResult> {
    // Infer preferences from existing segments
    const preferences = this.inferPreferences(existingSegments);

    // Determine what type of segment to create based on mode
    if (this.mode === 'dream') {
      // Dream mode: Create plausible segments without verification
      if (gap.suggestedType === 'FLIGHT') {
        return this.searchFlight(gap, preferences);
      }
      return this.searchTransfer(gap, preferences);
    } else if (this.mode === 'plan') {
      // Plan mode: Use real schedules and availability
      if (gap.suggestedType === 'FLIGHT') {
        return this.searchFlight(gap, preferences);
      }
      return this.searchTransfer(gap, preferences);
    } else {
      // Book mode: Real-time availability and booking links (TBD)
      if (gap.suggestedType === 'FLIGHT') {
        return this.searchFlight(gap, preferences);
      }
      return this.searchTransfer(gap, preferences);
    }
  }

  /**
   * Complete a partial trip by filling gaps and optimizing flow
   * @param partialItinerary - Partial itinerary with possible gaps
   * @param profile - Trip profile for intelligent planning
   * @returns Completed itinerary
   */
  async completeTrip(
    partialItinerary: Itinerary,
    profile?: TripProfile
  ): Promise<Itinerary> {
    // Infer profile if not provided
    const tripProfile = profile || inferTripProfile(partialItinerary.segments);

    // TODO: Implement intelligent trip completion using thinking model
    // This would use the LLM to:
    // 1. Analyze the partial itinerary
    // 2. Identify missing segments (meals, transportation, activities)
    // 3. Generate suggestions based on trip profile
    // 4. Fill gaps with appropriate segments

    return partialItinerary;
  }

  /**
   * Optimize itinerary for better flow and experience
   * @param itinerary - Itinerary to optimize
   * @param profile - Trip profile for optimization criteria
   * @returns Optimized itinerary
   */
  async optimizeItinerary(
    itinerary: Itinerary,
    profile?: TripProfile
  ): Promise<Itinerary> {
    // Infer profile if not provided
    const tripProfile = profile || inferTripProfile(itinerary.segments);

    // TODO: Implement intelligent optimization using thinking model
    // This would use the LLM to:
    // 1. Analyze segment ordering
    // 2. Suggest reordering for better flow
    // 3. Minimize transit time
    // 4. Balance activities based on trip type

    return itinerary;
  }

  /**
   * Check plausibility of a segment using SerpAPI
   * @param segment - Segment to check
   * @returns Plausibility result
   */
  async checkPlausibility(segment: Segment): Promise<PlausibilityResult> {
    // Only check plausibility in dream mode
    if (this.mode !== 'dream') {
      return {
        plausible: true,
        confidence: 1.0,
        reason: 'Plausibility check not applicable in plan/book mode',
      };
    }

    // Check based on segment type
    if (isFlightSegment(segment)) {
      return this.checkFlightPlausibility(segment);
    }

    // For other segments, assume plausible in dream mode
    return {
      plausible: true,
      confidence: 0.8,
      reason: 'Segment assumed plausible based on basic validation',
    };
  }

  /**
   * Check flight plausibility using SerpAPI
   */
  private async checkFlightPlausibility(flight: FlightSegment): Promise<PlausibilityResult> {
    try {
      // Build search query
      const params = new URLSearchParams({
        engine: 'google_flights',
        departure_id: flight.origin.code || 'XXX',
        arrival_id: flight.destination.code || 'XXX',
        outbound_date: flight.startDatetime.toISOString().split('T')[0] ?? '',
        type: '1',
        currency: 'USD',
        hl: 'en',
        api_key: this.apiKey,
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        return {
          plausible: false,
          confidence: 0.5,
          reason: 'Unable to verify flight availability',
          searchQuery: url,
        };
      }

      const data = (await response.json()) as SerpApiFlightResponse;

      // Check if any flights exist for this route
      const hasFlights = (data.best_flights && data.best_flights.length > 0) ||
                        (data.other_flights && data.other_flights.length > 0);

      if (hasFlights) {
        return {
          plausible: true,
          confidence: 0.9,
          reason: 'Flight route exists in Google Flights database',
          searchQuery: url,
        };
      }

      return {
        plausible: false,
        confidence: 0.3,
        reason: 'No flights found for this route and date',
        searchQuery: url,
      };
    } catch (error) {
      return {
        plausible: false,
        confidence: 0.5,
        reason: `Plausibility check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create a flight segment from SerpAPI data
   */
  private createFlightSegment(
    flight: {
      departure_airport: { id: string; name: string };
      arrival_airport: { id: string; name: string };
      airline: string;
      flight_number?: string;
      departure_time: string;
      arrival_time: string;
      duration: number;
      airplane?: string;
      travel_class?: string;
    },
    price: number | undefined,
    gap: LocationGap,
  ): FlightSegment {
    // Parse timestamps
    const departureTime = new Date(flight.departure_time);
    const arrivalTime = new Date(flight.arrival_time);

    // Extract airline code from flight number (e.g., "AA100" -> "AA")
    const airlineCode = flight.flight_number?.match(/^([A-Z]{2})/)?.[1] || 'XX';

    return {
      id: generateSegmentId(),
      type: SegmentType.FLIGHT,
      status: SegmentStatus.TENTATIVE,
      startDatetime: departureTime,
      endDatetime: arrivalTime,
      travelerIds: [],
      source: 'agent',
      sourceDetails: {
        mode: this.mode,
        searchQuery: `SerpAPI Google Flights: ${flight.departure_airport.id} → ${flight.arrival_airport.id}`,
        confidence: this.mode === 'plan' ? 0.9 : 0.7,
        timestamp: new Date(),
      },
      airline: {
        name: flight.airline,
        code: airlineCode,
      },
      flightNumber: flight.flight_number || 'TBD',
      origin: {
        name: flight.departure_airport.name,
        code: flight.departure_airport.id,
      },
      destination: {
        name: flight.arrival_airport.name,
        code: flight.arrival_airport.id,
      },
      aircraft: flight.airplane,
      cabinClass: this.mapTravelClass(flight.travel_class),
      durationMinutes: flight.duration,
      price: price
        ? {
            amount: price,
            currency: 'USD',
          }
        : undefined,
      notes: 'Found via SerpAPI Google Flights - Please verify and book',
      metadata: {
        source: 'serpapi-google-flights',
        gapType: gap.gapType,
      },
      inferred: true,
      inferredReason: gap.description,
    };
  }

  /**
   * Create a hotel segment from SerpAPI data
   */
  private createHotelSegment(
    hotel: {
      name: string;
      description?: string;
      gps_coordinates?: { latitude: number; longitude: number };
      check_in_time?: string;
      check_out_time?: string;
      rate_per_night?: { lowest?: string; extracted_lowest?: number };
      overall_rating?: number;
      hotel_class?: string;
      link?: string;
    },
    checkInDate: Date,
    checkOutDate: Date,
    location: { name: string; code?: string; address?: { city?: string; country?: string } },
  ): HotelSegment {
    // Calculate check-in and check-out datetimes
    const checkInTime = hotel.check_in_time || '15:00';
    const checkOutTime = hotel.check_out_time || '11:00';

    const checkInDatetime = new Date(checkInDate);
    const [checkInHour, checkInMin] = checkInTime.split(':').map(Number);
    checkInDatetime.setHours(checkInHour || 15, checkInMin || 0, 0, 0);

    const checkOutDatetime = new Date(checkOutDate);
    const [checkOutHour, checkOutMin] = checkOutTime.split(':').map(Number);
    checkOutDatetime.setHours(checkOutHour || 11, checkOutMin || 0, 0, 0);

    // Calculate nights
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice =
      hotel.rate_per_night?.extracted_lowest !== undefined ? hotel.rate_per_night.extracted_lowest * nights : undefined;

    return {
      id: generateSegmentId(),
      type: SegmentType.HOTEL,
      status: SegmentStatus.TENTATIVE,
      startDatetime: checkInDatetime,
      endDatetime: checkOutDatetime,
      travelerIds: [],
      source: 'agent',
      sourceDetails: {
        mode: this.mode,
        searchQuery: `SerpAPI Google Hotels: ${location.address?.city || location.name}`,
        confidence: this.mode === 'plan' ? 0.85 : 0.65,
        timestamp: new Date(),
      },
      property: {
        name: hotel.name,
        ...(hotel.link ? { website: hotel.link } : {}),
      },
      location: {
        name: hotel.name,
        address: location.address,
        coordinates: hotel.gps_coordinates,
      },
      checkInDate,
      checkOutDate,
      checkInTime,
      checkOutTime,
      roomCount: 1,
      amenities: [],
      price: totalPrice
        ? {
            amount: totalPrice,
            currency: 'USD',
          }
        : undefined,
      notes: `Found via SerpAPI Google Hotels - ${hotel.overall_rating || 'N/A'} stars - Please verify and book`,
      metadata: {
        source: 'serpapi-google-hotels',
        starRating: hotel.hotel_class,
        rating: hotel.overall_rating,
      },
      inferred: true,
      inferredReason: `Auto-filled hotel accommodation in ${location.address?.city || location.name}`,
    };
  }

  /**
   * Map SerpAPI travel class to our CabinClass enum
   */
  private mapTravelClass(travelClass?: string): CabinClass | undefined {
    if (!travelClass) return undefined;

    const normalized = travelClass.toLowerCase();
    if (normalized.includes('first')) return CabinClass.FIRST;
    if (normalized.includes('business')) return CabinClass.BUSINESS;
    if (normalized.includes('premium')) return CabinClass.PREMIUM_ECONOMY;
    return CabinClass.ECONOMY;
  }

  /**
   * Determine appropriate transfer type based on gap and preferences
   */
  private determineTransferType(gap: LocationGap, preferences: TravelPreferences): TransferType {
    // Luxury tier prefers private transfers
    if (preferences.budgetTier === 'luxury') {
      return TransferType.PRIVATE;
    }

    // Airport transfers usually use shuttle or private
    const isAirportTransfer =
      gap.endLocation?.code !== undefined || gap.startLocation?.code !== undefined;

    if (isAirportTransfer) {
      return preferences.budgetTier === 'premium' ? TransferType.PRIVATE : TransferType.SHUTTLE;
    }

    // Local city transfers
    return TransferType.TAXI;
  }

  /**
   * Guess IATA airport code from location name
   * (Basic heuristic - in production, use a proper airport database)
   */
  private guessIataCode(locationName: string | undefined): string | undefined {
    if (!locationName) return undefined;

    // Extract code from name like "JFK Airport" or "New York (JFK)"
    const codeMatch = locationName.match(/\(([A-Z]{3})\)/) || locationName.match(/^([A-Z]{3})\b/);

    return codeMatch?.[1];
  }
}

/**
 * Geocoding and Geography service using Nominatim (OpenStreetMap)
 * Rate limited to 1 request/second per Nominatim usage policy
 * @module services/geocoding
 */

import type { Location } from '../domain/types/location.js';

/**
 * Result from geocoding API
 */
export interface GeocodingResult {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Full formatted address from geocoder */
  displayName: string;
  /** Confidence score (0-100) based on result importance */
  confidence: number;
}

/**
 * Distance result between two points
 */
export interface DistanceResult {
  /** Distance in kilometers */
  kilometers: number;
  /** Distance in miles */
  miles: number;
  /** Estimated driving time in minutes (rough estimate) */
  estimatedDrivingMinutes: number;
  /** Estimated flight time in minutes (rough estimate) */
  estimatedFlightMinutes: number;
}

/**
 * Route waypoint with coordinates
 */
export interface RouteWaypoint {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Route result for visualization
 */
export interface RouteResult {
  waypoints: RouteWaypoint[];
  totalDistanceKm: number;
  totalDistanceMiles: number;
  segments: Array<{
    from: string;
    to: string;
    distanceKm: number;
    estimatedMinutes: number;
  }>;
}

/**
 * Geocoding service using Nominatim (OpenStreetMap)
 *
 * Features:
 * - Free, no API key required
 * - Respects 1 request/second rate limit
 * - Batch geocoding support
 * - Configurable user agent
 *
 * Usage Policy:
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';
  private readonly userAgent = 'Itinerizer/1.0 (travel itinerary app)';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second per Nominatim policy

  /**
   * Geocode a location string to coordinates
   * @param query - Location to geocode (e.g., "JFK Airport, New York" or "Marriott Times Square")
   * @returns Geocoding result or null if not found
   */
  async geocode(query: string): Promise<GeocodingResult | null> {
    if (!query.trim()) {
      return null;
    }

    // Rate limit: 1 request per second
    await this.rateLimit();

    const url = new URL(this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        console.warn(`Geocoding failed for "${query}": ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        console.debug(`No geocoding results for "${query}"`);
        return null;
      }

      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
        confidence: this.calculateConfidence(result),
      };
    } catch (error) {
      console.error(`Geocoding error for "${query}":`, error);
      return null;
    }
  }

  /**
   * Geocode multiple locations with batching
   * @param queries - Array of location queries
   * @returns Map of query to geocoding result (null if not found)
   */
  async geocodeBatch(queries: string[]): Promise<Map<string, GeocodingResult | null>> {
    const results = new Map<string, GeocodingResult | null>();

    // Remove duplicates while preserving order
    const uniqueQueries = Array.from(new Set(queries));

    for (const query of uniqueQueries) {
      const result = await this.geocode(query);
      results.set(query, result);
    }

    return results;
  }

  /**
   * Geocode a Location object by building query from available fields
   * @param location - Location to geocode
   * @returns Geocoding result or null if not found
   */
  async geocodeLocation(location: Location): Promise<GeocodingResult | null> {
    const query = this.buildLocationQuery(location);
    if (!query) {
      return null;
    }
    return this.geocode(query);
  }

  /**
   * Build geocoding query string from Location object
   * @param location - Location object
   * @returns Query string or empty string if insufficient data
   */
  buildLocationQuery(location: Location): string {
    const parts: string[] = [];

    // Add location name (hotel, airport, etc.)
    if (location.name) {
      parts.push(location.name);
    }

    // Add address components if available
    if (location.address) {
      const { city, state, country } = location.address;
      if (city) parts.push(city);
      if (state) parts.push(state);
      if (country) parts.push(country);
    }

    // If no useful information, return empty string
    if (parts.length === 0) {
      return '';
    }

    return parts.join(', ');
  }

  /**
   * Rate limit requests to respect Nominatim usage policy
   * Ensures at least 1 second between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Calculate confidence score from Nominatim result
   * @param result - Raw Nominatim result
   * @returns Confidence score (0-100)
   */
  private calculateConfidence(result: any): number {
    // Nominatim returns "importance" (0-1) based on Wikipedia importance
    const importance = parseFloat(result.importance) || 0;

    // Also consider result type (e.g., exact match vs. approximate)
    let typeBoost = 0;
    const resultType = result.type?.toLowerCase() || '';

    // Higher confidence for specific place types
    if (
      resultType.includes('airport') ||
      resultType.includes('hotel') ||
      resultType.includes('building') ||
      resultType.includes('museum')
    ) {
      typeBoost = 0.1;
    }

    // Combine importance and type boost
    const score = Math.min(1, importance + typeBoost);

    // Convert to 0-100 scale
    return Math.round(score * 100);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param lat1 - Latitude of first point
   * @param lon1 - Longitude of first point
   * @param lat2 - Latitude of second point
   * @param lon2 - Longitude of second point
   * @returns Distance result with km, miles, and time estimates
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): DistanceResult {
    const R = 6371; // Earth's radius in kilometers

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const kilometers = R * c;
    const miles = kilometers * 0.621371;

    // Rough estimates for travel time
    // Driving: ~80 km/h average (accounting for traffic, stops)
    // Flying: ~800 km/h average (accounting for takeoff, landing)
    const estimatedDrivingMinutes = Math.round((kilometers / 80) * 60);
    const estimatedFlightMinutes = Math.round((kilometers / 800) * 60) + 60; // +60 for airport time

    return {
      kilometers: Math.round(kilometers * 10) / 10,
      miles: Math.round(miles * 10) / 10,
      estimatedDrivingMinutes,
      estimatedFlightMinutes,
    };
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get distance between two locations by name
   * @param from - Origin location name
   * @param to - Destination location name
   * @returns Distance result or null if geocoding fails
   */
  async getDistanceBetween(from: string, to: string): Promise<DistanceResult | null> {
    const [fromResult, toResult] = await Promise.all([
      this.geocode(from),
      this.geocode(to),
    ]);

    if (!fromResult || !toResult) {
      console.warn(`Could not geocode: ${!fromResult ? from : ''} ${!toResult ? to : ''}`);
      return null;
    }

    return this.calculateDistance(
      fromResult.latitude,
      fromResult.longitude,
      toResult.latitude,
      toResult.longitude
    );
  }

  /**
   * Calculate route between multiple locations
   * @param locationNames - Array of location names in order
   * @returns Route result with waypoints and segment details
   */
  async calculateRoute(locationNames: string[]): Promise<RouteResult | null> {
    if (locationNames.length < 2) {
      console.warn('Route calculation requires at least 2 locations');
      return null;
    }

    // Geocode all locations
    const geocodeResults = await this.geocodeBatch(locationNames);

    // Build waypoints, filtering out failed geocodes
    const waypoints: RouteWaypoint[] = [];
    for (const name of locationNames) {
      const result = geocodeResults.get(name);
      if (result) {
        waypoints.push({
          name,
          latitude: result.latitude,
          longitude: result.longitude,
        });
      } else {
        console.warn(`Skipping location "${name}" - could not geocode`);
      }
    }

    if (waypoints.length < 2) {
      console.warn('Not enough geocoded locations for route');
      return null;
    }

    // Calculate segments between consecutive waypoints
    const segments: RouteResult['segments'] = [];
    let totalDistanceKm = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];

      const distance = this.calculateDistance(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude
      );

      segments.push({
        from: from.name,
        to: to.name,
        distanceKm: distance.kilometers,
        estimatedMinutes: distance.estimatedDrivingMinutes,
      });

      totalDistanceKm += distance.kilometers;
    }

    return {
      waypoints,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDistanceMiles: Math.round(totalDistanceKm * 0.621371 * 10) / 10,
      segments,
    };
  }

  /**
   * Get travel recommendation based on distance
   * @param kilometers - Distance in kilometers
   * @returns Recommended travel mode
   */
  getRecommendedTravelMode(kilometers: number): 'walk' | 'drive' | 'fly' {
    if (kilometers < 3) return 'walk';
    if (kilometers < 500) return 'drive';
    return 'fly';
  }
}

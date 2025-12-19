/**
 * Geocoding service using Nominatim (OpenStreetMap)
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
}

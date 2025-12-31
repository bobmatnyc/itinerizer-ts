/**
 * Location detection utilities for chat messages
 * Automatically identifies airports and cities mentioned in text
 */

import { KNOWN_AIRPORTS, KNOWN_CITIES } from '$lib/data/known-locations';
import type { MapMarker } from '$lib/stores/visualization.svelte';

/**
 * Detect geographic locations in text and return map markers
 * @param text - The text content to analyze
 * @returns Array of map markers representing detected locations
 */
export function detectLocationsInText(text: string): MapMarker[] {
  const markers: MapMarker[] = [];
  const seen = new Set<string>(); // Track to avoid duplicates

  // Check for airport codes (3 uppercase letters, word boundary)
  const airportMatches = text.match(/\b([A-Z]{3})\b/g);
  if (airportMatches) {
    for (const code of airportMatches) {
      if (KNOWN_AIRPORTS[code] && !seen.has(code)) {
        const airport = KNOWN_AIRPORTS[code];
        markers.push({
          lat: airport.lat,
          lng: airport.lng,
          label: `${code} (${airport.city})`,
          type: 'flight' as any
        });
        seen.add(code);
      }
    }
  }

  // Check for known city names (case-sensitive to avoid false positives)
  for (const [city, coords] of Object.entries(KNOWN_CITIES)) {
    if (text.includes(city) && !seen.has(city)) {
      // Avoid duplicate if airport already added for this city
      const isDuplicate = markers.some(m =>
        Math.abs(m.lat - coords.lat) < 0.5 && Math.abs(m.lng - coords.lng) < 0.5
      );

      if (!isDuplicate) {
        markers.push({
          lat: coords.lat,
          lng: coords.lng,
          label: city,
          type: 'destination'
        });
        seen.add(city);
      }
    }
  }

  return markers;
}

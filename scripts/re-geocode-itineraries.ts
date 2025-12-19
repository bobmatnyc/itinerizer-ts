#!/usr/bin/env tsx
/**
 * Re-geocode all existing itineraries to add coordinates to location fields
 *
 * This script:
 * 1. Loads all itineraries from data/itineraries/
 * 2. Collects all unique locations from segments
 * 3. Geocodes locations that don't already have coordinates
 * 4. Updates segments with geocoded coordinates
 * 5. Saves updated itineraries
 *
 * Usage:
 *   npx tsx scripts/re-geocode-itineraries.ts
 */

import { GeocodingService } from '../src/services/geocoding.service.js';
import { JsonItineraryStorage } from '../src/storage/json-storage.js';
import { SegmentType } from '../src/domain/types/common.js';
import type { Itinerary } from '../src/domain/types/itinerary.js';
import type { Segment } from '../src/domain/types/segment.js';
import type { Location } from '../src/domain/types/location.js';

/**
 * Statistics tracking for the geocoding operation
 */
interface GeocodingStats {
  itinerariesProcessed: number;
  itinerariesUpdated: number;
  locationsTotal: number;
  locationsGeocoded: number;
  locationsSkipped: number;
  locationsFailed: number;
}

/**
 * Collect all locations from a segment based on its type
 */
function collectLocationsFromSegment(segment: Segment): Location[] {
  const locations: Location[] = [];

  switch (segment.type) {
    case SegmentType.FLIGHT:
      if (segment.origin) locations.push(segment.origin);
      if (segment.destination) locations.push(segment.destination);
      break;
    case SegmentType.HOTEL:
    case SegmentType.MEETING:
    case SegmentType.ACTIVITY:
      if (segment.location) locations.push(segment.location);
      break;
    case SegmentType.TRANSFER:
      if (segment.pickupLocation) locations.push(segment.pickupLocation);
      if (segment.dropoffLocation) locations.push(segment.dropoffLocation);
      break;
    case SegmentType.CUSTOM:
      if (segment.location) locations.push(segment.location);
      break;
  }

  return locations;
}

/**
 * Update a segment with geocoded coordinates
 */
function updateSegmentWithCoordinates(
  segment: Segment,
  coordinatesByQuery: Map<string, { latitude: number; longitude: number }>,
  geocodingService: GeocodingService
): Segment {
  const updatedSegment = { ...segment };

  switch (segment.type) {
    case SegmentType.FLIGHT:
      if (segment.origin) {
        const query = geocodingService.buildLocationQuery(segment.origin);
        const coords = coordinatesByQuery.get(query);
        if (coords && !segment.origin.coordinates) {
          updatedSegment.origin = { ...segment.origin, coordinates: coords };
        }
      }
      if (segment.destination) {
        const query = geocodingService.buildLocationQuery(segment.destination);
        const coords = coordinatesByQuery.get(query);
        if (coords && !segment.destination.coordinates) {
          updatedSegment.destination = { ...segment.destination, coordinates: coords };
        }
      }
      break;

    case SegmentType.HOTEL:
    case SegmentType.MEETING:
    case SegmentType.ACTIVITY:
      if (segment.location) {
        const query = geocodingService.buildLocationQuery(segment.location);
        const coords = coordinatesByQuery.get(query);
        if (coords && !segment.location.coordinates) {
          updatedSegment.location = { ...segment.location, coordinates: coords };
        }
      }
      break;

    case SegmentType.TRANSFER:
      if (segment.pickupLocation) {
        const query = geocodingService.buildLocationQuery(segment.pickupLocation);
        const coords = coordinatesByQuery.get(query);
        if (coords && !segment.pickupLocation.coordinates) {
          updatedSegment.pickupLocation = { ...segment.pickupLocation, coordinates: coords };
        }
      }
      if (segment.dropoffLocation) {
        const query = geocodingService.buildLocationQuery(segment.dropoffLocation);
        const coords = coordinatesByQuery.get(query);
        if (coords && !segment.dropoffLocation.coordinates) {
          updatedSegment.dropoffLocation = { ...segment.dropoffLocation, coordinates: coords };
        }
      }
      break;

    case SegmentType.CUSTOM:
      if (segment.location) {
        const query = geocodingService.buildLocationQuery(segment.location);
        const coords = coordinatesByQuery.get(query);
        if (coords && !segment.location.coordinates) {
          updatedSegment.location = { ...segment.location, coordinates: coords };
        }
      }
      break;
  }

  return updatedSegment;
}

/**
 * Process a single itinerary: geocode locations and update segments
 */
async function processItinerary(
  itinerary: Itinerary,
  geocodingService: GeocodingService,
  index: number,
  total: number
): Promise<{ updated: Itinerary; stats: { geocoded: number; skipped: number; failed: number } }> {
  console.log(`\nProcessing ${index}/${total}: ${itinerary.title}`);

  // Step 1: Collect all unique locations from segments
  const locationQueries = new Map<string, Location>();
  let totalLocations = 0;
  let skippedLocations = 0;

  for (const segment of itinerary.segments) {
    const locations = collectLocationsFromSegment(segment);
    totalLocations += locations.length;

    for (const location of locations) {
      // Skip locations that already have coordinates
      if (location.coordinates) {
        skippedLocations++;
        continue;
      }

      const query = geocodingService.buildLocationQuery(location);
      if (query) {
        locationQueries.set(query, location);
      }
    }
  }

  if (locationQueries.size === 0) {
    console.log(`  No locations to geocode (${skippedLocations} already have coordinates)`);
    return { updated: itinerary, stats: { geocoded: 0, skipped: skippedLocations, failed: 0 } };
  }

  console.log(`  Found ${locationQueries.size} unique locations to geocode`);
  if (skippedLocations > 0) {
    console.log(`  Skipped ${skippedLocations} locations (already have coordinates)`);
  }

  // Step 2: Geocode all locations in batch (with rate limiting)
  const queries = Array.from(locationQueries.keys());
  const geocodingResults = await geocodingService.geocodeBatch(queries);

  // Step 3: Process geocoding results
  const coordinatesByQuery = new Map<string, { latitude: number; longitude: number }>();
  let geocodedCount = 0;
  let failedCount = 0;

  for (const [query, result] of geocodingResults) {
    if (result) {
      coordinatesByQuery.set(query, {
        latitude: result.latitude,
        longitude: result.longitude,
      });
      geocodedCount++;
      console.log(`  ✓ ${query} → ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`);
    } else {
      failedCount++;
      console.log(`  ⚠ ${query} → No results`);
    }
  }

  console.log(`  Updated ${geocodedCount}/${locationQueries.size} locations`);

  // Step 4: Update segments with coordinates
  const updatedSegments = itinerary.segments.map((segment) =>
    updateSegmentWithCoordinates(segment, coordinatesByQuery, geocodingService)
  );

  const updatedItinerary: Itinerary = {
    ...itinerary,
    segments: updatedSegments,
  };

  return {
    updated: updatedItinerary,
    stats: {
      geocoded: geocodedCount,
      skipped: skippedLocations,
      failed: failedCount,
    },
  };
}

/**
 * Main function
 */
async function main() {
  console.log('Re-geocoding itineraries...\n');

  const storage = new JsonItineraryStorage('./data/itineraries');
  const geocodingService = new GeocodingService();

  // Initialize storage
  const initResult = await storage.initialize();
  if (!initResult.success) {
    console.error('Failed to initialize storage:', initResult.error.message);
    process.exit(1);
  }

  // Load all itineraries
  const listResult = await storage.list();
  if (!listResult.success) {
    console.error('Failed to list itineraries:', listResult.error.message);
    process.exit(1);
  }

  const summaries = listResult.value;
  console.log(`Found ${summaries.length} itineraries\n`);

  if (summaries.length === 0) {
    console.log('No itineraries to process');
    return;
  }

  // Process each itinerary
  const stats: GeocodingStats = {
    itinerariesProcessed: 0,
    itinerariesUpdated: 0,
    locationsTotal: 0,
    locationsGeocoded: 0,
    locationsSkipped: 0,
    locationsFailed: 0,
  };

  for (let i = 0; i < summaries.length; i++) {
    const summary = summaries[i];

    // Load full itinerary
    const loadResult = await storage.load(summary.id);
    if (!loadResult.success) {
      console.error(`Failed to load itinerary ${summary.id}:`, loadResult.error.message);
      continue;
    }

    const itinerary = loadResult.value;

    // Process itinerary
    try {
      const { updated, stats: itineraryStats } = await processItinerary(
        itinerary,
        geocodingService,
        i + 1,
        summaries.length
      );

      // Save if any locations were geocoded
      if (itineraryStats.geocoded > 0) {
        const saveResult = await storage.save(updated);
        if (!saveResult.success) {
          console.error(`Failed to save itinerary ${summary.id}:`, saveResult.error.message);
          continue;
        }
        stats.itinerariesUpdated++;
      }

      // Update overall statistics
      stats.itinerariesProcessed++;
      stats.locationsGeocoded += itineraryStats.geocoded;
      stats.locationsSkipped += itineraryStats.skipped;
      stats.locationsFailed += itineraryStats.failed;
      stats.locationsTotal += itineraryStats.geocoded + itineraryStats.skipped + itineraryStats.failed;
    } catch (error) {
      console.error(`Error processing itinerary ${summary.id}:`, error);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`  Itineraries processed: ${stats.itinerariesProcessed}`);
  console.log(`  Itineraries updated: ${stats.itinerariesUpdated}`);
  console.log(`  Locations total: ${stats.locationsTotal}`);
  console.log(`  Locations geocoded: ${stats.locationsGeocoded}`);
  console.log(`  Locations skipped (already geocoded): ${stats.locationsSkipped}`);
  console.log(`  Locations failed: ${stats.locationsFailed}`);
  console.log('='.repeat(50));
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

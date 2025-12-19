# Re-Geocode Itineraries Script

This script adds geographic coordinates to all locations in existing itineraries using the Nominatim geocoding service.

## Purpose

The `re-geocode-itineraries.ts` script:
1. Loads all itineraries from `data/itineraries/`
2. Extracts all unique locations from segments (flights, hotels, activities, etc.)
3. Geocodes locations that don't already have coordinates
4. Updates the itinerary files with the geocoded coordinates
5. Provides detailed progress and summary statistics

## Usage

```bash
npx tsx scripts/re-geocode-itineraries.ts
```

## Features

### Automatic Location Collection
Collects locations from all segment types:
- **Flight**: origin, destination
- **Hotel**: location
- **Activity**: location
- **Meeting**: location
- **Transfer**: pickupLocation, dropoffLocation
- **Custom**: location (if present)

### Smart Geocoding
- Skips locations that already have coordinates
- Builds intelligent queries using location name, city, state, and country
- Uses batch geocoding with 1-second rate limiting (per Nominatim usage policy)
- Handles geocoding failures gracefully

### Progress Reporting
Shows real-time progress:
```
Processing 1/10: Family Adventure in Moab
  Found 5 unique locations to geocode
  ✓ JFK Airport → 40.6413, -73.7781
  ✓ Salt Lake City International Airport → 40.7899, -111.9791
  ⚠ Hoodoo Moab → No results
  Updated 4/5 locations
```

### Summary Statistics
Provides a comprehensive summary at the end:
```
Summary:
  Itineraries processed: 15
  Itineraries updated: 14
  Locations total: 115
  Locations geocoded: 72
  Locations skipped (already geocoded): 0
  Locations failed: 43
```

## How It Works

1. **Load Itineraries**: Reads all itinerary JSON files
2. **Extract Locations**: Collects unique locations from all segments
3. **Filter**: Skips locations that already have coordinates
4. **Build Queries**: Creates geocoding queries from location data
5. **Batch Geocode**: Geocodes all unique locations (rate-limited to 1/sec)
6. **Update Segments**: Adds coordinates to segment locations
7. **Save**: Writes updated itineraries back to disk

## Error Handling

- **Missing Locations**: Logs warning and continues
- **Failed Geocoding**: Logs failure and continues with other locations
- **Invalid Itineraries**: Skips and logs error, continues with next itinerary

## Rate Limiting

The script respects Nominatim's usage policy:
- Maximum 1 request per second
- Uses the GeocodingService which implements automatic rate limiting

## When to Use

Run this script when:
- Importing old itineraries that don't have coordinates
- Adding coordinate support to existing data
- Preparing itineraries for map-based features
- Migrating data to a new coordinate-aware schema

## Example Output

```
Re-geocoding itineraries...

Found 15 itineraries

Processing 1/15: Norway - Adventure Itinerary
  Found 11 unique locations to geocode
  ✓ Bergen Airport → 60.4080, 5.3207
  ✓ Opus XVI → 60.3939, 5.3272
  ✓ Bergen → 60.3943, 5.3259
  ⚠ Vaagsallmenningen 16 → No results
  Updated 10/11 locations

...

==================================================
Summary:
  Itineraries processed: 15
  Itineraries updated: 14
  Locations total: 115
  Locations geocoded: 72
  Locations skipped (already geocoded): 0
  Locations failed: 43
==================================================
```

## Related Services

- **GeocodingService**: Provides Nominatim-based geocoding with rate limiting
- **JsonItineraryStorage**: Handles loading and saving itinerary files
- **DocumentImportService**: Uses the same geocoding logic during import

## Implementation Notes

The script mirrors the geocoding logic in `DocumentImportService.geocodeItinerary()` to ensure consistency between imported and re-geocoded itineraries.

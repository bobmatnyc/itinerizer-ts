# Geocoding Service

The geocoding service enriches itinerary locations with geographic coordinates using OpenStreetMap's Nominatim API.

## Features

- **Free**: No API key required (uses OpenStreetMap)
- **Automatic**: Runs during PDF import pipeline
- **Rate-limited**: Respects 1 request/second Nominatim policy
- **Batch processing**: Efficiently geocodes multiple locations
- **Confidence scores**: Provides quality indicator for each result

## Architecture

```
PDF Import Pipeline
│
├─ 1. Extract PDF text
├─ 2. Convert to structured markdown
├─ 3. Parse with LLM
├─ 4. Geocode locations ← NEW
├─ 5. Fill geographic gaps
└─ 6. Save itinerary
```

## Integration

The geocoding service is automatically integrated into the import pipeline:

```typescript
// In DocumentImportService
itinerary = await this.geocodeItinerary(itinerary);
```

The service:
1. Collects all unique locations from segments
2. Builds search queries from location names and addresses
3. Geocodes locations in batch (respecting rate limits)
4. Adds coordinates to Location objects

## Location Sources

The service geocodes locations from all segment types:

| Segment Type | Location Fields |
|-------------|----------------|
| FLIGHT | `origin`, `destination` |
| HOTEL | `location` |
| MEETING | `location` |
| ACTIVITY | `location` |
| TRANSFER | `pickupLocation`, `dropoffLocation` |

## Query Building

Location queries are built from available fields:

```typescript
// Example: Hotel segment
{
  name: "Marriott Times Square",
  address: {
    city: "New York",
    state: "NY",
    country: "US"
  }
}
// → Query: "Marriott Times Square, New York, NY, US"
```

The service prioritizes:
1. Location name (hotel, airport, venue)
2. City
3. State/province
4. Country

## Confidence Scores

Each geocoding result includes a confidence score (0-100):

- **80-100**: High confidence (exact match, well-known place)
- **60-79**: Medium confidence (approximate location)
- **0-59**: Low confidence (uncertain match)

Factors:
- OpenStreetMap importance score (based on Wikipedia)
- Location type (airports, hotels, landmarks get boost)
- Result specificity

## Rate Limiting

The service respects Nominatim's usage policy:
- **1 request per second** maximum
- Sequential processing (no parallel requests)
- Built-in delays between calls

For large imports with many locations, expect ~1 second per unique location.

## Usage Examples

### Manual Geocoding

```typescript
import { GeocodingService } from './services/geocoding.service.js';

const geocoding = new GeocodingService();

// Simple query
const result = await geocoding.geocode('JFK Airport, New York');
console.log(result.latitude, result.longitude); // 40.6413, -73.7781

// Location object
const location = {
  name: 'Eiffel Tower',
  address: { city: 'Paris', country: 'FR' }
};
const coords = await geocoding.geocodeLocation(location);
```

### Batch Geocoding

```typescript
const queries = [
  'JFK Airport, New York',
  'Charles de Gaulle Airport, Paris',
  'Heathrow Airport, London'
];

const results = await geocoding.geocodeBatch(queries);
// Returns Map<string, GeocodingResult | null>
```

### During Import

Geocoding happens automatically during import:

```bash
# Coordinates are added automatically
npm run cli import tests/fixtures/sample-itinerary.pdf --save
```

The resulting itinerary will have coordinates:

```json
{
  "segments": [
    {
      "type": "FLIGHT",
      "origin": {
        "name": "JFK Airport",
        "code": "JFK",
        "coordinates": {
          "latitude": 40.6413,
          "longitude": -73.7781
        }
      }
    }
  ]
}
```

## Output Example

During import, you'll see geocoding progress:

```
🌍 Geocoding locations...
   Found 5 unique locations to geocode
   ✓ JFK Airport, New York, US → 40.6413, -73.7781
   ✓ Marriott Times Square, New York, US → 40.7580, -73.9855
   ✓ Empire State Building, New York, US → 40.7484, -73.9857
   ✓ LaGuardia Airport, New York, US → 40.7769, -73.8740
   ✗ Unknown Hotel → not found
✓ Geocoded 4 locations, 1 failed
```

## Error Handling

The service handles errors gracefully:

- **Location not found**: Returns `null`, continues with other locations
- **API errors**: Logs warning, returns `null`
- **Network failures**: Logs error, returns `null`
- **Empty queries**: Returns `null` without API call

Failed geocoding does NOT block import - the itinerary will be created without coordinates for failed locations.

## Performance Considerations

For a typical itinerary:
- **5-10 locations**: ~5-10 seconds
- **10-20 locations**: ~10-20 seconds
- **20+ locations**: ~20+ seconds

Geocoding runs in parallel with other import steps where possible.

## Testing

The service includes comprehensive tests:

```bash
# Run unit tests
npm test tests/services/geocoding.service.test.ts

# Run integration demo
tsx examples/geocoding-demo.ts
```

Test coverage:
- Query building from Location objects
- Batch processing with deduplication
- Rate limiting enforcement
- Error handling
- Confidence scoring

## Future Enhancements

Potential improvements:

1. **Caching**: Store geocoding results to avoid re-geocoding same locations
2. **Alternative providers**: Support Google Maps, Mapbox as fallbacks
3. **Reverse geocoding**: Get location names from coordinates
4. **Address validation**: Verify addresses before geocoding
5. **Timezone lookup**: Add timezone data based on coordinates

## References

- [Nominatim API Documentation](https://nominatim.org/release-docs/latest/api/Overview/)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [OpenStreetMap](https://www.openstreetmap.org)

## Troubleshooting

### Rate limiting errors

If you see 429 errors:
- Service already enforces 1 req/sec
- Check if multiple processes are running
- Verify User-Agent header is set correctly

### Low confidence scores

For better results:
- Include city and country in location names
- Use well-known place names (airports, landmarks)
- Verify spelling of location names

### No results found

Common causes:
- Misspelled location names
- Missing city/country information
- Very new or obscure locations
- Use more specific queries (add city/country)

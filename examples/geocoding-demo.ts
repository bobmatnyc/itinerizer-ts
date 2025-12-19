/**
 * Geocoding service demonstration
 *
 * Run with: tsx examples/geocoding-demo.ts
 */

import { GeocodingService } from '../src/services/geocoding.service.js';
import type { Location } from '../src/domain/types/location.js';

async function main() {
  const geocodingService = new GeocodingService();

  console.log('🌍 Geocoding Service Demo\n');
  console.log('='.repeat(60));

  // Example 1: Simple location query
  console.log('\n📍 Example 1: Simple location query');
  console.log('-'.repeat(60));

  const result1 = await geocodingService.geocode('JFK Airport, New York');
  if (result1) {
    console.log(`✓ Found: ${result1.displayName}`);
    console.log(`  Coordinates: ${result1.latitude.toFixed(4)}, ${result1.longitude.toFixed(4)}`);
    console.log(`  Confidence: ${result1.confidence}%`);
  } else {
    console.log('✗ Not found');
  }

  // Example 2: Location object
  console.log('\n📍 Example 2: Location object');
  console.log('-'.repeat(60));

  const location: Location = {
    name: 'Marriott Marquis Times Square',
    address: {
      city: 'New York',
      state: 'NY',
      country: 'US',
    },
  };

  const query = geocodingService.buildLocationQuery(location);
  console.log(`Query: "${query}"`);

  const result2 = await geocodingService.geocodeLocation(location);
  if (result2) {
    console.log(`✓ Found: ${result2.displayName}`);
    console.log(`  Coordinates: ${result2.latitude.toFixed(4)}, ${result2.longitude.toFixed(4)}`);
    console.log(`  Confidence: ${result2.confidence}%`);
  } else {
    console.log('✗ Not found');
  }

  // Example 3: Batch geocoding
  console.log('\n📍 Example 3: Batch geocoding');
  console.log('-'.repeat(60));

  const queries = [
    'Eiffel Tower, Paris',
    'Big Ben, London',
    'Tokyo Tower, Japan',
  ];

  console.log(`Geocoding ${queries.length} locations...`);
  const results = await geocodingService.geocodeBatch(queries);

  for (const [query, result] of results) {
    if (result) {
      console.log(`✓ ${query}`);
      console.log(`  → ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)} (confidence: ${result.confidence}%)`);
    } else {
      console.log(`✗ ${query} - not found`);
    }
  }

  // Example 4: Invalid location
  console.log('\n📍 Example 4: Invalid/non-existent location');
  console.log('-'.repeat(60));

  const result4 = await geocodingService.geocode('XYZ Nonexistent Place 12345');
  if (result4) {
    console.log(`✓ Found: ${result4.displayName}`);
  } else {
    console.log('✗ Not found (as expected)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ Demo complete!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

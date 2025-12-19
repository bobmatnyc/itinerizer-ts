/**
 * Travel Agent Service Demo
 *
 * This example demonstrates how to use the Travel Agent Service
 * to intelligently fill missing segments in imported itineraries.
 */

import { TravelAgentService } from '../src/services/travel-agent.service.js';
import { DocumentImportService } from '../src/services/document-import.service.js';
import { YamlConfigStorage } from '../src/storage/yaml-config.js';
import type { Segment } from '../src/domain/types/segment.js';

// Example 1: Using TravelAgentService directly
async function directUsageExample() {
  console.log('=== Example 1: Direct TravelAgentService Usage ===\n');

  // Initialize with SerpAPI config
  const travelAgent = new TravelAgentService({
    apiKey: 'your-serpapi-key-here'
  });

  // Sample existing segments for preference inference
  const existingSegments: Segment[] = [
    // ... your actual segments here
  ];

  // Infer travel preferences
  const preferences = travelAgent.inferPreferences(existingSegments);
  console.log('Inferred Preferences:');
  console.log(`  Cabin Class: ${preferences.cabinClass}`);
  console.log(`  Hotel Star Rating: ${preferences.hotelStarRating}`);
  console.log(`  Budget Tier: ${preferences.budgetTier}\n`);

  // Example: Search for a flight to fill a gap
  // (You would typically get this gap from SegmentContinuityService)
  const mockGap = {
    beforeIndex: 0,
    afterIndex: 1,
    beforeSegment: existingSegments[0]!,
    afterSegment: existingSegments[1]!,
    endLocation: { name: 'JFK Airport', code: 'JFK', address: { country: 'US' } },
    startLocation: { name: 'Milan Malpensa', code: 'MXP', address: { country: 'IT' } },
    gapType: 'INTERNATIONAL_GAP' as const,
    description: 'International flight needed from JFK to MXP',
    suggestedType: 'FLIGHT' as const,
  };

  console.log('Searching for flight...');
  const flightResult = await travelAgent.searchFlight(mockGap, preferences);

  if (flightResult.found) {
    console.log('✓ Found flight!');
    console.log(`  Segment Type: ${flightResult.segment?.type}`);
    console.log(`  Inferred: ${flightResult.segment?.inferred}`);
    console.log(`  Alternatives: ${flightResult.alternatives?.length || 0}\n`);
  } else {
    console.log(`✗ Flight search failed: ${flightResult.error}\n`);
  }
}

// Example 2: Using via DocumentImportService (recommended)
async function importUsageExample() {
  console.log('=== Example 2: Import with Intelligent Gap Filling ===\n');

  // Load configuration (includes SerpAPI key if configured)
  const configStorage = new YamlConfigStorage();
  const configResult = await configStorage.getImportConfig();

  if (!configResult.success) {
    console.error('Failed to load config:', configResult.error.message);
    return;
  }

  const config = configResult.value;

  // Check if SerpAPI is configured
  if (config.serpapi) {
    console.log('✓ SerpAPI configured - will use intelligent gap filling\n');
  } else {
    console.log('ℹ SerpAPI not configured - will use placeholder segments\n');
  }

  // Create import service with TravelAgent integration
  const importService = new DocumentImportService(config);

  // Import PDF with intelligent gap filling
  const pdfPath = './examples/sample-trip.pdf';
  console.log(`Importing: ${pdfPath}`);

  const importResult = await importService.importWithValidation(pdfPath, {
    fillGaps: true,           // Enable gap filling
    validateContinuity: true, // Validate geographic continuity
  });

  if (!importResult.success) {
    console.error('Import failed:', importResult.error.message);
    return;
  }

  const { parsedItinerary, continuityValidation } = importResult.value;

  console.log('\nImport Results:');
  console.log(`  Total Segments: ${parsedItinerary.segments.length}`);
  console.log(`  Geographic Continuity: ${continuityValidation?.valid ? '✓ Valid' : '✗ Has Gaps'}`);

  // Show auto-filled segments
  const inferredSegments = parsedItinerary.segments.filter(s => s.inferred);
  console.log(`\nAuto-Filled Segments: ${inferredSegments.length}`);

  for (const segment of inferredSegments) {
    const source = segment.metadata?.source || 'placeholder';
    console.log(`  - ${segment.type}: ${segment.inferredReason}`);
    console.log(`    Source: ${source}`);

    if (source === 'serpapi-google-flights' && segment.type === 'FLIGHT') {
      const flight = segment as any;
      console.log(`    Flight: ${flight.airline.name} ${flight.flightNumber}`);
      console.log(`    Price: ${flight.price ? `$${flight.price.amount}` : 'N/A'}`);
    }

    if (source === 'serpapi-google-hotels' && segment.type === 'HOTEL') {
      const hotel = segment as any;
      console.log(`    Hotel: ${hotel.property.name}`);
      console.log(`    Price: ${hotel.price ? `$${hotel.price.amount}` : 'N/A'}`);
    }
  }

  console.log('\n');
}

// Example 3: Analyzing preference inference accuracy
async function preferenceAnalysisExample() {
  console.log('=== Example 3: Travel Preference Analysis ===\n');

  const travelAgent = new TravelAgentService({
    apiKey: 'your-serpapi-key-here'
  });

  // Simulate different trip types
  const scenarios = [
    {
      name: 'Budget Traveler',
      segments: [
        // Economy flights, 3-star hotels
      ],
    },
    {
      name: 'Business Traveler',
      segments: [
        // Business class flights, 4-star hotels
      ],
    },
    {
      name: 'Luxury Traveler',
      segments: [
        // First class flights, 5-star resorts
      ],
    },
  ];

  for (const scenario of scenarios) {
    const prefs = travelAgent.inferPreferences(scenario.segments);
    console.log(`${scenario.name}:`);
    console.log(`  Cabin Class: ${prefs.cabinClass}`);
    console.log(`  Hotel Tier: ${prefs.hotelStarRating}-star`);
    console.log(`  Budget: ${prefs.budgetTier}`);
    console.log();
  }
}

// Example 4: Error handling and fallback behavior
async function errorHandlingExample() {
  console.log('=== Example 4: Error Handling ===\n');

  // Example with invalid API key (will fall back to placeholders)
  const travelAgent = new TravelAgentService({
    apiKey: 'invalid-key'
  });

  const mockGap = {
    beforeIndex: 0,
    afterIndex: 1,
    beforeSegment: {} as any,
    afterSegment: {} as any,
    endLocation: { name: 'JFK Airport', code: 'JFK' },
    startLocation: { name: 'LAX Airport', code: 'LAX' },
    gapType: 'DOMESTIC_GAP' as const,
    description: 'Domestic flight needed',
    suggestedType: 'FLIGHT' as const,
  };

  console.log('Attempting search with invalid API key...');
  const result = await travelAgent.searchFlight(mockGap, {
    cabinClass: 'ECONOMY' as any,
    hotelStarRating: 3,
    budgetTier: 'economy',
  });

  if (!result.found) {
    console.log('✗ Search failed (as expected)');
    console.log(`  Error: ${result.error}`);
    console.log('\nℹ DocumentImportService will automatically fall back to placeholder segment\n');
  }
}

// Run examples
async function main() {
  console.log('Travel Agent Service Examples\n');
  console.log('='.repeat(60));
  console.log();

  try {
    // Run examples (comment out as needed)
    // await directUsageExample();
    // await importUsageExample();
    await preferenceAnalysisExample();
    // await errorHandlingExample();

    console.log('='.repeat(60));
    console.log('\nExamples completed!\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Uncomment to run:
// main();

export {
  directUsageExample,
  importUsageExample,
  preferenceAnalysisExample,
  errorHandlingExample,
};

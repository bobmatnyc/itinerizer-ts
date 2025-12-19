/**
 * Example: Import Metadata Enhancement
 *
 * Demonstrates the automatic population of metadata during import.
 */

import { DocumentImportService } from '../src/services/document-import.service.js';
import type { ImportConfig } from '../src/domain/types/import.js';

async function demonstrateMetadataEnhancement() {
  // Configure the import service
  const config: ImportConfig = {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    costTrackingEnabled: true,
    costLogPath: './data/imports/cost-log.json',
  };

  const service = new DocumentImportService(config);
  await service.initialize();

  console.log('🚀 Importing PDF with automatic metadata enhancement...\n');

  // Import a PDF file
  const result = await service.importWithValidation('./data/imports/sample.pdf', {
    model: 'anthropic/claude-3-haiku',
    saveToStorage: false,
    validateContinuity: true,
    fillGaps: true,
  });

  if (!result.success) {
    console.error('❌ Import failed:', result.error.message);
    return;
  }

  const { parsedItinerary, usage, continuityValidation } = result.value;

  // Display itinerary-level metadata
  console.log('📦 Itinerary Metadata:');
  console.log('══════════════════════════════════════════════════════\n');

  const metadata = parsedItinerary.metadata as any;

  if (metadata.importSource) {
    console.log('📄 Import Source:');
    console.log(`   Filename:       ${metadata.importSource.filename}`);
    console.log(`   Imported At:    ${metadata.importSource.importedAt}`);
    console.log(`   Model:          ${metadata.importSource.model}`);
    console.log(`   Processing:     ${metadata.importSource.processingTimeMs}ms`);
    console.log();
  }

  if (metadata.llmUsage) {
    console.log('💰 LLM Usage:');
    console.log(`   Prompt Tokens:     ${metadata.llmUsage.promptTokens.toLocaleString()}`);
    console.log(`   Completion Tokens: ${metadata.llmUsage.completionTokens.toLocaleString()}`);
    console.log(`   Total Cost:        $${metadata.llmUsage.totalCost.toFixed(4)}`);
    console.log();
  }

  // Display segment-level metadata
  console.log('🧩 Segment Source Details:');
  console.log('══════════════════════════════════════════════════════\n');

  parsedItinerary.segments.slice(0, 3).forEach((segment, index) => {
    console.log(`Segment ${index + 1} (${segment.type}):`);
    console.log(`   Source:    ${segment.source}`);
    if (segment.sourceDetails) {
      console.log(`   Model:     ${segment.sourceDetails.model || 'N/A'}`);
      console.log(`   Timestamp: ${segment.sourceDetails.timestamp || 'N/A'}`);
      if (segment.sourceDetails.confidence) {
        console.log(`   Confidence: ${(segment.sourceDetails.confidence * 100).toFixed(0)}%`);
      }
    }
    console.log();
  });

  // Display continuity validation
  if (continuityValidation) {
    console.log('🗺️  Geographic Continuity:');
    console.log('══════════════════════════════════════════════════════\n');
    console.log(`   Valid:           ${continuityValidation.valid ? '✓' : '✗'}`);
    console.log(`   Segments:        ${continuityValidation.segmentCount}`);
    console.log(`   Gaps Found:      ${continuityValidation.gaps.length}`);
    console.log();

    if (continuityValidation.gaps.length > 0) {
      console.log('   Gap Details:');
      continuityValidation.gaps.forEach((gap, i) => {
        console.log(`   ${i + 1}. ${gap.description}`);
        console.log(`      Suggested: ${gap.suggestedType}`);
      });
    }
  }

  // Summary
  console.log('\n📊 Import Summary:');
  console.log('══════════════════════════════════════════════════════');
  console.log(`   Itinerary:  ${parsedItinerary.title}`);
  console.log(`   Segments:   ${parsedItinerary.segments.length}`);
  console.log(`   Duration:   ${parsedItinerary.startDate.toLocaleDateString()} - ${parsedItinerary.endDate.toLocaleDateString()}`);
  console.log(`   Cost:       $${usage.costUSD.toFixed(4)}`);
  console.log(`   Processing: ${metadata.importSource?.processingTimeMs || 0}ms`);
}

// Run the demonstration
demonstrateMetadataEnhancement().catch(console.error);

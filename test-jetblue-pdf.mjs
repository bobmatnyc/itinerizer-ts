#!/usr/bin/env node
/**
 * Test JetBlue PDF parsing
 */

import { readFileSync } from 'fs';
import { ImportService } from './dist/index.js';

async function testJetBluePDF() {
  console.log('🔍 Testing JetBlue PDF Import\n');

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    process.exit(1);
  }

  // Read PDF file
  const pdfPath = `${process.env.HOME}/Downloads/JetBlue - Print confirmation.pdf`;
  console.log(`📄 Reading PDF from: ${pdfPath}`);

  let pdfBuffer;
  try {
    pdfBuffer = readFileSync(pdfPath);
    console.log(`✅ PDF loaded: ${pdfBuffer.length} bytes\n`);
  } catch (error) {
    console.error(`❌ Failed to read PDF: ${error.message}`);
    process.exit(1);
  }

  // Initialize import service
  console.log('🚀 Initializing ImportService...');
  const importService = new ImportService({ apiKey });

  // Import the PDF
  console.log('📤 Importing PDF...\n');
  const startTime = Date.now();

  const result = await importService.importFromUpload(
    pdfBuffer,
    'JetBlue - Print confirmation.pdf',
    'application/pdf'
  );

  const elapsed = Date.now() - startTime;
  console.log(`⏱️  Completed in ${elapsed}ms\n`);

  // Display results
  console.log('📊 IMPORT RESULT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Success: ${result.success}`);
  console.log(`Format: ${result.format}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Segments found: ${result.segments.length}`);

  if (result.summary) {
    console.log(`Summary: ${result.summary}`);
  }

  if (result.errors && result.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    result.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  if (result.rawText) {
    console.log(`\n📝 Raw text extracted (first 500 chars):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(result.rawText.substring(0, 500));
    console.log('...');
  }

  if (result.segments.length > 0) {
    console.log('\n✈️  SEGMENTS EXTRACTED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    result.segments.forEach((segment, i) => {
      console.log(`\n${i + 1}. ${segment.type} (Confidence: ${segment.confidence})`);
      console.log(`   Status: ${segment.status}`);
      console.log(`   Dates: ${segment.startDatetime} → ${segment.endDatetime}`);

      if (segment.type === 'FLIGHT') {
        console.log(`   Flight: ${segment.airline?.name} ${segment.flightNumber}`);
        console.log(`   Route: ${segment.origin?.code} → ${segment.destination?.code}`);
        console.log(`   Confirmation: ${segment.confirmationNumber}`);
      }
    });
  } else {
    console.log('\n⚠️  NO SEGMENTS FOUND - This is the bug!');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Return exit code based on success
  process.exit(result.success ? 0 : 1);
}

testJetBluePDF().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

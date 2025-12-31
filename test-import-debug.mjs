#!/usr/bin/env node
/**
 * Test script to debug PDF import with diagnostic logging
 */

import { ImportService } from './dist/index.js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('Error: OPENROUTER_API_KEY not set');
  process.exit(1);
}

// Check if PDF path provided
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node test-import-debug.mjs <path-to-pdf>');
  process.exit(1);
}

console.log('Reading PDF:', pdfPath);
const buffer = readFileSync(pdfPath);
console.log('PDF size:', buffer.length, 'bytes');

const importService = new ImportService({
  apiKey: OPENROUTER_API_KEY,
});

console.log('\n=== Starting Import ===\n');

try {
  const result = await importService.importFromUpload(
    buffer,
    pdfPath.split('/').pop(),
    'application/pdf'
  );

  console.log('\n=== Import Result ===');
  console.log('Success:', result.success);
  console.log('Format:', result.format);
  console.log('Segments:', result.segments.length);
  console.log('Confidence:', result.confidence);
  console.log('Summary:', result.summary);
  console.log('Errors:', result.errors);

  if (result.segments.length > 0) {
    console.log('\n=== Segments ===');
    result.segments.forEach((seg, i) => {
      console.log(`\nSegment ${i + 1}:`, {
        type: seg.type,
        startDatetime: seg.startDatetime,
        endDatetime: seg.endDatetime,
        confirmationNumber: seg.confirmationNumber,
        flightNumber: seg.flightNumber,
        price: seg.price,
      });
    });
  }

  if (result.rawText) {
    console.log('\n=== Raw Text Preview ===');
    console.log(result.rawText.substring(0, 500));
  }
} catch (error) {
  console.error('\n=== Import Error ===');
  console.error(error);
}

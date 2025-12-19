#!/usr/bin/env tsx
/**
 * Validation script to verify all itinerary files pass schema validation
 *
 * Usage: npx tsx scripts/validate-itineraries.ts
 */

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { itinerarySchema } from '../src/domain/schemas/itinerary.schema.js';

const ITINERARIES_DIR = resolve(process.cwd(), 'data/itineraries');

interface ValidationResult {
  file: string;
  valid: boolean;
  error?: string;
}

/**
 * Validate a single itinerary file
 */
async function validateFile(filePath: string): Promise<ValidationResult> {
  const fileName = filePath.split('/').pop() || filePath;

  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    const result = itinerarySchema.safeParse(data);

    if (result.success) {
      console.log(`✓ ${fileName}`);
      return { file: fileName, valid: true };
    } else {
      console.error(`✗ ${fileName}`);
      console.error(`  ${result.error.issues[0]?.message}`);
      return {
        file: fileName,
        valid: false,
        error: result.error.issues[0]?.message || 'Unknown validation error',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${fileName} - ${errorMessage}`);
    return { file: fileName, valid: false, error: errorMessage };
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Itinerary Validation');
  console.log('='.repeat(60));
  console.log(`Directory: ${ITINERARIES_DIR}\n`);

  // Read all JSON files from the directory
  const files = await readdir(ITINERARIES_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json')).map((f) => join(ITINERARIES_DIR, f));

  console.log(`Validating ${jsonFiles.length} itinerary files...\n`);

  // Validate all files
  const results: ValidationResult[] = [];
  for (const file of jsonFiles) {
    const result = await validateFile(file);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Validation Summary');
  console.log('='.repeat(60));

  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);

  console.log(`\nTotal files: ${results.length}`);
  console.log(`✓ Valid: ${valid.length}`);
  console.log(`✗ Invalid: ${invalid.length}`);

  if (invalid.length > 0) {
    console.log('\n✗ Invalid files:');
    invalid.forEach((r) => console.log(`  - ${r.file}: ${r.error}`));
    console.log('\n❌ Validation failed');
    process.exit(1);
  }

  console.log('\n✅ All itinerary files are valid');
}

// Run the validation
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

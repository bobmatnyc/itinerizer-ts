#!/usr/bin/env tsx
/**
 * One-time migration script to normalize existing itinerary files
 * Applies SchemaNormalizerService to fix datetime issues and other schema violations
 *
 * Usage: npx tsx scripts/normalize-existing.ts
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { normalizeImportData } from '../src/services/schema-normalizer.service.js';
import { itinerarySchema } from '../src/domain/schemas/itinerary.schema.js';

const ITINERARIES_DIR = resolve(process.cwd(), 'data/itineraries');

interface MigrationResult {
  file: string;
  status: 'success' | 'error' | 'skipped';
  normalized: boolean;
  error?: string;
}

/**
 * Normalize an itinerary object (extends normalizeImportData for full itinerary)
 */
function normalizeItinerary(data: any): any {
  // Normalize using the existing import data normalizer
  const normalized = normalizeImportData(data);

  // Also normalize timestamps at the top level
  if (normalized.createdAt) {
    normalized.createdAt = normalizeDate(normalized.createdAt);
  }
  if (normalized.updatedAt) {
    normalized.updatedAt = normalizeDate(normalized.updatedAt);
  }

  // Normalize traveler timestamps if present
  if (Array.isArray(normalized.travelers)) {
    normalized.travelers = normalized.travelers.map((traveler: any) => {
      if (traveler.dateOfBirth) {
        traveler.dateOfBirth = normalizeDate(traveler.dateOfBirth);
      }
      return traveler;
    });
  }

  return normalized;
}

/**
 * Helper to normalize a single date value
 */
function normalizeDate(value: unknown): Date | string {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    // Handle date-only strings (YYYY-MM-DD) by appending time
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `${value}T00:00:00Z`;
    }

    // Handle datetime strings without timezone by appending Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
      return `${value}Z`;
    }

    // Already has timezone or is in valid ISO format
    return value;
  }

  return value as string;
}

/**
 * Process a single itinerary file
 */
async function processFile(filePath: string): Promise<MigrationResult> {
  const fileName = filePath.split('/').pop() || filePath;

  try {
    // Read the file
    const content = await readFile(filePath, 'utf-8');
    const originalData = JSON.parse(content);

    // Normalize the data
    console.log(`\n[${fileName}] Processing...`);
    const normalizedData = normalizeItinerary(originalData);

    // Check if data was actually changed
    const originalJson = JSON.stringify(originalData, null, 2);
    const normalizedJson = JSON.stringify(normalizedData, null, 2);
    const wasNormalized = originalJson !== normalizedJson;

    if (!wasNormalized) {
      console.log(`[${fileName}] ✓ No changes needed`);
      return { file: fileName, status: 'skipped', normalized: false };
    }

    // Validate against schema
    const validationResult = itinerarySchema.safeParse(normalizedData);

    if (!validationResult.success) {
      console.error(`[${fileName}] ✗ Validation failed after normalization:`);
      console.error(validationResult.error.format());
      return {
        file: fileName,
        status: 'error',
        normalized: true,
        error: `Validation failed: ${validationResult.error.issues[0]?.message}`,
      };
    }

    // Write back the normalized data
    await writeFile(filePath, normalizedJson + '\n', 'utf-8');
    console.log(`[${fileName}] ✓ Normalized and saved`);

    return { file: fileName, status: 'success', normalized: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${fileName}] ✗ Error: ${errorMessage}`);
    return { file: fileName, status: 'error', normalized: false, error: errorMessage };
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Itinerary Normalization Migration');
  console.log('='.repeat(60));
  console.log(`Directory: ${ITINERARIES_DIR}\n`);

  // Read all JSON files from the directory
  const files = await readdir(ITINERARIES_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json')).map((f) => join(ITINERARIES_DIR, f));

  console.log(`Found ${jsonFiles.length} itinerary files\n`);

  // Process all files
  const results: MigrationResult[] = [];
  for (const file of jsonFiles) {
    const result = await processFile(file);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));

  const successful = results.filter((r) => r.status === 'success');
  const skipped = results.filter((r) => r.status === 'skipped');
  const errors = results.filter((r) => r.status === 'error');

  console.log(`\nTotal files: ${results.length}`);
  console.log(`✓ Successfully normalized: ${successful.length}`);
  console.log(`- Skipped (no changes): ${skipped.length}`);
  console.log(`✗ Errors: ${errors.length}`);

  if (successful.length > 0) {
    console.log('\n✓ Files normalized:');
    successful.forEach((r) => console.log(`  - ${r.file}`));
  }

  if (errors.length > 0) {
    console.log('\n✗ Files with errors:');
    errors.forEach((r) => console.log(`  - ${r.file}: ${r.error}`));
  }

  // Exit with error if any files failed
  if (errors.length > 0) {
    console.log('\n❌ Migration completed with errors');
    process.exit(1);
  }

  console.log('\n✅ Migration completed successfully');
}

// Run the migration
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

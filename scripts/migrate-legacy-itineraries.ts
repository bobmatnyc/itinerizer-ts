#!/usr/bin/env tsx

/**
 * Migration script: Assign legacy itineraries (createdBy: null) to a default user
 *
 * Usage:
 *   tsx scripts/migrate-legacy-itineraries.ts <email>
 *
 * Example:
 *   tsx scripts/migrate-legacy-itineraries.ts masa@example.com
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_EMAIL = process.argv[2];

if (!DEFAULT_EMAIL) {
  console.error('Usage: tsx scripts/migrate-legacy-itineraries.ts <email>');
  process.exit(1);
}

const DATA_DIR = join(process.cwd(), 'data', 'itineraries');

async function migrateItineraries() {
  console.log(`Migrating legacy itineraries to: ${DEFAULT_EMAIL}\n`);

  const files = await readdir(DATA_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  let migratedCount = 0;
  let skippedCount = 0;

  for (const file of jsonFiles) {
    const filePath = join(DATA_DIR, file);
    const content = await readFile(filePath, 'utf-8');
    const itinerary = JSON.parse(content);

    if (!itinerary.createdBy) {
      // Assign to default user
      itinerary.createdBy = DEFAULT_EMAIL;
      await writeFile(filePath, JSON.stringify(itinerary, null, 2), 'utf-8');
      console.log(`✓ Migrated: ${itinerary.title} (${itinerary.id})`);
      migratedCount++;
    } else {
      console.log(`- Skipped: ${itinerary.title} (already has createdBy: ${itinerary.createdBy})`);
      skippedCount++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Migrated: ${migratedCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  Total: ${jsonFiles.length}`);
}

migrateItineraries().catch(console.error);

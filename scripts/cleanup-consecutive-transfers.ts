#!/usr/bin/env tsx
/**
 * Clean up redundant agent-generated transfers in existing itinerary files
 *
 * Problem: Existing itineraries have consecutive transfers like:
 * - TRANSFER (source: import)
 * - TRANSFER (source: agent) ← This should be removed
 *
 * Rules for removal:
 * 1. If an agent-generated transfer is immediately preceded by an imported transfer, remove the agent one
 * 2. If an agent-generated transfer is immediately followed by an imported transfer, remove the agent one
 * 3. Keep imported transfers (they came from the PDF)
 * 4. Keep agent transfers that are NOT adjacent to other transfers
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Itinerary } from '../src/domain/types/itinerary.js';
import type { Segment } from '../src/domain/types/segment.js';

const DATA_DIR = join(process.cwd(), 'data', 'itineraries');

/**
 * Check if a segment is a transfer-like segment (TRANSFER or FLIGHT)
 */
function isTransferLike(segment: Segment | undefined): boolean {
  if (!segment) return false;
  return segment.type === 'TRANSFER' || segment.type === 'FLIGHT';
}

/**
 * Clean up consecutive transfers by removing redundant agent-generated ones
 */
function cleanupConsecutiveTransfers(segments: Segment[]): {
  cleaned: Segment[];
  removed: number;
  removedIds: string[];
} {
  const removedIds: string[] = [];

  const cleaned = segments.filter((segment, index) => {
    // Keep non-transfer segments
    if (segment.type !== 'TRANSFER') return true;

    // Keep imported transfers (they came from the PDF)
    if (segment.source === 'import') return true;

    // For agent transfers, check if adjacent to another transfer-like segment
    const prev = segments[index - 1];
    const next = segments[index + 1];

    const prevIsTransferLike = isTransferLike(prev);
    const nextIsTransferLike = isTransferLike(next);

    // Remove agent transfer if adjacent to another transfer-like segment
    if (prevIsTransferLike || nextIsTransferLike) {
      console.log(`  ✗ Removing redundant agent transfer at index ${index}:`);
      console.log(`    ID: ${segment.id}`);
      console.log(`    From: ${segment.pickupLocation?.name || 'unknown'}`);
      console.log(`    To: ${segment.dropoffLocation?.name || 'unknown'}`);
      console.log(`    Reason: Adjacent to ${prevIsTransferLike ? 'previous' : 'next'} ${prev?.type || next?.type}`);
      removedIds.push(segment.id);
      return false;
    }

    return true;
  });

  return {
    cleaned,
    removed: removedIds.length,
    removedIds
  };
}

/**
 * Process a single itinerary file
 */
async function processItinerary(filePath: string): Promise<{
  file: string;
  removed: number;
  removedIds: string[];
}> {
  const content = await readFile(filePath, 'utf-8');
  const itinerary: Itinerary = JSON.parse(content);

  console.log(`\nProcessing: ${filePath}`);
  console.log(`  Original segments: ${itinerary.segments.length}`);

  const { cleaned, removed, removedIds } = cleanupConsecutiveTransfers(itinerary.segments);

  if (removed > 0) {
    // Update itinerary with cleaned segments
    itinerary.segments = cleaned;
    itinerary.updatedAt = new Date().toISOString() as any;

    // Write back to file
    await writeFile(filePath, JSON.stringify(itinerary, null, 2) + '\n', 'utf-8');

    console.log(`  Cleaned segments: ${cleaned.length}`);
    console.log(`  ✓ Removed ${removed} redundant transfer(s)`);
  } else {
    console.log(`  ✓ No redundant transfers found`);
  }

  return {
    file: filePath,
    removed,
    removedIds
  };
}

/**
 * Main script execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Cleaning up redundant agent-generated transfers');
  console.log('='.repeat(80));

  // Read all JSON files in the itineraries directory
  const files = await readdir(DATA_DIR);
  const jsonFiles = files
    .filter(f => f.endsWith('.json'))
    .map(f => join(DATA_DIR, f));

  console.log(`\nFound ${jsonFiles.length} itinerary file(s)`);

  // Process each file
  const results = await Promise.all(
    jsonFiles.map(file => processItinerary(file))
  );

  // Summary report
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);
  const filesModified = results.filter(r => r.removed > 0).length;

  console.log(`Files processed: ${jsonFiles.length}`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total transfers removed: ${totalRemoved}`);

  if (totalRemoved > 0) {
    console.log('\nModified files:');
    results
      .filter(r => r.removed > 0)
      .forEach(r => {
        const fileName = r.file.split('/').pop();
        console.log(`  - ${fileName}: ${r.removed} transfer(s) removed`);
      });
  }

  console.log('\n✓ Cleanup complete!');
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Cleanup script to remove overnight gap transfers from existing itineraries
 *
 * Problem: Agent-generated transfers that span overnight gaps (e.g., dinner at 9PM → lunch at 12PM next day)
 * Solution: Remove agent-generated TRANSFER segments that span overnight gaps
 *
 * Usage: npx tsx scripts/cleanup-overnight-transfers.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import type { Segment, TransferSegment } from '../src/domain/types/segment.js';
import { isTransferSegment } from '../src/domain/types/segment.js';

interface Itinerary {
  id: string;
  title: string;
  segments: Segment[];
  [key: string]: unknown;
}

/**
 * Check if the time gap between two segments represents an overnight gap
 * Same logic as segment-continuity.service.ts
 */
function isOvernightGap(endTime: Date, startTime: Date): boolean {
  const endDay = endTime.toDateString();
  const startDay = startTime.toDateString();

  // Different days
  if (endDay !== startDay) {
    return true;
  }

  // Same day but >8 hours
  const hoursDiff = (startTime.getTime() - endTime.getTime()) / (1000 * 60 * 60);
  return hoursDiff > 8;
}

/**
 * Get the segment before a given index
 */
function getPreviousSegment(segments: Segment[], currentIndex: number): Segment | null {
  if (currentIndex === 0) {
    return null;
  }
  return segments[currentIndex - 1] || null;
}

/**
 * Get the segment after a given index
 */
function getNextSegment(segments: Segment[], currentIndex: number): Segment | null {
  if (currentIndex >= segments.length - 1) {
    return null;
  }
  return segments[currentIndex + 1] || null;
}

/**
 * Check if a transfer segment should be removed
 */
function shouldRemoveTransfer(
  transfer: TransferSegment,
  prevSegment: Segment | null,
  nextSegment: Segment | null
): boolean {
  // Only remove agent-generated transfers
  if (transfer.source !== 'agent') {
    return false;
  }

  // Check if transfer spans overnight gap with previous segment
  if (prevSegment && isOvernightGap(prevSegment.endDatetime, transfer.startDatetime)) {
    return true;
  }

  // Check if transfer spans overnight gap with next segment
  if (nextSegment && isOvernightGap(transfer.endDatetime, nextSegment.startDatetime)) {
    return true;
  }

  // Check if the transfer itself spans overnight (pickup to dropoff)
  if (isOvernightGap(transfer.startDatetime, transfer.endDatetime)) {
    return true;
  }

  return false;
}

/**
 * Process a single itinerary file
 */
function processItinerary(filePath: string): { removed: number; fileName: string } {
  const content = readFileSync(filePath, 'utf-8');
  const itinerary: Itinerary = JSON.parse(content);

  // Convert date strings to Date objects
  const segments = itinerary.segments.map(segment => ({
    ...segment,
    startDatetime: new Date(segment.startDatetime),
    endDatetime: new Date(segment.endDatetime),
  }));

  // Track segments to remove
  const segmentsToRemove: Set<number> = new Set();

  // Check each segment
  segments.forEach((segment, index) => {
    if (isTransferSegment(segment)) {
      const prevSegment = getPreviousSegment(segments, index);
      const nextSegment = getNextSegment(segments, index);

      if (shouldRemoveTransfer(segment as TransferSegment, prevSegment, nextSegment)) {
        segmentsToRemove.add(index);
        console.log(`  → Removing transfer: ${segment.id}`);
        console.log(`     From: ${(segment as TransferSegment).pickupLocation.name}`);
        console.log(`     To: ${(segment as TransferSegment).dropoffLocation.name}`);
        console.log(`     Time: ${segment.startDatetime.toISOString()} - ${segment.endDatetime.toISOString()}`);

        if (prevSegment) {
          const hoursDiff = (segment.startDatetime.getTime() - prevSegment.endDatetime.getTime()) / (1000 * 60 * 60);
          console.log(`     Gap from previous: ${hoursDiff.toFixed(1)} hours`);
        }
      }
    }
  });

  // If no changes, return early
  if (segmentsToRemove.size === 0) {
    return { removed: 0, fileName: filePath };
  }

  // Create new segments array without removed segments
  const cleanedSegments = segments.filter((_, index) => !segmentsToRemove.has(index));

  // Update itinerary
  const updatedItinerary = {
    ...itinerary,
    segments: cleanedSegments,
    updatedAt: new Date().toISOString(),
  };

  // Write back to file
  writeFileSync(filePath, JSON.stringify(updatedItinerary, null, 2));

  return { removed: segmentsToRemove.size, fileName: filePath };
}

/**
 * Main execution
 */
function main() {
  const itinerariesDir = resolve(process.cwd(), 'data/itineraries');
  const files = readdirSync(itinerariesDir).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} itinerary files to process\n`);

  let totalRemoved = 0;
  const cleanedFiles: string[] = [];

  files.forEach(file => {
    const filePath = join(itinerariesDir, file);
    console.log(`Processing: ${file}`);

    try {
      const result = processItinerary(filePath);

      if (result.removed > 0) {
        totalRemoved += result.removed;
        cleanedFiles.push(file);
        console.log(`  ✓ Removed ${result.removed} overnight transfer(s)\n`);
      } else {
        console.log(`  ✓ No overnight transfers found\n`);
      }
    } catch (error) {
      console.error(`  ✗ Error processing file: ${error}\n`);
    }
  });

  // Summary
  console.log('='.repeat(60));
  console.log('CLEANUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files processed: ${files.length}`);
  console.log(`Files cleaned: ${cleanedFiles.length}`);
  console.log(`Total overnight transfers removed: ${totalRemoved}`);

  if (cleanedFiles.length > 0) {
    console.log('\nCleaned files:');
    cleanedFiles.forEach(file => console.log(`  - ${file}`));
  }
}

// Run the script
main();

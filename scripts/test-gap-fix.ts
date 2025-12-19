#!/usr/bin/env tsx
/**
 * Test script to validate the consecutive transfer fix
 */

import { readFile } from 'node:fs/promises';
import { SegmentContinuityService } from '../src/services/segment-continuity.service.js';
import type { Itinerary } from '../src/domain/types/itinerary.js';

async function main() {
  const filePath = process.argv[2] || './data/itineraries/fa346c61-8458-42fa-8149-961e1f428a6a.json';

  console.log(`\n📋 Testing gap detection on: ${filePath}\n`);

  const content = await readFile(filePath, 'utf-8');
  const itinerary = JSON.parse(content) as Itinerary;

  // Parse dates
  itinerary.segments = itinerary.segments.map(seg => ({
    ...seg,
    startDatetime: new Date(seg.startDatetime),
    endDatetime: new Date(seg.endDatetime),
  }));

  const continuityService = new SegmentContinuityService();
  const sortedSegments = continuityService.sortSegments(itinerary.segments);

  console.log(`Total segments: ${sortedSegments.length}\n`);

  // Display first 5 segments
  console.log('First 5 segments:');
  for (let i = 0; i < Math.min(5, sortedSegments.length); i++) {
    const seg = sortedSegments[i];
    if (!seg) continue;

    const start = continuityService.getStartLocation(seg);
    const end = continuityService.getEndLocation(seg);
    const source = seg.source === 'import' ? '📄' : seg.source === 'agent' ? '🤖' : '👤';
    const inferred = seg.inferred ? '⚠️ INFERRED' : '';

    console.log(`${i + 1}. [${seg.type}] ${source} ${inferred}`);
    console.log(`   Start: ${start?.name || start?.code || 'N/A'}`);
    console.log(`   End: ${end?.name || end?.code || 'N/A'}`);
    console.log(`   Time: ${seg.startDatetime.toISOString()}`);
    console.log('');
  }

  // Detect gaps
  console.log('🔍 Detecting geographic gaps...\n');
  const gaps = continuityService.detectLocationGaps(sortedSegments);

  if (gaps.length === 0) {
    console.log('✅ No gaps detected! All segments are geographically continuous.\n');
  } else {
    console.log(`❌ Found ${gaps.length} gap(s):\n`);
    for (const gap of gaps) {
      console.log(`- ${gap.description}`);
      console.log(`  Between segments ${gap.beforeIndex + 1} and ${gap.afterIndex + 1}`);
      console.log(`  Suggested: ${gap.suggestedType}\n`);
    }
  }

  // Check for consecutive transfers
  console.log('🔍 Checking for consecutive transfers...\n');
  let consecutiveCount = 0;
  for (let i = 0; i < sortedSegments.length - 1; i++) {
    const current = sortedSegments[i];
    const next = sortedSegments[i + 1];

    if (!current || !next) continue;

    const isCurrentTransfer = current.type === 'FLIGHT' || current.type === 'TRANSFER';
    const isNextTransfer = next.type === 'FLIGHT' || next.type === 'TRANSFER';

    if (isCurrentTransfer && isNextTransfer) {
      consecutiveCount++;
      console.log(`⚠️  Consecutive transfers found:`);
      console.log(`   Segment ${i + 1}: ${current.type} (${current.source})`);
      console.log(`   Segment ${i + 2}: ${next.type} (${next.source}${next.inferred ? ', INFERRED' : ''})`);
      console.log('');
    }
  }

  if (consecutiveCount === 0) {
    console.log('✅ No consecutive transfers found!\n');
  }
}

main().catch(console.error);

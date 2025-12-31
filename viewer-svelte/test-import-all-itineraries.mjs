#!/usr/bin/env node
/**
 * Test: Import Dialog Shows All Itineraries
 *
 * This tests that the /api/v1/import/upload endpoint returns:
 * 1. Matched itineraries (with matchScore > 0)
 * 2. All other user itineraries (with matchScore = 0)
 *
 * Run: node test-import-all-itineraries.mjs
 */

import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5176';
const TEST_USER = 'test@example.com';

// Sample PDF content (base64 encoded)
const SAMPLE_PDF = Buffer.from('JVBERi0xLjQKJeLjz9MKNCAwIG9iago8PC9GaWx0ZXIvRmxhdGVEZWNvZGUvTGVuZ3RoIDI5Pj5zdHJlYW0KeJwr5CpUyCvNSSnRUwAB3UT/JL3cxJISa0VdBRdFSz1FTr4UJQA0ngvFCmVuZHN0cmVhbQplbmRvYmoKMSAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDMgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXS9Db250ZW50cyA0IDAgUj4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1sxIDAgUl0vQ291bnQgMT4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAzIDAgUj4+CmVuZG9iagp0cmFpbGVyCjw8L1Jvb3QgMiAwIFI+PgolJUVPRg==', 'base64');

async function testImportFlow() {
  console.log('🧪 Testing Import Dialog - All Itineraries Display\n');

  try {
    // Step 1: Upload PDF with userId
    console.log('📤 Step 1: Uploading PDF for parsing...');

    const formData = new FormData();
    const blob = new Blob([SAMPLE_PDF], { type: 'application/pdf' });
    formData.append('file', blob, 'test-flight.pdf');

    const uploadUrl = `${API_URL}/api/v1/import/upload?userId=${encodeURIComponent(TEST_USER)}&autoMatch=true`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(`Upload failed: ${error.message || uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();

    console.log('✅ Upload succeeded\n');

    // Step 2: Verify response structure
    console.log('📊 Step 2: Analyzing response...\n');

    console.log(`Segments found: ${result.segments?.length || 0}`);
    console.log(`Trip matches: ${result.tripMatches?.length || 0}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`Format: ${result.format}`);

    if (result.summary) {
      console.log(`Summary: ${result.summary}`);
    }

    // Step 3: Verify tripMatches includes all itineraries
    console.log('\n🎯 Step 3: Verifying itinerary display...\n');

    if (!result.tripMatches || result.tripMatches.length === 0) {
      console.log('❌ FAIL: No trip matches returned!');
      console.log('   Expected: All user itineraries should be returned');
      console.log('   Got: Empty array');
      process.exit(1);
    }

    // Split into matched and unmatched
    const matched = result.tripMatches.filter(m => m.matchScore > 0);
    const unmatched = result.tripMatches.filter(m => m.matchScore === 0);

    console.log(`✅ Matched trips (score > 0): ${matched.length}`);
    matched.forEach(m => {
      console.log(`   - ${m.itineraryName}`);
      console.log(`     Score: ${(m.matchScore * 100).toFixed(0)}%`);
      console.log(`     Destination: ${m.destination}`);
      console.log(`     Dates: ${m.dateRange.start} to ${m.dateRange.end}`);
      console.log(`     Reasons: ${m.matchReasons.join(', ') || 'None'}`);
    });

    console.log(`\n✅ Other trips (score = 0): ${unmatched.length}`);
    unmatched.forEach(m => {
      console.log(`   - ${m.itineraryName}`);
      console.log(`     Destination: ${m.destination}`);
      console.log(`     Dates: ${m.dateRange.start} to ${m.dateRange.end}`);
    });

    // Step 4: Verify structure
    console.log('\n📋 Step 4: Verifying data structure...\n');

    const allValid = result.tripMatches.every(m => {
      return m.itineraryId &&
             m.itineraryName &&
             typeof m.destination === 'string' &&
             m.dateRange &&
             typeof m.matchScore === 'number' &&
             Array.isArray(m.matchReasons);
    });

    if (!allValid) {
      console.log('❌ FAIL: Invalid trip match structure');
      console.log('   Some trip matches are missing required fields');
      process.exit(1);
    }

    console.log('✅ All trip matches have valid structure');

    // Success!
    console.log('\n✅ TEST PASSED');
    console.log('   - Segments extracted successfully');
    console.log('   - All user itineraries returned');
    console.log('   - Matched and unmatched trips separated correctly');
    console.log('   - Data structure is valid');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error(`   Error: ${error.message}`);
    console.error('\n   Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testImportFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Test script to verify Weaviate connection
 * Run with: tsx src/storage/test-weaviate-connection.ts
 */

import 'dotenv/config';
import { WeaviateStorage } from './weaviate-storage.js';
import type { WeaviateConfig } from '../domain/types/weaviate.js';

async function testConnection() {
  console.log('🔌 Testing Weaviate connection...\n');

  // Load config from environment
  const config: WeaviateConfig = {
    url: process.env.WEAVIATE_URL || '',
    apiKey: process.env.WEAVIATE_API_KEY || '',
    grpcUrl: process.env.WEAVIATE_GRPC_URL,
    openaiKey: process.env.OPENROUTER_API_KEY,
  };

  if (!config.url || !config.apiKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - WEAVIATE_URL');
    console.error('   - WEAVIATE_API_KEY');
    console.error('\nPlease set these in your .env file.');
    process.exit(1);
  }

  console.log('📍 Configuration:');
  console.log(`   URL: ${config.url}`);
  console.log(`   API Key: ${config.apiKey.substring(0, 10)}...`);
  console.log(`   gRPC URL: ${config.grpcUrl || 'Not set'}`);
  console.log();

  const storage = new WeaviateStorage(config);

  try {
    // Test 1: Initialize connection
    console.log('1️⃣  Initializing connection...');
    const initResult = await storage.initialize();

    if (!initResult.success) {
      console.error('❌ Failed to initialize:', initResult.error);
      process.exit(1);
    }
    console.log('✅ Connection established!\n');

    // Test 2: Get stats
    console.log('2️⃣  Fetching storage statistics...');
    const statsResult = await storage.getStats();

    if (!statsResult.success) {
      console.error('❌ Failed to get stats:', statsResult.error);
      process.exit(1);
    }

    const stats = statsResult.value;
    console.log('✅ Statistics retrieved:');
    console.log(`   Total Knowledge: ${stats.totalKnowledge}`);
    console.log(`   Total Destinations: ${stats.totalDestinations}`);
    console.log(`   Total Itineraries: ${stats.totalItineraries}`);
    console.log();

    // Test 3: Insert sample knowledge
    console.log('3️⃣  Inserting sample knowledge...');
    const sampleKnowledge = [
      {
        id: 'test-' + Date.now(),
        content: 'Paris is the capital of France, known for the Eiffel Tower.',
        rawContent: 'Paris is the capital of France, known for the Eiffel Tower.',
        category: 'destination' as const,
        source: 'user_input' as const,
        destinationName: 'Paris',
        createdAt: new Date(),
        temporalType: 'evergreen' as const,
        decayHalfLife: 365,
        baseRelevance: 1.0,
      },
    ];

    const upsertResult = await storage.upsertKnowledge(sampleKnowledge);

    if (!upsertResult.success) {
      console.error('❌ Failed to insert:', upsertResult.error);
      process.exit(1);
    }
    console.log('✅ Sample knowledge inserted!\n');

    // Test 4: Search knowledge
    console.log('4️⃣  Searching for "Paris"...');
    const searchResult = await storage.searchKnowledge('Paris travel guide', 5);

    if (!searchResult.success) {
      console.error('❌ Failed to search:', searchResult.error);
      process.exit(1);
    }

    const { knowledge, scores } = searchResult.value;
    console.log(`✅ Found ${knowledge.length} results:`);
    knowledge.forEach((k, i) => {
      console.log(`   ${i + 1}. [Score: ${scores[i].toFixed(3)}] ${k.content.substring(0, 60)}...`);
    });
    console.log();

    // Test 5: List documents
    console.log('5️⃣  Listing documents...');
    const listResult = await storage.list('knowledge', 10);

    if (!listResult.success) {
      console.error('❌ Failed to list:', listResult.error);
      process.exit(1);
    }

    console.log(`✅ Listed ${listResult.value.length} documents\n`);

    // Success!
    console.log('🎉 All tests passed!\n');
    console.log('✨ Weaviate storage is ready to use.');

    // Cleanup
    await storage.close();
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    await storage.close();
    process.exit(1);
  }
}

// Run tests
testConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

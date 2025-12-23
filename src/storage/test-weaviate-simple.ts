/**
 * Simple test script to verify Weaviate connection
 * Run with: tsx src/storage/test-weaviate-simple.ts
 */

import 'dotenv/config';
import { WeaviateStorageSimple } from './weaviate-storage-simple.js';
import type { WeaviateConfig } from '../domain/types/weaviate.js';

async function testConnection() {
  console.log('🔌 Testing Weaviate Cloud connection...\n');

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
  console.log(`   API Key: ${config.apiKey.substring(0, 10)}***`);
  console.log(`   gRPC URL: ${config.grpcUrl || 'Not set'}\n`);

  const storage = new WeaviateStorageSimple(config);

  try {
    // Test 1: Initialize connection
    console.log('1️⃣  Testing connection...');
    const initResult = await storage.initialize();

    if (!initResult.success) {
      console.error('\n❌ Connection failed!');
      console.error('Error:', JSON.stringify(initResult.error, null, 2));
      console.error('\n💡 Troubleshooting tips:');
      console.error('   1. Verify your Weaviate Cloud cluster is running');
      console.error('   2. Check that your API key is valid and not expired');
      console.error('   3. Ensure the URL matches your cluster (no https:// prefix needed)');
      console.error('   4. Try regenerating your API key in the Weaviate Cloud console\n');
      process.exit(1);
    }

    console.log('\n🎉 Connection successful!\n');
    console.log('✨ Weaviate Cloud is ready to use.');
    console.log('\nNext steps:');
    console.log('   1. Implement schema creation');
    console.log('   2. Add knowledge insertion');
    console.log('   3. Add vector search');
    console.log('   4. Add temporal decay calculations\n');

    // Cleanup
    await storage.close();
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    await storage.close();
    process.exit(1);
  }
}

// Run test
testConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

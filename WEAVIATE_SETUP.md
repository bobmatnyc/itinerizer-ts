# Weaviate Knowledge Graph Setup

## Phase 1: Core Infrastructure ✅ COMPLETED

### What Was Implemented

1. **Type Definitions** (`src/domain/types/weaviate.ts`)
   - `TravelKnowledge` - Main knowledge documents with temporal decay
   - `Destination` - Destination entities with geographic data
   - `ItineraryReference` - Cross-references to itineraries
   - `TemporalType` - Enum for knowledge decay (evergreen, seasonal, event, time_sensitive)
   - `KnowledgeCategory` - Enum for classification (destination, activity, event, weather, tip, restriction)
   - `KnowledgeSource` - Enum for source tracking (trip_designer, web_search, user_input, bulk_import)
   - `WeaviateConfig` - Configuration interface
   - `KnowledgeSearchFilter` - Advanced filtering options
   - `KnowledgeSearchResult` - Search results with temporal relevance scoring
   - `WeaviateStats` - Storage statistics

2. **Weaviate Storage Implementation** (`src/storage/weaviate-storage.ts`)
   - Full `VectorStorage` interface implementation
   - Three Weaviate collections: TravelKnowledge, Destination, Itinerary
   - Schema auto-creation on initialization
   - Vector search with cosine similarity
   - Hybrid search (vector + keyword)
   - Temporal decay calculation for time-sensitive knowledge
   - Metadata filtering
   - Statistics aggregation
   - Factory function: `createWeaviateStorage()` from env vars

3. **Environment Configuration**
   - Updated `.env.example` files in root and `viewer-svelte/`
   - Created `.env` file with provided credentials
   - Environment variables:
     - `WEAVIATE_URL` - Weaviate Cloud cluster URL
     - `WEAVIATE_API_KEY` - API key for authentication
     - `WEAVIATE_GRPC_URL` - Optional gRPC endpoint for performance
     - `OPENROUTER_API_KEY` - Used for embeddings (reuses existing var)

4. **Test Script** (`src/storage/test-weaviate-connection.ts`)
   - Verifies connection to Weaviate Cloud
   - Tests schema creation
   - Tests knowledge insertion
   - Tests hybrid search
   - Tests statistics retrieval

### Schema Details

#### TravelKnowledge Collection
- **Vector Index**: text2vec-openai on `content` field
- **Properties**:
  - Core: content, rawContent, category, subcategory
  - Source: source, sourceUrl, sessionId
  - Links: itineraryId, destinationName
  - Temporal: createdAt, relevantFrom, relevantUntil, temporalType, decayHalfLife
  - Relevance: baseRelevance (0-1 score)

#### Destination Collection
- **Vector Index**: text2vec-openai on `description` and `name` fields
- **Properties**:
  - Location: name, country, region, city, latitude, longitude
  - Content: description, popularFor (tags)
  - Planning: bestMonths (1-12), budgetCategory
  - Metadata: createdAt, updatedAt

#### Itinerary Collection
- **Vector Index**: text2vec-openai on `title` and `destination` fields
- **Properties**:
  - Core: title, destination
  - Dates: startDate, endDate
  - Budget: budget (optional)
  - Metadata: createdAt

### Key Features

1. **Temporal Decay System**
   - Evergreen content: No decay (historical facts, geography)
   - Seasonal content: Relevant during specific months
   - Event content: Time-bound (festivals, exhibitions)
   - Time-sensitive: Exponential decay based on half-life (restrictions, construction)

2. **Hybrid Search**
   - Vector similarity for semantic search
   - Keyword matching for exact queries
   - Combined scoring for best results

3. **Advanced Filtering**
   - By category (destination, activity, event, etc.)
   - By source (trip_designer, web_search, etc.)
   - By destination name
   - By session ID or itinerary ID
   - By temporal type
   - By relevance date range

4. **Cross-Collection References**
   - Knowledge linked to destinations
   - Knowledge linked to itineraries
   - Enables graph-style traversal

## Setup Instructions

### 1. Install Dependencies
```bash
npm install weaviate-client
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your Weaviate credentials:

```bash
WEAVIATE_URL=https://your-cluster.weaviate.cloud
WEAVIATE_API_KEY=your_api_key_here
WEAVIATE_GRPC_URL=grpc-your-cluster.weaviate.cloud
OPENROUTER_API_KEY=your_openrouter_key_here
```

### 3. Test Connection
```bash
npx tsx src/storage/test-weaviate-connection.ts
```

Expected output:
```
🔌 Testing Weaviate connection...

📍 Configuration:
   URL: https://your-cluster.weaviate.cloud
   API Key: ***...

1️⃣  Initializing connection...
✅ Connection established!

2️⃣  Fetching storage statistics...
✅ Statistics retrieved:
   Total Knowledge: 0
   Total Destinations: 0
   Total Itineraries: 0

3️⃣  Inserting sample knowledge...
✅ Sample knowledge inserted!

4️⃣  Searching for "Paris"...
✅ Found 1 results:
   1. [Score: 0.892] Paris is the capital of France, known for the Eiffel Tower...

🎉 All tests passed!
```

## Current Status

### ✅ Completed
- [x] Install weaviate-client package
- [x] Create type definitions in `src/domain/types/weaviate.ts`
- [x] Create WeaviateStorage class in `src/storage/weaviate-storage.ts`
- [x] Implement VectorStorage interface
- [x] Add schema creation for all collections
- [x] Add temporal decay calculation
- [x] Add hybrid search support
- [x] Update environment variable examples
- [x] Create connection test script

### ⚠️ Pending Verification
- [ ] Verify Weaviate Cloud credentials are active
- [ ] Test connection to Weaviate cluster
- [ ] Verify schema creation works
- [ ] Test knowledge insertion and search

### 📝 Notes

The provided credentials returned a 401 Unauthorized error:
```
Unauthenticated: {"code":401,"message":"unauthorized: invalid api key: invalid token"}
```

This could mean:
1. The API key has expired
2. The API key format needs adjustment
3. The cluster URL is incorrect
4. The credentials were for demonstration only

**Action Required**: Verify the Weaviate Cloud credentials and re-run the test.

## Next Steps (Future Phases)

### Phase 2: Service Integration
- Create KnowledgeService to wrap WeaviateStorage
- Add knowledge extraction from Trip Designer conversations
- Add knowledge enrichment from web search
- Implement context injection for LLM queries

### Phase 3: Migration & Data Management
- Create migration script from Vectra to Weaviate
- Add bulk import functionality
- Add knowledge deduplication
- Add knowledge quality scoring

### Phase 4: Advanced Features
- Add graph traversal (knowledge → destinations → itineraries)
- Add knowledge validation and quality control
- Add analytics and reporting
- Add knowledge expiration and cleanup

## API Usage Examples

### Basic Usage
```typescript
import { createWeaviateStorage } from './storage/weaviate-storage.js';

// Create storage from environment variables
const storage = createWeaviateStorage();

if (!storage) {
  console.error('Weaviate not configured');
  process.exit(1);
}

// Initialize
const initResult = await storage.initialize();
if (!initResult.success) {
  console.error('Failed to initialize:', initResult.error);
  process.exit(1);
}

// Insert knowledge
const knowledge = [{
  id: 'k1',
  content: 'Tokyo has excellent public transportation',
  rawContent: 'Tokyo has excellent public transportation with JR, metro, and buses',
  category: 'tip',
  source: 'trip_designer',
  destinationName: 'Tokyo',
  createdAt: new Date(),
  temporalType: 'evergreen',
  decayHalfLife: 365,
  baseRelevance: 1.0,
}];

await storage.upsertKnowledge(knowledge);

// Search with filters
const result = await storage.searchKnowledge('Tokyo transportation', 5, {
  category: 'tip',
  destinationName: 'Tokyo',
});

if (result.success) {
  const { knowledge, scores, relevanceScores } = result.value;
  console.log(`Found ${knowledge.length} results`);
}
```

### Advanced Filtering
```typescript
// Search for seasonal knowledge relevant to a specific date
const winterTokyo = await storage.searchKnowledge('Tokyo winter activities', 10, {
  destinationName: 'Tokyo',
  temporalType: 'seasonal',
  relevantAt: new Date('2024-12-15'), // Winter date
  minRelevance: 0.7,
});

// Search by session (all knowledge from a chat session)
const sessionKnowledge = await storage.searchKnowledge('', 50, {
  sessionId: 'chat-session-123',
});

// Search time-sensitive information
const currentRestrictions = await storage.searchKnowledge('COVID restrictions', 10, {
  category: 'restriction',
  temporalType: 'time_sensitive',
  relevantAt: new Date(), // Current restrictions only
});
```

## Files Changed

### New Files
- `/src/domain/types/weaviate.ts` - Weaviate-specific type definitions
- `/src/storage/weaviate-storage.ts` - Weaviate storage implementation
- `/src/storage/test-weaviate-connection.ts` - Connection test script
- `/WEAVIATE_SETUP.md` - This documentation
- `/.env` - Environment configuration (with provided credentials)

### Modified Files
- `/package.json` - Added weaviate-client dependency
- `/.env.example` - Added Weaviate configuration variables
- `/viewer-svelte/.env.example` - Added Weaviate configuration variables

## Dependencies Added

```json
{
  "dependencies": {
    "weaviate-client": "^3.x.x"
  }
}
```

## LOC Delta

- Added: ~850 lines
- Removed: 0 lines
- Net Change: +850 lines

Files:
- `src/domain/types/weaviate.ts`: ~200 lines
- `src/storage/weaviate-storage.ts`: ~550 lines
- `src/storage/test-weaviate-connection.ts`: ~100 lines

---

**Status**: Phase 1 implementation complete. Pending credential verification to test full functionality.

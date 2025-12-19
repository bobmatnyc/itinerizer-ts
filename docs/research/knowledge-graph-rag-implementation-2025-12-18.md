# Knowledge Graph & RAG Implementation Research

**Research Date:** 2025-12-18
**Project:** Itinerizer Travel Chatbot
**Objective:** Design a knowledge graph with RAG capabilities for travel itinerary chatbot with local development and Vercel production deployment support

---

## Executive Summary

This research analyzes vector database options, embedding models, and RAG implementation strategies for a TypeScript-based travel itinerary chatbot. The solution must support both local file-based development and Vercel serverless production deployment.

### Key Recommendations

1. **Vector Storage**: Upstash Vector (production) + Vectra (local development)
2. **Embedding Model**: Voyage AI voyage-3-lite via API
3. **Abstraction Layer**: Custom TypeScript interface following repository's Result<T, E> pattern
4. **Chunking Strategy**: Semantic chunking with 256-512 tokens and 10-20% overlap

---

## 1. Current Architecture Analysis

### Existing Patterns

The project already demonstrates mature architecture patterns:

**Storage Abstraction (`src/storage/storage.interface.ts`)**
- Interface-based design with `ItineraryStorage` abstraction
- Result-based error handling: `Result<T, StorageError>`
- Async operations with explicit initialization
- Summary views for list operations

**Service Layer (`src/services/`)**
- LLM integration via OpenRouter (Claude 3.5 Sonnet)
- File-based JSON storage in `data/` directory
- Cost tracking with usage metrics
- YAML configuration management

**Technology Stack**
- TypeScript 5.7
- Node.js 20+
- Express.js for API server
- Zod for schema validation
- OpenAI SDK for LLM calls (via OpenRouter)
- File-based storage (JSON/YAML)

### Integration Points

The chatbot will need to integrate with:
- Existing LLM service (`src/services/llm.service.ts`)
- Express API server (`src/server/api.ts`)
- Current storage patterns (`storage.interface.ts`)
- Itinerary and segment services

---

## 2. Vector Database Options

### 2.1 Production (Vercel-Compatible)

#### Option A: Upstash Vector ⭐ **RECOMMENDED**

**Pros:**
- Native Vercel Marketplace integration with automated provisioning
- Serverless pay-per-request pricing (no idle costs)
- 99.99% uptime SLA
- Global low-latency edge support
- Integrated billing through Vercel
- Zero-downtime migrations
- Supports similarity search with cosine/euclidean distance

**Cons:**
- Pricing not published for free tier limits
- Requires external service dependency
- May have higher latency than Postgres for co-located queries

**Pricing:** Pay-per-request model (free tier available, exact limits TBD)

**References:**
- [Upstash for Vercel](https://vercel.com/marketplace/upstash)
- [Vercel Marketplace Integration](https://vercel.com/changelog/upstash-joins-the-vercel-marketplace)

---

#### Option B: Vercel Postgres with pgvector

**Pros:**
- Built on Neon with native pgvector extension support
- Collocated with existing data (if using Postgres for other storage)
- SQL queries + vector similarity in one database
- LangChain.js integration available
- 60 compute hours free on Hobby plan

**Cons:**
- More expensive than dedicated vector databases at scale
- Requires Postgres knowledge for optimization
- Free tier has hard limits (no overages)
- Cold start delays on Hobby tier
- Markup over direct Neon pricing

**Pricing:**
- Hobby: 60 compute hours (free, no credit card)
- Pro: $20/user/month + 100 compute hours

**References:**
- [Vercel Postgres pgvector Starter](https://vercel.com/templates/next.js/postgres-pgvector)
- [Vercel Postgres Pricing](https://vercel.com/docs/storage/vercel-postgres/usage-and-pricing)

---

### 2.2 Local Development

#### Option A: Vectra ⭐ **RECOMMENDED**

**Pros:**
- File-system based (similar to current JSON storage pattern)
- Pure JavaScript/TypeScript (no external dependencies)
- Works offline
- No Docker/infrastructure required
- Compatible with existing development workflow
- Lightweight and fast for small datasets

**Cons:**
- Not suitable for production scale
- Limited advanced features vs. Pinecone/Weaviate
- Manual index management

**Use Case:** Perfect for local development and testing

**References:**
- [Vectra on GitHub](https://github.com/topics/vector-database?l=typescript)
- [Local Vector Databases](https://mehmetakar.dev/local-vector-databases/)

---

#### Option B: In-Memory (MemoryVectorStore)

**Pros:**
- Zero setup required
- Fast for development/testing
- Works with LangChain.js
- No persistence needed for ephemeral tests

**Cons:**
- Data lost on restart
- Not suitable for persistent development state
- Limited to available RAM

**Use Case:** Unit tests and quick prototyping

---

### 2.3 Hybrid Option: Qdrant (Docker)

**Pros:**
- Can run locally via Docker
- Can deploy to cloud for production
- Advanced filtering and payload support
- Strong TypeScript SDK

**Cons:**
- Requires Docker for local development
- Additional infrastructure management
- Not native Vercel integration (requires separate hosting)

**Use Case:** If you need more control and are willing to manage infrastructure

**References:**
- [Qdrant Semantic Search](https://encore.dev/blog/qdrant-semantic-search)

---

## 3. Embedding Model Evaluation

### 3.1 API-Based Embeddings ⭐ **RECOMMENDED FOR PRODUCTION**

#### Voyage AI (voyage-3-lite)

**Pros:**
- State-of-the-art accuracy (built by Stanford researchers)
- 32K context length (vs OpenAI's 8K)
- Optimized for RAG with "tricky negatives" training
- Lower cost for lite model
- Multilingual support

**Performance:**
- Outperforms OpenAI by 9.74%
- Outperforms Cohere by 20.71%
- Best for retrieval accuracy

**Pricing:** ~$0.10/1M tokens (voyage-3-lite estimated)

**References:**
- [Voyage-3-large announcement](https://blog.voyageai.com/2025/01/07/voyage-3-large/)
- [Best Embedding Models 2025](https://elephas.app/blog/best-embedding-models)

---

#### OpenAI (text-embedding-3-small)

**Pros:**
- Well-tested and reliable
- 1536 dimensions
- Good documentation
- OpenAI SDK already in dependencies

**Performance:**
- Solid general-purpose embeddings
- 8K token context limit
- Good multilingual support

**Pricing:** $0.02/1M tokens

**Cons:**
- Lower accuracy than Voyage AI
- Shorter context window

**References:**
- [Embedding Models Comparison](https://research.aimultiple.com/embedding-models/)

---

#### Cohere Embed v3

**Pros:**
- Strong multilingual capabilities
- 1024 dimensions
- Good for non-English content

**Pricing:** $0.10/1M tokens

**Cons:**
- Lower accuracy in benchmarks
- 512 token context (v3 English)

---

### 3.2 Local Embeddings

#### Sentence Transformers (via transformers.js)

**Pros:**
- Fully offline and private
- No API costs
- Works in browser via WASM
- 100+ pre-trained models available

**Models:**
- `all-MiniLM-L6-v2`: 384 dimensions, 80MB, 14K sentences/sec on CPU
- `all-mpnet-base-v2`: 768 dimensions, higher quality
- `paraphrase-multilingual-mpnet-base-v2`: Multilingual support

**Cons:**
- Lower accuracy than API models
- Requires compute resources
- Model downloads (80MB-1GB)
- Slower inference

**Use Case:** Privacy-sensitive environments or offline requirements

**References:**
- [Next-Gen Embeddings 2025](https://www.gocodeo.com/post/next-gen-embeddings-in-2025-transformers-instruction-tuning-multimodal-vectors)
- [RxDB JavaScript Vector Database](https://rxdb.info/articles/javascript-vector-database.html)

---

### Recommendation: Hybrid Approach

**Development:**
- Use Voyage AI API (matches production)
- Fallback to sentence-transformers for offline work

**Production:**
- Voyage AI voyage-3-lite for embeddings
- Upstash Vector for storage

**Reasoning:**
- Best accuracy for RAG retrieval
- Consistent embeddings between dev/prod
- Low cost ($0.10/1M tokens)
- 32K context handles long conversations

---

## 4. Storage Abstraction Design

### 4.1 Interface Design

Following the existing `ItineraryStorage` pattern, create a new `VectorStorage` interface:

```typescript
/**
 * Vector storage interface for embeddings and semantic search
 */
export interface VectorStorage<TMetadata = Record<string, unknown>> {
  /** Initialize storage (create indexes/collections if needed) */
  initialize(): Promise<Result<void, StorageError>>;

  /** Store vectors with metadata */
  upsert(vectors: VectorRecord<TMetadata>[]): Promise<Result<void, StorageError>>;

  /** Search for similar vectors */
  search(params: SearchParams): Promise<Result<SearchResult<TMetadata>[], StorageError>>;

  /** Delete vectors by ID */
  delete(ids: string[]): Promise<Result<void, StorageError>>;

  /** Delete all vectors in a namespace */
  deleteNamespace(namespace: string): Promise<Result<void, StorageError>>;

  /** Check if storage is healthy */
  healthCheck(): Promise<Result<boolean, StorageError>>;
}

/**
 * Vector record with embedding and metadata
 */
export interface VectorRecord<TMetadata = Record<string, unknown>> {
  /** Unique identifier */
  id: string;

  /** Vector embedding (array of numbers) */
  vector: number[];

  /** Namespace for logical separation (e.g., 'chat-history', 'itinerary-data') */
  namespace: string;

  /** Metadata for filtering and display */
  metadata: TMetadata;
}

/**
 * Search parameters for similarity search
 */
export interface SearchParams {
  /** Query vector */
  vector: number[];

  /** Namespace to search in */
  namespace: string;

  /** Number of results to return */
  topK?: number;

  /** Minimum similarity score (0-1) */
  minScore?: number;

  /** Metadata filters */
  filter?: Record<string, unknown>;
}

/**
 * Search result with score
 */
export interface SearchResult<TMetadata = Record<string, unknown>> {
  /** Record ID */
  id: string;

  /** Similarity score (0-1, higher is more similar) */
  score: number;

  /** Original metadata */
  metadata: TMetadata;
}
```

### 4.2 Implementation Strategy

Create swappable implementations:

```typescript
// Local development
class VectraVectorStorage implements VectorStorage { ... }

// Production (Vercel)
class UpstashVectorStorage implements VectorStorage { ... }

// In-memory (testing)
class InMemoryVectorStorage implements VectorStorage { ... }
```

### 4.3 Factory Pattern

```typescript
export function createVectorStorage(config: {
  environment: 'development' | 'production' | 'test';
  upstashUrl?: string;
  upstashToken?: string;
  vectraPath?: string;
}): VectorStorage {
  if (config.environment === 'production') {
    return new UpstashVectorStorage({
      url: config.upstashUrl!,
      token: config.upstashToken!,
    });
  }

  if (config.environment === 'test') {
    return new InMemoryVectorStorage();
  }

  return new VectraVectorStorage({
    storagePath: config.vectraPath ?? './data/vectors',
  });
}
```

---

## 5. Chat Content Storage Schema

### 5.1 Metadata Types

```typescript
/**
 * Chat message metadata
 */
export interface ChatMessageMetadata {
  /** Message ID */
  messageId: string;

  /** Session/conversation ID */
  sessionId: string;

  /** Message timestamp */
  timestamp: string;

  /** Role (user or assistant) */
  role: 'user' | 'assistant';

  /** Original message text */
  content: string;

  /** Chunk index (for long messages) */
  chunkIndex?: number;

  /** Total chunks (for long messages) */
  totalChunks?: number;

  /** Detected intent (search, modify, view) */
  intent?: string;

  /** Extracted entities (cities, dates, activities) */
  entities?: {
    cities?: string[];
    countries?: string[];
    dates?: string[];
    activities?: string[];
    hotels?: string[];
  };
}

/**
 * Travel entity metadata
 */
export interface TravelEntityMetadata {
  /** Entity ID */
  entityId: string;

  /** Entity type */
  type: 'destination' | 'activity' | 'hotel' | 'flight' | 'restaurant';

  /** Entity name */
  name: string;

  /** Location (city, country) */
  location?: {
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };

  /** Associated itinerary IDs */
  itineraryIds?: string[];

  /** Source (user input, LLM suggestion, external API) */
  source: 'user' | 'llm' | 'api';

  /** Confidence score (0-1) */
  confidence?: number;
}
```

### 5.2 Namespaces

Organize vectors by namespace:

- `chat-history`: Sanitized chat messages for conversation context
- `travel-entities`: Extracted places, activities, hotels
- `itinerary-summaries`: High-level trip descriptions
- `user-preferences`: Learned user preferences over time

---

## 6. Chunking Strategy

### 6.1 Semantic Chunking ⭐ **RECOMMENDED**

**Approach:** Group sentences by semantic meaning rather than fixed token counts.

**Benefits:**
- 70% accuracy improvement over fixed chunking
- Preserves context and coherence
- Better retrieval quality

**Implementation:**
1. Split conversation into sentences
2. Generate embeddings for each sentence
3. Calculate similarity between consecutive sentences
4. Group similar sentences together
5. Ensure chunks stay within 256-512 token range

**References:**
- [Best Chunking Strategies for RAG 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
- [Semantic Chunking for RAG](https://www.multimodal.dev/post/semantic-chunking-for-rag)

---

### 6.2 Parameters

**Optimal Chunk Size:** 256-512 tokens
- Balance between context and retrieval precision
- Fits within embedding model context windows
- Manageable for LLM processing

**Overlap:** 10-20% (25-100 tokens)
- For 500-token chunk: 50-100 token overlap
- Preserves context across chunk boundaries
- Prevents information loss at edges

**References:**
- [Document Chunking for RAG](https://langcopilot.com/posts/2025-10-11-document-chunking-for-rag-practical-guide)

---

### 6.3 Conversation Memory Management

For long chat sessions, implement tiered memory:

**Working Memory (Recent Context)**
- Last 5-10 messages
- Stored in fast Redis/Vercel KV
- Always included in LLM context

**Long-Term Memory (Vector Search)**
- Older messages (>10 turns)
- Compressed summaries
- Retrieved via semantic search when relevant

**Architecture:**
```
User Query
    ↓
[Working Memory: Last 10 messages] ← Always included
    +
[Vector Search: Retrieve top 5 relevant past chunks] ← Conditionally included
    ↓
Combined Context → LLM
```

**References:**
- [Handling Long Chat Histories in RAG](https://www.chitika.com/strategies-handling-long-chat-rag/)
- [Conversational RAG & Memory Management](https://medium.com/@noumannawaz/lesson-13-conversational-rag-memory-management-958fd205eff0)

---

### 6.4 Message Chunking for Travel Chatbot

**User Messages:**
- Usually short (1-2 sentences)
- Store as single chunks
- Extract entities for separate entity vectors

**Assistant Responses:**
- Can be long (itinerary details, recommendations)
- Split by semantic boundaries (e.g., per destination or per segment)
- Maintain metadata linking chunks together

**Example:**
```
User: "Plan a 5-day trip to Rome"

Assistant Response (chunked):
Chunk 1: "Here's a 5-day Rome itinerary. Day 1: Arrival and Colosseum..."
Chunk 2: "Day 2: Vatican Museums and Sistine Chapel..."
Chunk 3: "Day 3: Roman Forum, Palatine Hill..."

Each chunk:
- Has same sessionId and messageId
- Different chunkIndex (0, 1, 2)
- Embedded separately for focused retrieval
```

---

## 7. Proposed Architecture

### 7.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Travel Chatbot API                       │
│                     (Express.js Server)                      │
└──────────┬──────────────────────────────────┬────────────────┘
           │                                  │
           ↓                                  ↓
    ┌──────────────┐                  ┌──────────────────┐
    │  Chat Service │                  │ Embedding Service│
    │              │                  │  (Voyage AI)     │
    └──────┬───────┘                  └────────┬─────────┘
           │                                   │
           ↓                                   ↓
    ┌─────────────────────────────────────────────────┐
    │          Vector Storage Interface               │
    ├──────────────┬──────────────────┬───────────────┤
    │  Development │    Production    │     Testing   │
    │   (Vectra)   │ (Upstash Vector) │  (In-Memory)  │
    └──────────────┴──────────────────┴───────────────┘
           │                │                  │
           ↓                ↓                  ↓
    File System    Upstash Cloud        RAM Storage
```

### 7.2 Data Flow

**Storing a Chat Message:**
```
1. User sends message → Chat Service
2. Sanitize message (remove PII if needed)
3. Extract entities (cities, dates, activities)
4. Split long messages into semantic chunks
5. Generate embeddings via Voyage AI
6. Store vectors with metadata → Vector Storage
7. Optionally store entities separately with entity namespace
```

**Retrieving Context for RAG:**
```
1. User asks new question
2. Generate query embedding
3. Search vector storage:
   - namespace: 'chat-history'
   - topK: 5
   - include recent working memory
4. Combine retrieved chunks with working memory
5. Send to LLM as context
6. LLM generates response
```

### 7.3 Environment Configuration

```typescript
// .env.development
VECTOR_STORAGE=vectra
VECTRA_STORAGE_PATH=./data/vectors
EMBEDDING_MODEL=voyage-3-lite
VOYAGE_API_KEY=sk-...

// .env.production (Vercel)
VECTOR_STORAGE=upstash
UPSTASH_VECTOR_URL=https://...
UPSTASH_VECTOR_TOKEN=...
EMBEDDING_MODEL=voyage-3-lite
VOYAGE_API_KEY=sk-...
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `VectorStorage` interface
- [ ] Implement `VectraVectorStorage` for local development
- [ ] Create `EmbeddingService` abstraction
- [ ] Integrate Voyage AI embeddings
- [ ] Write unit tests with `InMemoryVectorStorage`

### Phase 2: Chat Integration (Week 2)
- [ ] Create `ChatHistoryService` using vector storage
- [ ] Implement semantic chunking logic
- [ ] Add entity extraction from messages
- [ ] Build message sanitization pipeline
- [ ] Test locally with Vectra

### Phase 3: Production Setup (Week 3)
- [ ] Implement `UpstashVectorStorage`
- [ ] Set up Upstash in Vercel Marketplace
- [ ] Configure environment variables
- [ ] Deploy to Vercel staging
- [ ] Run integration tests

### Phase 4: RAG Implementation (Week 4)
- [ ] Implement context retrieval logic
- [ ] Add working memory + vector search combination
- [ ] Integrate with existing LLM service
- [ ] Implement conversation memory management
- [ ] Test end-to-end RAG pipeline

### Phase 5: Optimization (Week 5)
- [ ] Add caching for frequent queries
- [ ] Optimize chunk sizes based on metrics
- [ ] Implement entity linking
- [ ] Add monitoring and logging
- [ ] Performance tuning

---

## 9. Library Recommendations

### Core Dependencies

```json
{
  "dependencies": {
    "@upstash/vector": "^1.1.0",
    "vectra": "^0.8.0",
    "@langchain/core": "^0.3.0",
    "voyage-ai": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2"
  }
}
```

### Alternative Embeddings (if needed)

```json
{
  "dependencies": {
    "openai": "^6.14.0",
    "@xenova/transformers": "^2.17.0"
  }
}
```

---

## 10. Cost Estimates

### Embeddings (Voyage AI voyage-3-lite)

**Assumptions:**
- 100 chat messages/day
- 500 tokens average per message (including chunking)
- 30 days/month

**Calculation:**
- 100 messages × 500 tokens × 30 days = 1.5M tokens/month
- Cost: ~$0.15/month

### Vector Storage (Upstash Vector)

**Pricing Model:** Pay-per-request
- Exact pricing depends on free tier limits
- Estimated: $0-5/month for small-medium usage
- Scales with actual usage (serverless advantage)

### Total Monthly Cost Estimate

**Development:** $0 (local storage)
**Production (small scale):** ~$0.15-$5.20/month

**Scaling:** Costs grow linearly with usage, making it cost-effective for MVP and early growth.

---

## 11. Risks and Mitigations

### Risk 1: Embedding API Rate Limits

**Mitigation:**
- Implement exponential backoff
- Add request queuing
- Cache embeddings for duplicate content
- Consider batch embedding for efficiency

### Risk 2: Vector Storage Costs at Scale

**Mitigation:**
- Monitor usage metrics
- Implement TTL for old vectors
- Archive cold data to cheaper storage
- Consider Vectra for archived conversations

### Risk 3: Embedding Drift (Model Updates)

**Mitigation:**
- Version embeddings in metadata
- Re-embed conversations when upgrading models
- Support gradual migration strategies

### Risk 4: Local/Production Parity

**Mitigation:**
- Use same embedding model in both environments
- Abstract storage interface thoroughly
- Comprehensive integration tests
- Docker option for exact parity (Qdrant)

---

## 12. Alternative Approaches Considered

### Approach A: Pure Postgres (Rejected)

**Reason:** While Vercel Postgres with pgvector works, it's more expensive and complex than dedicated vector databases for pure semantic search. Better suited if we need complex joins with relational data.

### Approach B: Client-Side Embeddings (Rejected)

**Reason:** Browser-based embeddings (transformers.js) are innovative but add latency and complexity. Not worth it for server-side chatbot unless privacy is a hard requirement.

### Approach C: Pinecone (Rejected)

**Reason:** Excellent product but requires separate account management and billing. Upstash's Vercel integration is more streamlined for this use case.

### Approach D: ChromaDB (Considered)

**Reason:** Great for local development but requires Docker. Vectra is simpler for file-based local storage matching current patterns.

---

## 13. Success Metrics

### Technical Metrics
- **Retrieval Accuracy:** >70% relevance in top-5 results
- **Query Latency:** <500ms for vector search
- **Embedding Latency:** <1s for message embedding
- **Storage Costs:** <$10/month for 1000 daily messages

### User Experience Metrics
- **Context Awareness:** Bot remembers >90% of relevant past context
- **Response Quality:** Improved coherence with conversation history
- **Personalization:** Learns user preferences over time

---

## 14. References

### Vector Databases
- [Vercel Vector Databases Guide](https://vercel.com/kb/guide/vector-databases)
- [Upstash for Vercel](https://vercel.com/marketplace/upstash)
- [Vercel Postgres pgvector Starter](https://vercel.com/templates/next.js/postgres-pgvector)
- [Local JavaScript Vector Database](https://rxdb.info/articles/javascript-vector-database.html)
- [Qdrant Semantic Search](https://encore.dev/blog/qdrant-semantic-search)
- [Top 5 Local Vector Databases](https://mehmetakar.dev/local-vector-databases/)

### Embedding Models
- [Best Embedding Models 2025](https://elephas.app/blog/best-embedding-models)
- [Voyage-3-large Announcement](https://blog.voyageai.com/2025/01/07/voyage-3-large/)
- [Embedding Models: OpenAI vs Gemini vs Cohere](https://research.aimultiple.com/embedding-models/)
- [Next-Gen Embeddings 2025](https://www.gocodeo.com/post/next-gen-embeddings-in-2025-transformers-instruction-tuning-multimodal-vectors)
- [Best Embedding Models for RAG](https://www.zenml.io/blog/best-embedding-models-for-rag)

### RAG and Chunking
- [Best Chunking Strategies for RAG 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
- [Handling Long Chat Histories in RAG](https://www.chitika.com/strategies-handling-long-chat-rag/)
- [Conversational RAG & Memory Management](https://medium.com/@noumannawaz/lesson-13-conversational-rag-memory-management-958fd205eff0)
- [Document Chunking for RAG Guide](https://langcopilot.com/posts/2025-10-11-document-chunking-for-rag-practical-guide)
- [Semantic Chunking for RAG](https://www.multimodal.dev/post/semantic-chunking-for-rag)
- [5 RAG Chunking Strategies](https://www.lettria.com/blogpost/5-rag-chunking-strategies-for-better-retrieval-augmented-generation)

### LangChain Integration
- [LangChain Vector Stores Documentation](https://docs.langchain.com/oss/javascript/integrations/vectorstores)
- [LangChain VectorStore API](https://v03.api.js.langchain.com/classes/_langchain_core.vectorstores.VectorStore.html)
- [How to Create and Query Vector Stores](https://js.langchain.com/docs/how_to/vectorstores/)

### Pricing and Deployment
- [Vercel Postgres Pricing](https://vercel.com/docs/storage/vercel-postgres/usage-and-pricing)
- [Vercel Pricing Overview](https://vercel.com/pricing)
- [Upstash Pricing](https://upstash.com/pricing/redis)

---

## 15. Next Steps

1. **Validate Assumptions:** Test Voyage AI embeddings with sample travel conversations
2. **Prototype:** Build minimal implementation with Vectra locally
3. **Benchmark:** Compare retrieval quality across different chunk sizes
4. **Cost Analysis:** Monitor actual embedding costs during prototype
5. **Production Setup:** Configure Upstash Vector in Vercel staging environment

---

## Appendix A: Sample Code Snippets

### A.1 Vector Storage Interface Usage

```typescript
import { createVectorStorage } from './storage/vector-storage.factory';
import { VoyageEmbeddingService } from './services/embedding.service';

// Initialize services
const vectorStorage = createVectorStorage({
  environment: process.env.NODE_ENV,
  upstashUrl: process.env.UPSTASH_VECTOR_URL,
  upstashToken: process.env.UPSTASH_VECTOR_TOKEN,
});

const embeddingService = new VoyageEmbeddingService({
  apiKey: process.env.VOYAGE_API_KEY!,
});

await vectorStorage.initialize();

// Store a chat message
const message = "I want to visit Rome for 5 days";
const embedding = await embeddingService.embed(message);

await vectorStorage.upsert([{
  id: generateId(),
  vector: embedding,
  namespace: 'chat-history',
  metadata: {
    sessionId: 'session-123',
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  },
}]);

// Search for similar messages
const queryEmbedding = await embeddingService.embed("Plan a trip to Italy");
const results = await vectorStorage.search({
  vector: queryEmbedding,
  namespace: 'chat-history',
  topK: 5,
  minScore: 0.7,
});

console.log('Similar past messages:', results);
```

### A.2 Semantic Chunking Implementation

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

async function semanticChunk(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
    separators: ['\n\n', '\n', '. ', ', ', ' '],
  });

  return await splitter.splitText(text);
}

// Usage
const longMessage = "Day 1: Visit the Colosseum... Day 2: Vatican Museums...";
const chunks = await semanticChunk(longMessage);

// Embed each chunk separately
for (const [index, chunk] of chunks.entries()) {
  const embedding = await embeddingService.embed(chunk);
  await vectorStorage.upsert([{
    id: `${messageId}-chunk-${index}`,
    vector: embedding,
    namespace: 'chat-history',
    metadata: {
      messageId,
      content: chunk,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }]);
}
```

---

**End of Research Document**

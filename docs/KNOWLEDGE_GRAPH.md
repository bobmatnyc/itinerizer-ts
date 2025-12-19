# Knowledge Graph Storage System

A privacy-first knowledge graph implementation for the travel itinerary chatbot with anonymization as a core requirement.

## Overview

This system enables RAG (Retrieval Augmented Generation) for chatbot conversations while ensuring **complete anonymization** of personally identifiable information (PII). All data is anonymized before storage, making it safe for cross-user learning and knowledge sharing.

## Architecture

```
┌─────────────────┐
│  Chat Message   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Anonymizer     │─────▶│  Anonymized Text │
│  Service        │      └────────┬─────────┘
└─────────────────┘               │
                                  ▼
                         ┌──────────────────┐
                         │  Embedding       │
                         │  Service         │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Vector Storage  │
                         │  (Vectra)        │
                         └──────────────────┘
```

## Components

### 1. AnonymizerService (`src/services/anonymizer.service.ts`)

Removes and generalizes PII from text content:

**PII Removal:**
- **Names**: Removes personal names in relationship contexts
- **Emails**: Replaces with `[EMAIL]`
- **Phone Numbers**: Replaces with `[PHONE]`
- **Addresses**: Replaces with `[ADDRESS]`
- **Credit Cards**: Replaces with `[CARD]`
- **SSN**: Replaces with `[SSN]`

**Generalization:**
- **Dates**: "March 15, 2025" → "mid-March"
- **Locations**: "123 Main St, Boston" → "Boston area"
- **Budget**: "$5000" → "luxury budget"

**Example:**
```typescript
const anonymizer = new AnonymizerService();

const result = anonymizer.anonymize(
  "My wife Sarah and I want to visit Paris on March 15. Budget: $5000. Email: john@example.com"
);

// Result:
// "My wife and I want to visit Paris on mid-March. Budget: luxury budget. Email: [EMAIL]"
```

### 2. EmbeddingService (`src/services/embedding.service.ts`)

Generates vector embeddings using OpenRouter:

- **Model**: `openai/text-embedding-3-small` (default)
- **Batch Support**: Efficiently processes multiple texts
- **Similarity Calculation**: Cosine similarity between embeddings

**Example:**
```typescript
const embeddingService = new EmbeddingService({ apiKey });

const result = await embeddingService.embed("Romantic getaway in Paris");
// Returns: { embedding: number[], model: string, dimensions: number }
```

### 3. VectorStorage (`src/storage/vectra-storage.ts`)

Local file-based vector storage using Vectra:

- **Namespaces**: Separate collections for different use cases
- **CRUD Operations**: Upsert, search, get, delete, list
- **Metadata Filtering**: Filter searches by type, category, etc.
- **File-Based**: Stores in `data/vectors/` directory

**Example:**
```typescript
const vectorStorage = new VectraStorage('./data/vectors');

await vectorStorage.upsert('travel-knowledge', documents);
const results = await vectorStorage.search('travel-knowledge', queryEmbedding, 5);
```

### 4. KnowledgeService (`src/services/knowledge.service.ts`)

Orchestrates the entire RAG pipeline:

- **Store Messages**: Anonymize → Embed → Store
- **Store Entities**: Extract travel preferences and entities
- **Retrieve Context**: Semantic search for relevant knowledge
- **Statistics**: Track knowledge base growth

**Example:**
```typescript
const knowledgeService = new KnowledgeService(
  vectorStorage,
  embeddingService,
  { namespace: 'travel-knowledge', topK: 5 }
);

// Store a chat message
await knowledgeService.storeMessage({
  content: "I want a romantic trip to Paris",
  role: "user",
  sessionId: "abc-123"
});

// Retrieve relevant context
const rag = await knowledgeService.retrieveContext(
  "What are good romantic activities?"
);
// Returns: { documents, scores, context }
```

## Privacy Guarantees

### What Gets Anonymized

| Input | Anonymized Output |
|-------|-------------------|
| "My wife Sarah and I" | "My wife and I" |
| "john.doe@example.com" | "[EMAIL]" |
| "Call 555-1234" | "Call [PHONE]" |
| "123 Main St, Boston" | "[ADDRESS], Boston area" |
| "March 15, 2025" | "mid-March" |
| "Budget is $5000" | "Budget is luxury budget" |

### What Gets Preserved

Travel-relevant information is preserved for useful RAG:
- **Destinations**: "Paris", "Rome", "Tokyo"
- **Activities**: "Wine tasting", "Museum visit"
- **Preferences**: "Romantic", "Adventure", "Family-friendly"
- **Airport Codes**: "JFK", "CDG", "NRT"
- **General Budget Ranges**: "budget", "mid-range", "luxury"

## Usage Example

### Basic Setup

```typescript
import { VectraStorage } from './storage/vectra-storage.js';
import { EmbeddingService } from './services/embedding.service.js';
import { KnowledgeService } from './services/knowledge.service.js';

// Initialize services
const vectorStorage = new VectraStorage('./data/vectors');
const embeddingService = new EmbeddingService({ apiKey: 'sk-...' });
const knowledgeService = new KnowledgeService(vectorStorage, embeddingService);

await knowledgeService.initialize();
```

### Store Chat Conversation

```typescript
const messages = [
  {
    content: "My wife and I want to plan a trip to Paris",
    role: "user",
    sessionId: "session-001"
  },
  {
    content: "I can help! When are you thinking of traveling?",
    role: "assistant",
    sessionId: "session-001"
  }
];

await knowledgeService.storeMessages(messages);
```

### Store Extracted Entities

```typescript
await knowledgeService.storeEntity({
  text: "Romantic getaway in Paris",
  category: "destination",
  confidence: 0.95
}, "session-001");

await knowledgeService.storeEntity({
  text: "Wine tasting experience",
  category: "activity",
  confidence: 0.9
}, "session-001");
```

### Retrieve Context (RAG)

```typescript
const result = await knowledgeService.retrieveContext(
  "What are good romantic activities in Paris?"
);

if (result.success) {
  const { documents, scores, context } = result.value;

  console.log(context);
  // Output:
  // Relevant prior knowledge:
  // [Relevance: 95%] [entity (activity)] Wine tasting experience
  // [Relevance: 88%] [chat] Looking for romantic things to do
  // [Relevance: 82%] [entity (destination)] Romantic getaway in Paris
}
```

### Search with Filters

```typescript
// Search only for activities
const activities = await knowledgeService.search(
  "Things to do in Paris",
  {
    type: 'entity',
    category: 'activity',
    topK: 5
  }
);

// Search only for budget information
const budgets = await knowledgeService.search(
  "How much should I budget?",
  {
    type: 'entity',
    category: 'budget'
  }
);
```

### Get Statistics

```typescript
const stats = await knowledgeService.getStats();

if (stats.success) {
  console.log(`Total documents: ${stats.value.totalDocuments}`);
  console.log(`By type:`, stats.value.byType);
  console.log(`By category:`, stats.value.byCategory);
}
```

## Configuration

### KnowledgeService Config

```typescript
interface KnowledgeConfig {
  namespace?: string;              // Default: 'travel-knowledge'
  topK?: number;                   // Default: 5
  similarityThreshold?: number;    // Default: 0.7 (0-1)
}
```

### AnonymizerService Config

```typescript
interface AnonymizationConfig {
  removeNames?: boolean;           // Default: true
  removeEmails?: boolean;          // Default: true
  removePhones?: boolean;          // Default: true
  removeAddresses?: boolean;       // Default: true
  generalizeDates?: boolean;       // Default: true
  generalizeLocations?: boolean;   // Default: true
  categorizeBudgets?: boolean;     // Default: true
}
```

### EmbeddingService Config

```typescript
interface EmbeddingConfig {
  apiKey: string;                  // Required
  model?: string;                  // Default: 'openai/text-embedding-3-small'
  batchSize?: number;              // Default: 100
}
```

## Data Storage

### Directory Structure

```
data/
└── vectors/
    └── travel-knowledge/
        ├── index.json
        ├── items/
        │   ├── item-001.json
        │   ├── item-002.json
        │   └── ...
        └── metadata.json
```

### Vector Document Format

```typescript
interface VectorDocument {
  id: string;
  content: string;               // Anonymized
  embedding?: number[];
  metadata: {
    type: 'chat' | 'entity' | 'preference';
    category?: EntityCategory;
    budgetCategory?: BudgetCategory;
    timestamp: Date;
    sessionId?: string;
    originalHash?: string;       // Hash of original content
  };
}
```

## Testing

Run the comprehensive test suite:

```bash
npm test tests/services/anonymizer.service.test.ts
```

Run the demo:

```bash
npm run build
node dist/examples/knowledge-graph-demo.js
```

## Performance Considerations

### Batch Processing

For better performance, use batch operations:

```typescript
// ✅ Good: Batch processing
await knowledgeService.storeMessages(messages);

// ❌ Avoid: Sequential single inserts
for (const message of messages) {
  await knowledgeService.storeMessage(message);
}
```

### Embedding Costs

- **Text-embedding-3-small**: ~$0.02 per 1M tokens
- Batch size: 100 texts per request (configurable)
- Typical message: ~50-200 tokens

### Vector Storage

- **File-based**: No external database required
- **Scalability**: Suitable for 10K-100K documents
- **Search Speed**: O(n) linear search (acceptable for small-medium datasets)

## Security Best Practices

1. **Never log anonymized content with original content**
2. **Verify anonymization before storage** (see demo's privacy verification)
3. **Use session IDs** for grouping, not user IDs
4. **Store original hashes** for debugging, not original content
5. **Regular audits** of stored documents for PII leakage

## Future Enhancements

- [ ] Entity extraction using LLM
- [ ] Preference learning from conversations
- [ ] Multi-language support for anonymization
- [ ] Advanced semantic chunking for long documents
- [ ] Hybrid search (vector + keyword)
- [ ] Fine-tuned embedding models for travel domain

## References

- [Vectra Documentation](https://github.com/Stevenic/vectra)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [RAG Best Practices](https://www.anthropic.com/index/contextual-retrieval)

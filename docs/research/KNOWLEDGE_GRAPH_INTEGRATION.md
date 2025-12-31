# Knowledge Graph Integration with Trip Designer

## Overview

The knowledge graph system has been successfully integrated with the Trip Designer chat service to provide Retrieval Augmented Generation (RAG) capabilities.

## Integration Summary

### Changes Made

#### 1. TripDesignerService (`src/services/trip-designer/trip-designer.service.ts`)

**Added:**
- Optional `KnowledgeService` dependency injection
- Lazy initialization of knowledge service
- RAG context retrieval before LLM calls
- Automatic storage of conversations after successful exchanges

**New Methods:**
- `ensureKnowledgeInitialized()` - Lazy initialization with error handling
- `retrieveRAGContext(query)` - Retrieve top-5 relevant documents with >70% similarity
- `storeConversation(sessionId, userMessage, assistantMessage)` - Store anonymized messages
- `buildMessagesWithRAG(session, currentUserMessage)` - Build messages with injected RAG context

**Integration Points:**
- `chat()` method: Uses RAG context and stores conversations
- `chatStream()` method: Uses RAG context and stores conversations

#### 2. API Server (`src/server/api.ts`)

**Added:**
- Initialization of `VectraStorage` with path `./data/vectors`
- Initialization of `EmbeddingService` with OpenRouter API key
- Initialization of `KnowledgeService` with namespace `travel-knowledge`
- Asynchronous initialization (non-blocking server startup)

**New Endpoints:**
- `GET /api/knowledge/stats` - Get knowledge graph statistics
- `POST /api/knowledge/search` - Search knowledge graph with filters

### RAG Flow

```
User sends message
    ↓
Retrieve RAG context (top-5 documents with >70% similarity)
    ↓
Inject context into system prompt
    ↓
Generate LLM response with enhanced context
    ↓
Store both user and assistant messages (anonymized)
    ↓
Return response to user
```

### System Prompt Enhancement

When relevant knowledge is found, the system prompt is enhanced with:

```
## Relevant Knowledge from Previous Conversations

[Relevance: 85%] [chat] User mentioned preferring beachfront hotels...
[Relevance: 78%] [chat] Assistant suggested exploring local markets...
[Relevance: 72%] [chat] User has a budget preference for mid-range...

Use this relevant knowledge to inform your responses, but prioritize the current conversation context.
```

## Configuration

### Environment Variables
- `OPENROUTER_API_KEY` - Required for both LLM and embeddings

### Storage Paths
- Vector storage: `./data/vectors/`
- Namespace: `travel-knowledge`

### RAG Parameters
- **Top K**: 5 documents
- **Similarity Threshold**: 0.7 (70%)
- **Embedding Model**: `openai/text-embedding-3-small`

## Graceful Degradation

The integration is designed to fail gracefully:

1. **If knowledge service fails to initialize:**
   - Warning logged to console
   - Chat service continues to work normally
   - No RAG context provided

2. **If RAG context retrieval fails:**
   - Warning logged to console
   - LLM call proceeds without RAG context
   - Chat functionality unaffected

3. **If conversation storage fails:**
   - Warning logged to console
   - Response still returned to user
   - Future conversations not affected

## Privacy & Anonymization

All stored messages are anonymized using `AnonymizerService`:

- **PII Removed:**
  - Email addresses → `[EMAIL]`
  - Phone numbers → `[PHONE]`
  - Credit cards → `[CARD]`
  - Addresses → `[ADDRESS]`

- **Generalized:**
  - Specific dates → Time periods (e.g., "early March")
  - Budget amounts → Categories (e.g., "mid-range budget")
  - Personal names → Removed from context

## Testing the Integration

### 1. Start the Server

```bash
npm run server
```

### 2. Create a Session

```bash
curl -X POST http://localhost:3000/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"itineraryId": "your-itinerary-id"}'
```

### 3. Send Messages

```bash
curl -X POST http://localhost:3000/api/chat/sessions/{sessionId}/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "I love beachfront hotels with pools"}'
```

### 4. Check Knowledge Stats

```bash
curl http://localhost:3000/api/knowledge/stats
```

Expected response:
```json
{
  "totalDocuments": 2,
  "byType": {
    "chat": 2
  },
  "byCategory": {}
}
```

### 5. Search Knowledge Graph

```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "hotel preferences", "topK": 5}'
```

### 6. Verify RAG in Action

Send a second message related to the first:

```bash
curl -X POST http://localhost:3000/api/chat/sessions/{sessionId}/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "What hotels would you recommend?"}'
```

The LLM should now have context from the previous conversation about beachfront hotels and pools.

## Performance Considerations

- **Embedding Generation**: ~100ms per message
- **Vector Search**: ~10ms for 1000 documents
- **Storage**: ~1KB per message (anonymized)
- **Memory**: Vectra indexes loaded on-demand

## Future Enhancements

1. **Entity Extraction**: Extract and store travel entities (destinations, activities, preferences)
2. **Semantic Clustering**: Group related conversations by topic
3. **User Preferences**: Build long-term preference profiles
4. **Multi-Session Context**: Share knowledge across different itineraries
5. **Feedback Loop**: Learn from successful trip designs

## Troubleshooting

### Knowledge service not initializing

Check logs for:
```
Failed to initialize knowledge service: ...
```

**Solution**: Ensure `vectra` package is installed:
```bash
npm install vectra
```

### RAG context not appearing

Check logs for:
```
RAG context retrieval failed: ...
```

**Solution**: Verify API key and embedding service:
```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### Conversations not being stored

Check logs for:
```
Failed to store conversation in knowledge graph: ...
```

**Solution**: Check vector storage permissions:
```bash
ls -la ./data/vectors/
```

## LOC Delta

**Changes:**
- Added: ~180 lines (TripDesignerService methods, API endpoints)
- Modified: ~30 lines (constructor, method calls)
- Net Change: +180 lines

**Phase**: Enhancement (Phase 2 of feature delivery)

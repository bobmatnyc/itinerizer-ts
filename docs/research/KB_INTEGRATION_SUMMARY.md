# Weaviate Knowledge Base Integration with Trip Designer

## Overview

Successfully integrated WeaviateKnowledgeService with Trip Designer service to implement a **KB-first search flow** for travel intelligence retrieval and storage.

## Key Changes

### 1. Knowledge Service Factory (`src/services/knowledge-factory.ts`)

**Purpose**: Auto-detect knowledge backend (Weaviate vs. Vectra) based on environment variables.

**Features**:
- **Type guard**: `isWeaviateKnowledgeService()` - Detects Weaviate at runtime
- **Auto-detection**: Uses `KNOWLEDGE_BACKEND` env var to select backend
  - `KNOWLEDGE_BACKEND=weaviate` → WeaviateKnowledgeService
  - Default → KnowledgeService (Vectra)

**Usage**:
```typescript
const knowledgeService = createKnowledgeService();
if (isWeaviateKnowledgeService(knowledgeService)) {
  // Use Weaviate-specific features
  await knowledgeService.searchWithFallback(query, context);
} else {
  // Use Vectra features
  await knowledgeService.retrieveContext(query, filter);
}
```

---

### 2. Trip Designer Service (`src/services/trip-designer/trip-designer.service.ts`)

**Changes**:
- **Accept both knowledge services**: `KnowledgeService | WeaviateKnowledgeService`
- **Updated `retrieveRAGContext()`**: KB-first search flow
  - For Weaviate: Uses `searchWithFallback()` with itinerary context
  - For Vectra: Uses `retrieveContext()` (legacy)
- **Updated `storeConversation()`**: Store conversations differently
  - Weaviate: Stores as structured knowledge with category
  - Vectra: Stores as messages in batch

**KB-First RAG Flow**:
```typescript
// 1. Get itinerary context
const itinerary = await itineraryService.get(session.itineraryId);

// 2. Search Weaviate KB with context
const searchResult = await weaviateKnowledge.searchWithFallback(query, {
  itinerary,
  destinationName: itinerary.destinations[0].name,
  travelDate: new Date(itinerary.startDate),
});

// 3. If KB has good results (relevance > 0.7), use them
if (searchResult.value.results[0].relevanceScore > 0.7) {
  return formatKBContext(searchResult.value.results);
}

// 4. Otherwise, fall back to web search (OpenRouter :online)
return null; // Let OpenRouter handle web search
```

---

### 3. Tool Executor (`src/services/trip-designer/tool-executor.ts`)

**Changes**:
- **Accept both knowledge services**: Updated `ToolExecutorDependencies`
- **Cache itinerary context**: Loads once per execution for all tools
- **Updated `handleSearchWeb()`**: KB-first search
- **Updated `handleStoreTravelIntelligence()`**: Structured storage
- **Updated `handleRetrieveTravelIntelligence()`**: Structured retrieval

**KB-First Search Flow**:
```typescript
private async handleSearchWeb(query: string): Promise<unknown> {
  // 1. Check knowledge base first
  const searchResult = await weaviateKnowledge.searchWithFallback(query, {
    itinerary: this.currentItinerary,
    destinationName: this.currentItinerary.destinations[0].name,
    travelDate: new Date(this.currentItinerary.startDate),
  });

  // 2. If good KB results (relevance > 0.7), return them
  if (results[0].relevanceScore > 0.7) {
    return {
      source: 'knowledge_base',
      results: results.map(r => ({
        content: r.rawContent,
        category: r.category,
        relevance: r.relevanceScore,
      })),
    };
  }

  // 3. Otherwise, indicate web search needed
  return {
    source: 'web_search_needed',
    note: 'Using OpenRouter :online for web search',
  };
}
```

**Auto-Storage After Web Search**:
```typescript
private async handleStoreTravelIntelligence(params: any): Promise<unknown> {
  // Parse temporal type from dates
  let temporalType: 'evergreen' | 'seasonal' | 'event' | 'dated' = 'evergreen';
  if (params.dates.includes('annual')) temporalType = 'event';
  if (params.dates.match(/spring|summer|fall|winter/)) temporalType = 'seasonal';

  // Store in Weaviate with structured metadata
  await weaviateKnowledge.storeKnowledge({
    content: params.findings,
    category: mapCategory(params.category),
    subcategory: params.category,
    source: 'trip_designer',
    temporalType,
  }, {
    itinerary: this.currentItinerary,
    destinationName: params.destination,
    travelDate: parseDate(params.dates),
  });
}
```

---

### 4. Server Initialization (`viewer-svelte/src/hooks.server.ts`)

**Changes**:
- **Import factory**: Uses `createKnowledgeService()` instead of manual setup
- **Reordered initialization**: Knowledge service before Trip Designer
- **Pass to Trip Designer**: Injects knowledge service into TripDesigner dependencies

**Initialization Flow**:
```typescript
// 1. Initialize knowledge service first (auto-detects backend)
const knowledgeService = createKnowledgeService();
if (knowledgeService) {
  const initResult = await knowledgeService.initialize();
  console.log('✅ Knowledge service initialized');
}

// 2. Initialize Trip Designer with knowledge service
tripDesignerService = new TripDesignerService(config, undefined, {
  itineraryService,
  segmentService,
  dependencyService,
  knowledgeService, // ← Injected here
  travelAgentFacade,
});
```

---

## Integration Points

### A. RAG Context Enhancement

**Before** (Vectra only):
```typescript
// Simple retrieval without context
const result = await knowledgeService.retrieveContext(query, { type: 'chat' });
```

**After** (Weaviate with context):
```typescript
// KB-first search with itinerary context and filters
const result = await weaviateKnowledge.searchWithFallback(query, {
  itinerary,
  destinationName: 'Paris',
  travelDate: new Date('2025-06-15'),
  filters: {
    categories: ['restaurant', 'activity'],
    luxuryLevels: ['mid-range', 'luxury'],
    season: 'summer',
  },
});
```

### B. Web Search with Auto-Storage

**Flow**:
1. User asks: "What are the best restaurants in Paris?"
2. Trip Designer calls `handleSearchWeb(query)`
3. KB search finds no relevant results (or low relevance)
4. OpenRouter :online performs web search
5. LLM returns results with `STORE_TRAVEL_INTELLIGENCE` tool call
6. Results automatically stored in Weaviate with:
   - Category: `recommendation`
   - Temporal type: `evergreen`
   - Destination: `Paris`
   - Context: Current itinerary metadata

### C. Post-Response Knowledge Extraction

**Automatic storage** after every Trip Designer response:
```typescript
// After LLM generates response
this.storeConversation(sessionId, userMessage, assistantMessage);

// Inside storeConversation()
if (isWeaviateKnowledgeService(knowledgeService)) {
  await knowledgeService.storeKnowledge({
    content: `User: ${userMessage}\n\nAssistant: ${assistantMessage}`,
    category: 'tip',
    source: 'trip_designer',
  }, { sessionId });
}
```

---

## Environment Configuration

### Using Weaviate (Recommended for Production)

```bash
# .env
KNOWLEDGE_BACKEND=weaviate
WEAVIATE_URL=https://your-weaviate-instance.weaviate.network
WEAVIATE_API_KEY=your-weaviate-api-key
OPENROUTER_API_KEY=your-openrouter-key
```

### Using Vectra (Local Development)

```bash
# .env
KNOWLEDGE_BACKEND=vectra  # or omit (defaults to vectra)
OPENROUTER_API_KEY=your-openrouter-key
```

---

## Testing the Integration

### 1. Local Development

```bash
# Start server
npm run server

# In another terminal
cd viewer-svelte && npm run dev

# Open http://localhost:5176
# Navigate to Trip Designer
# Test KB-first search flow
```

### 2. Verify KB-First Flow

**Test Case 1: KB Hit**
```
User: "What are the best restaurants in Paris?"
→ KB has results → Returns from KB
→ No web search needed
```

**Test Case 2: KB Miss → Web Search**
```
User: "What's the weather like in Paris in June?"
→ KB has no results → Indicates web search needed
→ OpenRouter :online performs search
→ Results stored in KB for future use
```

### 3. Verify Auto-Storage

```
User: "Tell me about Louvre Museum"
→ LLM response with STORE_TRAVEL_INTELLIGENCE
→ Check Weaviate for stored knowledge:
   - Category: activity
   - Destination: Paris
   - Temporal type: evergreen
```

---

## Architecture Benefits

### 1. **KB-First Search**
- **Faster**: No web search if KB has answers
- **Cost-effective**: Reduces OpenRouter :online usage
- **Context-aware**: Filters by destination, date, traveler type

### 2. **Auto-Enrichment**
- **Self-improving**: KB grows with each search
- **Temporal decay**: Old events naturally fade
- **Categorized**: Structured storage for better retrieval

### 3. **Dual Backend Support**
- **Weaviate**: Production-ready, scalable
- **Vectra**: Local development, no cloud needed
- **Graceful degradation**: Falls back to web search if KB unavailable

---

## Files Modified

| File | Changes | LOC Delta |
|------|---------|-----------|
| `src/services/knowledge-factory.ts` | Added type guard | +10 |
| `src/services/trip-designer/trip-designer.service.ts` | KB-first RAG + storage | +60 |
| `src/services/trip-designer/tool-executor.ts` | KB-first search + auto-storage | +120 |
| `viewer-svelte/src/hooks.server.ts` | Factory integration | +15 |
| **TOTAL** | | **+205 / -85 = +120 net** |

---

## Next Steps

### 1. Testing
- [ ] Test KB-first search flow end-to-end
- [ ] Verify auto-storage after web searches
- [ ] Test temporal decay for seasonal events
- [ ] Verify category filtering

### 2. Monitoring
- [ ] Add metrics for KB hit rate
- [ ] Track web search vs KB retrieval ratio
- [ ] Monitor storage growth over time

### 3. Future Enhancements
- [ ] Implement confidence scoring for KB results
- [ ] Add feedback loop for result quality
- [ ] Implement knowledge pruning strategies
- [ ] Add knowledge import/export tools

---

## Troubleshooting

### Issue: Knowledge service not initializing

**Check**:
```bash
# View server logs
cd viewer-svelte && npm run dev

# Look for:
# ✅ Knowledge service initialized (Weaviate or Vectra)
# OR
# ⚠️  Knowledge service disabled (no backend configured)
```

**Solution**:
- Verify `KNOWLEDGE_BACKEND` env var
- For Weaviate: Check `WEAVIATE_URL` and `WEAVIATE_API_KEY`
- For Vectra: Check `OPENROUTER_API_KEY` and ensure not on Vercel

### Issue: KB search not returning results

**Debug**:
```typescript
// Add logging in tool-executor.ts
console.log('KB search result:', searchResult);
console.log('Relevance scores:', results.map(r => r.relevanceScore));
```

**Common Causes**:
- KB empty (no prior searches)
- Relevance threshold too high (adjust from 0.7 to 0.5)
- Query doesn't match stored content

### Issue: Web search always triggered

**Verify**:
```typescript
// Check in handleSearchWeb()
if (results.length > 0 && results[0].relevanceScore > 0.7) {
  console.log('Using KB results'); // Should see this
} else {
  console.log('Falling back to web'); // If relevance too low
}
```

---

## References

- **WeaviateKnowledgeService**: `/src/services/weaviate-knowledge.service.ts`
- **KnowledgeService (Vectra)**: `/src/services/knowledge.service.ts`
- **Trip Designer Tools**: `/src/services/trip-designer/tools.ts`
- **Weaviate Types**: `/src/domain/types/weaviate.ts`

---

Generated: 2025-12-21

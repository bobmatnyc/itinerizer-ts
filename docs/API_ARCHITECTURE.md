# API Architecture Analysis

**Date**: 2024-12-19
**Status**: Current State Documentation & Refactoring Plan

---

## Executive Summary

The current codebase has a well-structured service layer but lacks clear API separation. The goal is to refactor toward **4 distinct APIs** that provide clear separation of concerns:

1. **Itinerary Collection Manager** - Manages collections of itineraries
2. **Itinerary Manager** - Manages all data in a single itinerary (CRUD for segments, metadata, etc.)
3. **Travel Agent** - Smart input/output for itinerary - provides summaries, identifies issues, intelligent operations
4. **Trip Designer** - Interacts with traveler via chat, helps research and plan trips, persists work by calling the other APIs

---

## Current State Analysis

### Existing Services

The codebase has **20+ service files** across several categories:

#### Core Data Services
- **`ItineraryService`** (`itinerary.service.ts`)
  - Create, read, update, delete itineraries
  - Manage travelers
  - Draft mode support (in-memory before persistence)
  - **Maps to**: Itinerary Collection Manager + Itinerary Manager

- **`SegmentService`** (`segment.service.ts`)
  - CRUD operations for segments within an itinerary
  - Add, update, delete, reorder segments
  - Validation (date constraints, uniqueness)
  - **Maps to**: Itinerary Manager

- **`DependencyService`** (`dependency.service.ts`)
  - Dependency graph building
  - Topological sorting
  - Cascade adjustments when segments move
  - Chronological dependency inference
  - **Maps to**: Itinerary Manager

#### Import & Processing Services
- **`DocumentImportService`** (`document-import.service.ts`)
  - Orchestrates PDF → Itinerary pipeline
  - Extracts, converts, parses with LLM
  - Geographic continuity validation
  - Gap filling with intelligent segments
  - Geocoding integration
  - **Maps to**: Travel Agent (import is an intelligent operation)

- **`PDFExtractorService`** (`pdf-extractor.service.ts`) - Helper for document import
- **`MarkdownConverterService`** (`markdown-converter.service.ts`) - Helper for document import
- **`LLMService`** (`llm.service.ts`) - Low-level LLM calls
- **`SchemaNormalizerService`** (`schema-normalizer.service.ts`) - Data normalization

#### Intelligence & Analysis Services
- **`TravelAgentService`** (`travel-agent.service.ts`)
  - **CRITICAL**: This service does MORE than import gap filling
  - SerpAPI integration for real travel options (flights, hotels, transfers)
  - Travel preference inference from existing segments
  - Plausibility checking
  - Trip completion and optimization (TODO methods)
  - **Maps to**: Travel Agent API

- **`TravelAgentReviewService`** (`travel-agent-review.service.ts`)
  - Semantic validation of itineraries
  - Issue detection (impossible times, location mismatches, etc.)
  - Auto-fix capabilities for HIGH severity issues
  - **Maps to**: Travel Agent API

- **`SegmentContinuityService`** (`segment-continuity.service.ts`)
  - Geographic gap detection (80% confidence threshold)
  - Location continuity validation
  - **Maps to**: Travel Agent API

- **`DurationInferenceService`** (`duration-inference.service.ts`)
  - Infers missing end times for segments
  - Confidence scoring
  - **Maps to**: Travel Agent API

- **`GeocodingService`** (`geocoding.service.ts`)
  - Batch geocoding of locations
  - Coordinate enrichment
  - **Maps to**: Travel Agent API (enhancement operation)

#### Conversational AI Services
- **`TripDesignerService`** (`trip-designer/trip-designer.service.ts`)
  - Chat-based trip planning
  - Session management
  - Tool execution (calls other services)
  - Streaming responses (SSE)
  - Context compaction (conversation summarization)
  - RAG integration with KnowledgeService
  - **Maps to**: Trip Designer API

- **`SessionManager`** (`trip-designer/session.ts`) - Session state management
- **`ToolExecutor`** (`trip-designer/tool-executor.ts`) - Executes tools on behalf of LLM
- **`tools.ts`** - Tool definitions for Trip Designer

#### Supporting Services
- **`KnowledgeService`** (`knowledge.service.ts`)
  - Vector search over conversation history
  - RAG context retrieval
  - Knowledge graph storage
  - **Used by**: Trip Designer

- **`EmbeddingService`** (`embedding.service.ts`) - Generates embeddings for vector search
- **`ModelSelectorService`** (`model-selector.service.ts`) - Auto-selects best LLM model
- **`LLMEvaluatorService`** (`llm-evaluator.service.ts`) - Model testing and comparison
- **`CostTrackerService`** (`cost-tracker.service.ts`) - Tracks API usage costs
- **`AnonymizerService`** (`anonymizer.service.ts`) - PII removal for sharing
- **`WorkingContextService`** (`working-context.service.ts`) - Manages active itinerary context
- **`ViewerService`** (`viewer.service.ts`) - Legacy viewer functionality

### Existing API Routes

The current API server (`src/server/api.ts`) has **monolithic routes**:

#### Itinerary Routes
```
GET    /api/itineraries           # List all itineraries
POST   /api/itineraries           # Create new itinerary
GET    /api/itineraries/:id       # Get single itinerary
PATCH  /api/itineraries/:id       # Update itinerary metadata
DELETE /api/itineraries/:id       # Delete itinerary
GET    /api/itineraries/:id/events # SSE stream for updates
```

#### Import Routes
```
POST   /api/import                # Import PDF document
GET    /api/costs                 # Cost tracking summary
GET    /api/models                # Available LLM models
```

#### Trip Designer Routes
```
POST   /api/chat/sessions                           # Create chat session
POST   /api/chat/sessions/:sessionId/messages       # Send message (non-streaming)
POST   /api/chat/sessions/:sessionId/messages/stream # Send message (SSE streaming)
GET    /api/chat/sessions/:sessionId                # Get session details
GET    /api/chat/stats                              # Active session stats
```

#### Knowledge Routes
```
GET    /api/knowledge/stats       # Knowledge graph statistics
POST   /api/knowledge/search      # Search knowledge graph
```

#### Health Check
```
GET    /api/health                # Health check
```

---

## Target Architecture Mapping

### API 1: Itinerary Collection Manager

**Purpose**: Manage the collection of itineraries (CRUD on itinerary entities, not their contents)

**Services Required**:
- `ItineraryService` (partial - only collection-level operations)

**Proposed Routes**:
```
GET    /api/v1/itineraries           # List all itineraries (summaries)
POST   /api/v1/itineraries           # Create blank itinerary
GET    /api/v1/itineraries/:id       # Get itinerary metadata only (no segments)
PATCH  /api/v1/itineraries/:id       # Update metadata (title, description, dates, status, tags)
DELETE /api/v1/itineraries/:id       # Delete itinerary
```

**Functionality**:
- List, create, delete itineraries
- Update itinerary-level metadata (title, description, dates, trip type, tags, status)
- Manage travelers (add/remove)
- **Does NOT** manage segments (that's Itinerary Manager)

---

### API 2: Itinerary Manager

**Purpose**: Manage all data within a single itinerary (segments, dependencies, ordering)

**Services Required**:
- `ItineraryService` (partial - load/save operations)
- `SegmentService` (full)
- `DependencyService` (full)

**Proposed Routes**:
```
# Segment Operations
GET    /api/v1/itineraries/:id/segments              # List all segments
POST   /api/v1/itineraries/:id/segments              # Add segment
GET    /api/v1/itineraries/:id/segments/:segmentId   # Get single segment
PATCH  /api/v1/itineraries/:id/segments/:segmentId   # Update segment
DELETE /api/v1/itineraries/:id/segments/:segmentId   # Delete segment
POST   /api/v1/itineraries/:id/segments/reorder      # Reorder segments

# Dependency Operations
GET    /api/v1/itineraries/:id/dependencies          # Get dependency graph
POST   /api/v1/itineraries/:id/dependencies/validate # Validate no cycles
GET    /api/v1/itineraries/:id/dependencies/:segmentId/dependents # Find dependents
POST   /api/v1/itineraries/:id/segments/:segmentId/move # Move segment with cascade

# Batch Operations
POST   /api/v1/itineraries/:id/segments/batch        # Batch add/update/delete
```

**Functionality**:
- CRUD operations on segments
- Reorder segments
- Dependency management (explicit and inferred)
- Cascade adjustments when segments move
- Batch operations for efficiency

---

### API 3: Travel Agent

**Purpose**: Smart input/output for itinerary - analysis, validation, enhancement, import

**Services Required**:
- `TravelAgentService` (full)
- `TravelAgentReviewService` (full)
- `SegmentContinuityService` (full)
- `DurationInferenceService` (full)
- `GeocodingService` (full)
- `DocumentImportService` (full)
- Supporting: `PDFExtractorService`, `MarkdownConverterService`, `LLMService`, `ModelSelectorService`, `CostTrackerService`

**Proposed Routes**:
```
# Analysis & Review
POST   /api/v1/agent/analyze                         # Analyze itinerary (gaps, issues, summary)
POST   /api/v1/agent/review                          # Semantic review (validate plausibility)
POST   /api/v1/agent/summarize                       # Generate human-readable summary

# Enhancement Operations
POST   /api/v1/agent/fill-gaps                       # Fill geographic gaps intelligently
POST   /api/v1/agent/geocode                         # Geocode all locations
POST   /api/v1/agent/infer-durations                 # Infer missing segment durations
POST   /api/v1/agent/optimize                        # Optimize itinerary flow
POST   /api/v1/agent/complete                        # Complete partial trip

# Search & Discovery
POST   /api/v1/agent/search/flights                  # Search for flights (SerpAPI)
POST   /api/v1/agent/search/hotels                   # Search for hotels (SerpAPI)
POST   /api/v1/agent/search/transfers                # Search for ground transportation

# Import Operations
POST   /api/v1/agent/import/pdf                      # Import PDF document
GET    /api/v1/agent/import/preview                  # Preview import (no LLM processing)
POST   /api/v1/agent/import/test-models              # Test multiple models on same PDF

# Cost Tracking
GET    /api/v1/agent/costs                           # Get cost summary
GET    /api/v1/agent/models                          # Get available models
```

**Functionality**:
- **Analysis**: Detect gaps, validate continuity, identify semantic issues
- **Enhancement**: Fill gaps, geocode, infer durations, optimize flow
- **Search**: Find real travel options via SerpAPI
- **Import**: PDF → Itinerary with validation and enhancement
- **Review**: Plausibility checking, semantic validation, auto-fix

**Key Insight**: This API is stateless - it takes an itinerary as input, performs operations, and returns a modified itinerary. The calling API (Trip Designer or client) is responsible for persisting changes.

---

### API 4: Trip Designer

**Purpose**: Conversational trip planning interface (chat-based)

**Services Required**:
- `TripDesignerService` (full)
- `SessionManager`
- `ToolExecutor`
- `KnowledgeService`
- `EmbeddingService`

**Proposed Routes**:
```
# Session Management
POST   /api/v1/designer/sessions                     # Create chat session
GET    /api/v1/designer/sessions/:sessionId          # Get session details
DELETE /api/v1/designer/sessions/:sessionId          # End session
GET    /api/v1/designer/stats                        # Active session stats

# Chat Operations
POST   /api/v1/designer/sessions/:sessionId/messages       # Send message (non-streaming)
POST   /api/v1/designer/sessions/:sessionId/messages/stream # Send message (SSE streaming)
GET    /api/v1/designer/sessions/:sessionId/history        # Get conversation history

# Knowledge Graph
GET    /api/v1/designer/knowledge/stats              # Knowledge graph statistics
POST   /api/v1/designer/knowledge/search             # Search knowledge graph
```

**Functionality**:
- Conversational AI for trip planning
- Tool execution (calls Itinerary Manager and Travel Agent APIs)
- Session management with context compaction
- Streaming responses for real-time UX
- RAG-enhanced responses using conversation history
- Persists work by calling other APIs

**Tool Integration**: Trip Designer has access to tools that call:
- **Itinerary Manager API**: Add/update/delete segments
- **Travel Agent API**: Search flights, fill gaps, analyze itinerary

---

## Current Issues & Misplaced Functionality

### 1. ItineraryService is Too Broad
**Issue**: ItineraryService handles both collection-level operations (list, create, delete) and segment-level operations (via segments array manipulation).

**Solution**: Split into:
- **Collection Manager**: List, create, delete itineraries + metadata updates
- **Itinerary Manager**: Segment CRUD (delegates to SegmentService)

### 2. DocumentImportService Belongs in Travel Agent
**Issue**: DocumentImportService is currently treated as a separate concern, but it's actually an intelligent operation that should be part of the Travel Agent API.

**Reasoning**:
- Import involves analysis (gap detection, continuity validation)
- Import involves enhancement (geocoding, gap filling)
- Import produces intelligence (cost estimates, model selection)

**Solution**: Move import routes to Travel Agent API (`/api/v1/agent/import/*`)

### 3. TravelAgentService Has Incomplete Implementations
**Issue**: `completeTrip()` and `optimizeItinerary()` are marked TODO.

**Solution**: Implement these methods to:
- Analyze partial itineraries
- Suggest missing segments (meals, activities, transportation)
- Optimize segment ordering
- Balance activities based on trip type

### 4. No Direct Segment CRUD Routes
**Issue**: Current API only exposes itinerary-level operations. To modify segments, you must load the entire itinerary, modify segments array, and save.

**Solution**: Add dedicated segment routes in Itinerary Manager API for efficient operations.

### 5. Travel Agent is Mixed with Import
**Issue**: `TravelAgentService` is primarily used for gap filling during import, but it has broader capabilities (search, optimization, completion).

**Solution**: Expose full Travel Agent capabilities via dedicated API routes.

### 6. No Batch Operations
**Issue**: Adding multiple segments requires N API calls.

**Solution**: Add batch endpoints to Itinerary Manager:
```
POST /api/v1/itineraries/:id/segments/batch
Body: {
  add: [...segments],
  update: [...{id, updates}],
  delete: [...segmentIds]
}
```

### 7. Knowledge Service is Designer-Only
**Issue**: Knowledge service is only integrated with Trip Designer, but could be useful for Travel Agent (RAG for analysis).

**Solution**: Consider exposing knowledge search in Travel Agent API for semantic analysis.

---

## Refactoring Roadmap

### Phase 1: API Route Reorganization (No Service Changes)
**Goal**: Create new route structure without changing service layer

**Tasks**:
1. Create new API router structure:
   ```
   src/server/
     routers/
       collection-manager.router.ts
       itinerary-manager.router.ts
       travel-agent.router.ts
       trip-designer.router.ts
   ```

2. Migrate existing routes to new routers
3. Add version prefix: `/api/v1/`
4. Keep old routes as deprecated aliases
5. Update documentation

**Estimated Effort**: 1-2 days

---

### Phase 2: Service Layer Refinement
**Goal**: Clean up service responsibilities

**Tasks**:
1. **Split ItineraryService**:
   - Extract collection operations → `ItineraryCollectionService`
   - Keep itinerary persistence operations → `ItineraryService` (renamed to `ItineraryPersistenceService`)

2. **Consolidate Travel Agent Services**:
   - Merge `TravelAgentService`, `TravelAgentReviewService`, `SegmentContinuityService` into unified `TravelAgentService`
   - Extract analysis methods to `TravelAnalysisService` (helper)
   - Extract search methods to `TravelSearchService` (helper)

3. **Complete Travel Agent Implementation**:
   - Implement `completeTrip()`
   - Implement `optimizeItinerary()`
   - Add route planning capabilities

**Estimated Effort**: 3-4 days

---

### Phase 3: Enhanced Itinerary Manager API
**Goal**: Direct segment operations without full itinerary loading

**Tasks**:
1. Add segment CRUD routes
2. Add dependency management routes
3. Add batch operations
4. Optimize storage layer for segment-level operations (consider segment index)

**Estimated Effort**: 2-3 days

---

### Phase 4: Travel Agent API Expansion
**Goal**: Expose full intelligence capabilities

**Tasks**:
1. Add analysis endpoints (gaps, issues, summary)
2. Add enhancement endpoints (geocode, fill-gaps, infer-durations)
3. Add search endpoints (flights, hotels, transfers)
4. Add optimization endpoints (complete, optimize)
5. Add import endpoints (migrate from root)

**Estimated Effort**: 3-4 days

---

### Phase 5: API Documentation & Testing
**Goal**: Ensure APIs are well-documented and tested

**Tasks**:
1. Generate OpenAPI specs for each API
2. Add integration tests for all routes
3. Add example workflows
4. Performance testing (especially for batch operations)

**Estimated Effort**: 2-3 days

---

## Migration Strategy

### Backward Compatibility
- Keep old routes as aliases during transition
- Add deprecation headers:
  ```
  Deprecated: true
  Sunset: 2025-03-01
  Link: </api/v1/docs>; rel="successor-version"
  ```

### Client Migration Path
1. **Phase 1**: Old routes continue to work
2. **Phase 2**: Clients migrate to v1 routes
3. **Phase 3**: Old routes return 410 Gone

### Data Migration
- No data migration needed (service layer unchanged)
- Only route structure changes

---

## Priority Recommendations

### Immediate (P0) - Next Sprint
1. **Phase 1**: API route reorganization
   - Clear API boundaries make development easier
   - No risk (service layer unchanged)

2. Add segment CRUD routes (subset of Phase 3)
   - Unblocks efficient segment operations
   - High value for current workflows

### Short-term (P1) - Next Month
3. **Phase 2**: Service layer refinement
   - Clarifies responsibilities
   - Enables better testing

4. **Phase 4**: Travel Agent API expansion
   - Unlocks full intelligence capabilities
   - Enables advanced features

### Medium-term (P2) - Next Quarter
5. **Phase 3**: Complete Itinerary Manager API
   - Batch operations
   - Dependency management
   - Performance optimization

6. **Phase 5**: Documentation & testing
   - Essential for production readiness
   - Enables external integrations

---

## Architectural Principles

### Separation of Concerns
- **Collection Manager**: CRUD on itinerary entities
- **Itinerary Manager**: CRUD on itinerary contents
- **Travel Agent**: Stateless intelligence (analyze, enhance, search)
- **Trip Designer**: Stateful conversation (chat, tools, RAG)

### Data Flow
```
User Input
    ↓
Trip Designer (Chat)
    ↓
Tool Execution
    ├→ Itinerary Manager (Persist changes)
    ├→ Travel Agent (Analyze, search, enhance)
    └→ Collection Manager (Create/delete itineraries)
```

### Stateless vs. Stateful
- **Stateless**: Collection Manager, Itinerary Manager, Travel Agent
- **Stateful**: Trip Designer (session-based)

### API Composition
- Trip Designer is the **orchestrator** that calls other APIs
- Travel Agent provides **intelligence** but doesn't persist
- Itinerary Manager provides **persistence** but doesn't analyze
- Collection Manager provides **discovery** but doesn't manage contents

---

## Open Questions

1. **Authentication/Authorization**: How do we secure APIs for multi-user environments?
2. **Real-time Updates**: Should Itinerary Manager emit events when segments change?
3. **Webhooks**: Should Travel Agent support webhooks for long-running operations?
4. **API Gateway**: Should we use an API gateway for routing/rate limiting?
5. **GraphQL**: Should we consider GraphQL for flexible queries?

---

## Conclusion

The current codebase has excellent service layer separation but needs clear API boundaries. The proposed 4-API architecture provides:

- **Clear responsibilities**: Each API has a well-defined purpose
- **Composability**: APIs can be used independently or together
- **Extensibility**: New features map cleanly to existing APIs
- **Maintainability**: Service layer changes don't require API changes

The refactoring can be done incrementally with zero downtime and backward compatibility.

**Next Step**: Review this document with the team and prioritize Phase 1 implementation.

# API Routes Map

**Date**: 2024-12-19

This document shows all available API routes in the refactored architecture.

---

## Health Check
```
GET /api/health
```

---

## V1 API Routes (NEW)

### Collection Manager (`/api/v1/itineraries`)
```
GET    /api/v1/itineraries              # List all itineraries
POST   /api/v1/itineraries              # Create blank itinerary
GET    /api/v1/itineraries/:id          # Get itinerary metadata
PATCH  /api/v1/itineraries/:id          # Update metadata
DELETE /api/v1/itineraries/:id          # Delete itinerary
```

### Itinerary Manager (`/api/v1/itineraries/:id/segments`)
```
GET    /api/v1/itineraries/:id/segments                    # List segments
POST   /api/v1/itineraries/:id/segments                    # Add segment
GET    /api/v1/itineraries/:id/segments/:segmentId         # Get segment
PATCH  /api/v1/itineraries/:id/segments/:segmentId         # Update segment
DELETE /api/v1/itineraries/:id/segments/:segmentId         # Delete segment
POST   /api/v1/itineraries/:id/segments/reorder            # Reorder segments
POST   /api/v1/itineraries/:id/segments/:segmentId/move    # Move with cascade
```

### Travel Agent (`/api/v1/agent`)
```
POST   /api/v1/agent/analyze            # Analyze itinerary (501 - TODO)
POST   /api/v1/agent/summarize          # Generate summary (501 - TODO)
POST   /api/v1/agent/fill-gaps          # Fill geographic gaps (501 - TODO)
POST   /api/v1/agent/import/pdf         # Import PDF document
GET    /api/v1/agent/costs              # Cost tracking summary
GET    /api/v1/agent/models             # Available LLM models
```

### Trip Designer (`/api/v1/designer`)
```
POST   /api/v1/designer/sessions                              # Create chat session
GET    /api/v1/designer/sessions/:sessionId                   # Get session details
DELETE /api/v1/designer/sessions/:sessionId                   # End session
POST   /api/v1/designer/sessions/:sessionId/messages/stream   # Chat with SSE
POST   /api/v1/designer/sessions/:sessionId/messages          # Chat (non-streaming)
GET    /api/v1/designer/stats                                 # Trip Designer stats
GET    /api/v1/designer/knowledge/stats                       # Knowledge graph stats
POST   /api/v1/designer/knowledge/search                      # Search knowledge graph
```

---

## Legacy Routes (DEPRECATED)

**Warning**: All legacy routes include deprecation headers:
- `Deprecated: true`
- `Sunset: 2025-06-01`
- `Link: </api/v1/docs>; rel="successor-version"`

### Itinerary Operations
```
GET    /api/itineraries              → /api/v1/itineraries
POST   /api/itineraries              → /api/v1/itineraries
GET    /api/itineraries/:id          → /api/v1/itineraries/:id
PATCH  /api/itineraries/:id          → /api/v1/itineraries/:id
DELETE /api/itineraries/:id          → /api/v1/itineraries/:id
GET    /api/itineraries/:id/events   → (SSE endpoint, no v1 equivalent yet)
```

### Import & Models
```
POST   /api/import                   → /api/v1/agent/import/pdf
GET    /api/costs                    → /api/v1/agent/costs
GET    /api/models                   → /api/v1/agent/models
```

### Chat Operations
```
POST   /api/chat/sessions                              → /api/v1/designer/sessions
GET    /api/chat/sessions/:sessionId                   → /api/v1/designer/sessions/:sessionId
POST   /api/chat/sessions/:sessionId/messages/stream   → /api/v1/designer/sessions/:sessionId/messages/stream
POST   /api/chat/sessions/:sessionId/messages          → /api/v1/designer/sessions/:sessionId/messages
GET    /api/chat/stats                                 → /api/v1/designer/stats
```

### Knowledge Graph
```
GET    /api/knowledge/stats          → /api/v1/designer/knowledge/stats
POST   /api/knowledge/search         → /api/v1/designer/knowledge/search
```

---

## Route Organization by API

### 1. Collection Manager
**Purpose**: Manage the collection of itineraries (CRUD on entities)

**Routes**: 5 routes under `/api/v1/itineraries`

**Service**: `ItineraryService` (collection-level operations)

### 2. Itinerary Manager
**Purpose**: Manage segments within a single itinerary

**Routes**: 7 routes under `/api/v1/itineraries/:id/segments`

**Services**: `SegmentService`, `DependencyService`

### 3. Travel Agent
**Purpose**: Smart input/output for itineraries (import, analysis, enhancement)

**Routes**: 6 routes under `/api/v1/agent`

**Services**: `DocumentImportService`, `TravelAgentService`, `TravelAgentReviewService`

### 4. Trip Designer
**Purpose**: Conversational trip planning (chat interface)

**Routes**: 8 routes under `/api/v1/designer`

**Services**: `TripDesignerService`, `KnowledgeService`

---

## Client Migration Examples

### Example 1: List Itineraries
```typescript
// OLD (deprecated)
const itineraries = await fetch('/api/itineraries').then(r => r.json());

// NEW (v1)
const itineraries = await fetch('/api/v1/itineraries').then(r => r.json());
```

### Example 2: Import PDF
```typescript
// OLD (deprecated)
const formData = new FormData();
formData.append('file', pdfFile);
const result = await fetch('/api/import', {
  method: 'POST',
  body: formData
}).then(r => r.json());

// NEW (v1)
const formData = new FormData();
formData.append('file', pdfFile);
const result = await fetch('/api/v1/agent/import/pdf', {
  method: 'POST',
  body: formData
}).then(r => r.json());
```

### Example 3: Create Chat Session
```typescript
// OLD (deprecated)
const session = await fetch('/api/chat/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ itineraryId })
}).then(r => r.json());

// NEW (v1)
const session = await fetch('/api/v1/designer/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ itineraryId })
}).then(r => r.json());
```

### Example 4: Add Segment (NEW in v1)
```typescript
// This route didn't exist in legacy API!
const updated = await fetch(`/api/v1/itineraries/${itineraryId}/segments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'flight',
    startDatetime: '2024-01-15T10:00:00Z',
    endDatetime: '2024-01-15T14:00:00Z',
    location: 'New York',
    description: 'Flight to NYC'
  })
}).then(r => r.json());
```

---

## Testing Checklist

### V1 Routes
- [ ] GET /api/v1/itineraries
- [ ] POST /api/v1/itineraries
- [ ] GET /api/v1/itineraries/:id
- [ ] PATCH /api/v1/itineraries/:id
- [ ] DELETE /api/v1/itineraries/:id
- [ ] GET /api/v1/itineraries/:id/segments
- [ ] POST /api/v1/itineraries/:id/segments
- [ ] GET /api/v1/itineraries/:id/segments/:segmentId
- [ ] PATCH /api/v1/itineraries/:id/segments/:segmentId
- [ ] DELETE /api/v1/itineraries/:id/segments/:segmentId
- [ ] POST /api/v1/itineraries/:id/segments/reorder
- [ ] POST /api/v1/itineraries/:id/segments/:segmentId/move
- [ ] POST /api/v1/agent/import/pdf
- [ ] GET /api/v1/agent/costs
- [ ] GET /api/v1/agent/models
- [ ] POST /api/v1/designer/sessions
- [ ] GET /api/v1/designer/sessions/:sessionId
- [ ] POST /api/v1/designer/sessions/:sessionId/messages/stream
- [ ] POST /api/v1/designer/sessions/:sessionId/messages
- [ ] GET /api/v1/designer/stats
- [ ] GET /api/v1/designer/knowledge/stats
- [ ] POST /api/v1/designer/knowledge/search

### Legacy Routes (verify deprecation headers)
- [ ] All legacy routes return `Deprecated: true` header
- [ ] All legacy routes return `Sunset: 2025-06-01` header
- [ ] All legacy routes still work functionally

### Viewer Integration
- [ ] Update viewer-svelte/src/lib/api.ts to use v1 routes
- [ ] Test viewer functionality with new routes

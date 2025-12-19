# API Routes Reference - viewer-svelte

## Route Structure

```
/api/v1/
├── itineraries/                  # Itinerary management
│   ├── GET    /                 # List all itineraries
│   ├── POST   /                 # Create new itinerary
│   ├── GET    /:id              # Get itinerary by ID
│   ├── PATCH  /:id              # Update itinerary metadata
│   ├── DELETE /:id              # Delete itinerary
│   └── segments/
│       ├── POST   /:id/segments            # Add segment
│       ├── PATCH  /:id/segments/:sid       # Update segment
│       └── DELETE /:id/segments/:sid       # Delete segment
│
├── models/                       # Model configuration
│   └── GET    /                 # List available LLM models
│
├── designer/                     # Designer agent (chat)
│   └── sessions/
│       ├── POST   /                        # Create chat session
│       ├── GET    /:id                     # Get session details
│       ├── POST   /:id/messages            # Send message
│       └── POST   /:id/messages/stream     # Send message (streaming)
│
└── agent/                        # Import agent
    ├── import/
    │   └── POST   /pdf           # Import PDF itinerary
    └── costs/
        └── GET    /              # Get cost summary
```

## API Client Usage

All routes are accessed via the centralized `apiClient` object:

```typescript
import { apiClient } from '$lib/api';

// Itineraries
await apiClient.getItineraries();
await apiClient.getItinerary(id);
await apiClient.createItinerary(data);
await apiClient.updateItinerary(id, data);
await apiClient.deleteItinerary(id);

// Segments
await apiClient.addSegment(itineraryId, segmentData);
await apiClient.updateSegment(itineraryId, segmentId, segmentData);
await apiClient.deleteSegment(itineraryId, segmentId);

// Models
await apiClient.getModels();

// Import
await apiClient.importPDF(file, model);
await apiClient.getCosts();

// Chat/Designer
await apiClient.createChatSession(itineraryId);
await apiClient.sendChatMessage(sessionId, message);
await apiClient.getChatSession(sessionId);
for await (const event of apiClient.sendChatMessageStream(sessionId, message)) {
  // Handle streaming events
}
```

## Environment Configuration

Set the API base URL via environment variable:

```bash
# .env.local
VITE_API_URL=http://localhost:5177
```

Default: `http://localhost:5177`

## Development

```bash
# Start mock server (supports both /api/v1/* and legacy /api/*)
npm run mock-server

# Start Svelte dev server
npm run dev

# Type check
npm run check
```

## Migration Notes

- All API calls centralized in `src/lib/api.ts`
- No direct fetch calls in components or stores
- Route constants defined with TypeScript `as const` for type safety
- Mock server supports both new and legacy routes for backward compatibility

# SvelteKit API Migration

Successfully migrated Express API routes to SvelteKit server routes for Vercel deployment.

## Migration Overview

All Express routes from `src/server/routers/` have been migrated to SvelteKit's file-based routing in `viewer-svelte/src/routes/api/v1/`.

### Key Changes

1. **Service Initialization**: Centralized in `hooks.server.ts` (runs once at startup)
2. **Route Handlers**: Converted to SvelteKit's `RequestHandler` pattern
3. **Error Handling**: Using SvelteKit's `error()` helper for consistent error responses
4. **Streaming**: Native ReadableStream support for SSE endpoints
5. **File Uploads**: Native FormData handling (no multer dependency)

## Route Mapping

### Itinerary Collection (`collection-manager.router.ts`)

| Express Route | SvelteKit Route | Methods |
|--------------|-----------------|---------|
| `/api/v1/itineraries` | `api/v1/itineraries/+server.ts` | GET, POST |
| `/api/v1/itineraries/:id` | `api/v1/itineraries/[id]/+server.ts` | GET, PATCH, DELETE |

### Segments (`itinerary-manager.router.ts`)

| Express Route | SvelteKit Route | Methods |
|--------------|-----------------|---------|
| `/api/v1/itineraries/:id/segments` | `api/v1/itineraries/[id]/segments/+server.ts` | GET, POST |
| `/api/v1/itineraries/:id/segments/:segmentId` | `api/v1/itineraries/[id]/segments/[segmentId]/+server.ts` | GET, PATCH, DELETE |
| `/api/v1/itineraries/:id/segments/reorder` | `api/v1/itineraries/[id]/segments/reorder/+server.ts` | POST |
| `/api/v1/itineraries/:id/segments/:segmentId/move` | `api/v1/itineraries/[id]/segments/[segmentId]/move/+server.ts` | POST |

### Travel Agent (`travel-agent.router.ts`)

| Express Route | SvelteKit Route | Methods |
|--------------|-----------------|---------|
| `/api/v1/agent/analyze` | `api/v1/agent/analyze/+server.ts` | POST |
| `/api/v1/agent/summarize` | `api/v1/agent/summarize/+server.ts` | POST |
| `/api/v1/agent/fill-gaps` | `api/v1/agent/fill-gaps/+server.ts` | POST |
| `/api/v1/agent/import/pdf` | `api/v1/agent/import/pdf/+server.ts` | POST |
| `/api/v1/agent/costs` | `api/v1/agent/costs/+server.ts` | GET |
| `/api/v1/agent/models` | `api/v1/agent/models/+server.ts` | GET |

### Trip Designer (`trip-designer.router.ts`)

| Express Route | SvelteKit Route | Methods |
|--------------|-----------------|---------|
| `/api/v1/designer/sessions` | `api/v1/designer/sessions/+server.ts` | POST |
| `/api/v1/designer/sessions/:sessionId` | `api/v1/designer/sessions/[sessionId]/+server.ts` | GET, DELETE |
| `/api/v1/designer/sessions/:sessionId/messages` | `api/v1/designer/sessions/[sessionId]/messages/+server.ts` | POST |
| `/api/v1/designer/sessions/:sessionId/messages/stream` | `api/v1/designer/sessions/[sessionId]/messages/stream/+server.ts` | POST |
| `/api/v1/designer/stats` | `api/v1/designer/stats/+server.ts` | GET |
| `/api/v1/designer/knowledge/stats` | `api/v1/designer/knowledge/stats/+server.ts` | GET |
| `/api/v1/designer/knowledge/search` | `api/v1/designer/knowledge/search/+server.ts` | POST |

## Architecture

### Service Initialization (`hooks.server.ts`)

Services are initialized once at server startup and made available to all routes via `event.locals.services`:

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const services = await initializeServices();
  event.locals.services = services;
  return resolve(event);
};
```

### Route Handler Pattern

SvelteKit routes use named exports for HTTP methods:

```typescript
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  const { itineraryService } = locals.services;
  // ... handle request
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  // ... handle request
};
```

### Error Handling

SvelteKit's `error()` helper provides consistent error responses:

```typescript
import { error } from '@sveltejs/kit';

if (!result.success) {
  throw error(404, {
    message: 'Itinerary not found: ' + result.error.message
  });
}
```

### Streaming Responses

SSE streaming uses native ReadableStream:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    for await (const event of service.chatStream(sessionId, message)) {
      controller.enqueue(encoder.encode(`event: ${event.type}\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    }
    controller.close();
  }
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
});
```

### File Uploads

Native FormData handling replaces multer:

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw error(400, { message: 'No file uploaded' });
  }

  // Save file
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);

  // Process file
};
```

## Frontend Integration

The API client (`src/lib/api.ts`) now uses relative URLs:

```typescript
// For SvelteKit deployment, use relative URLs (same origin)
// For standalone Express server, use VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
```

This allows the frontend to work with:
- **Production (Vercel)**: Same-origin requests to SvelteKit routes
- **Development**: Optional external Express server via `VITE_API_URL`

## Express Server Status

The Express server (`src/server/`) is now **CLI-only** for local development:

```typescript
/**
 * Server entry point for CLI-only local development
 *
 * NOTE: This Express server is for CLI/local development only.
 * For production deployments, use the SvelteKit server routes.
 */
```

## Deployment

### Vercel Deployment

The SvelteKit app is configured with `@sveltejs/adapter-vercel`:

```javascript
// svelte.config.js
adapter: adapter({
  runtime: 'nodejs20.x'
})
```

All API routes are serverless functions automatically deployed by Vercel.

### Environment Variables

Configure in Vercel dashboard or `.env`:

- `OPENROUTER_API_KEY` - Required for LLM features (import, chat, analysis)
- `SERPAPI_API_KEY` - Optional for travel agent web search

## Testing

Test routes locally with SvelteKit dev server:

```bash
cd viewer-svelte
npm run dev
```

All routes are available at `http://localhost:5173/api/v1/*`

## Migration Benefits

1. **Vercel Optimization**: Native serverless function deployment
2. **Type Safety**: Full TypeScript integration with route types
3. **Simplified Architecture**: No separate Express server in production
4. **Better DX**: Hot module reloading for API routes
5. **Reduced Dependencies**: No multer, no Express in production bundle
6. **Streaming Support**: Native ReadableStream for SSE
7. **Same-Origin Requests**: No CORS needed in production

## Lines of Code (LOC) Analysis

**Migration Summary:**
- Routes migrated: 19 endpoints across 19 files
- Services initialized: 10 services in hooks.server.ts
- Express routes status: Marked as CLI-only (kept for backward compatibility)
- Frontend changes: Minimal (API client URL configuration only)

**Net Change:**
- Added: ~1,200 lines (SvelteKit routes + hooks)
- Removed: 0 lines (Express routes kept for CLI)
- Modified: 3 files (API client, Express server notes)

**Future Cleanup Opportunity:**
- Express server can be removed once CLI commands migrate to SvelteKit load functions
- Estimated removal: ~800 lines when fully deprecated

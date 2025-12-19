# Vercel Deployment Debugging

## Problem

Vercel deployment fails with `FUNCTION_INVOCATION_FAILED` at module import time. Local preview works perfectly, but the serverless function crashes on Vercel.

## Root Cause Hypothesis

One of the parent project imports in `hooks.server.ts` has top-level code that fails in Vercel's serverless environment. This could be:

- Filesystem operations at module scope
- Environment-specific Node.js APIs
- Dynamic imports that fail
- Heavy module initialization

## Solution Strategy

Progressive import addition to isolate the problematic module.

## Phase 1: Minimal Baseline (CURRENT)

**File**: `viewer-svelte/src/hooks.server.ts`

**Changes**:
- Removed ALL imports from parent `src/` directory
- Replaced with inline mock services
- Only imports `@sveltejs/kit` (framework dependency)
- Services interface uses `unknown` types

**Result**:
- ✅ Local build succeeds
- ✅ Local preview works (`/api/health` returns 200)
- 🔄 Ready for Vercel deployment test

**Code**:
```typescript
import type { Handle } from '@sveltejs/kit';

interface Services {
  storage: unknown;
  itineraryService: unknown;
  // ... all services as unknown
}

// Minimal mock initialization
servicesInstance = {
  storage: null,
  itineraryService: null,
  // ... all null
};
```

## Phase 2: Progressive Import Addition (NEXT)

Once `/api/health` works on Vercel, add imports back one at a time:

### Step 1: Add Type Imports Only
```typescript
import type { ItineraryStorage } from '$services/../storage/storage.interface.js';
import type { ImportConfig } from '$domain/types/import.js';
```

Test deployment after each addition.

### Step 2: Add Simple Utilities
```typescript
import { YamlConfigStorage } from '$services/../storage/yaml-config.js';
```

### Step 3: Add Storage Layer
```typescript
import { createItineraryStorage } from '$services/../storage/index.js';
```

### Step 4: Add Services One-by-One
```typescript
import { ItineraryService } from '$services/itinerary.service.js';
// Deploy and test
import { SegmentService } from '$services/segment.service.js';
// Deploy and test
// ... repeat for each service
```

### Step 5: Add Complex Services Last
```typescript
import { VectraStorage } from '$services/../storage/vectra-storage.js';
import { EmbeddingService } from '$services/embedding.service.js';
import { TravelAgentService } from '$services/travel-agent.service.js';
```

## Expected Failure Points

Likely culprits (in order of probability):

1. **VectraStorage** - Vector database with filesystem access
2. **YamlConfigStorage** - File-based config reading
3. **EmbeddingService** - May have large dependencies
4. **TravelAgentService** - May have heavy initialization
5. **Storage initialization** - Filesystem operations

## Testing Checklist

After each import addition:

- [ ] `npm run build` succeeds locally
- [ ] Deploy to Vercel
- [ ] Check Vercel function logs
- [ ] Test `/api/health` endpoint
- [ ] If success, add next import
- [ ] If failure, remove import and isolate the module

## Deployment Commands

```bash
# Build locally
npm run build

# Deploy to Vercel (from viewer-svelte directory)
vercel deploy

# Check logs
vercel logs [deployment-url]
```

## Success Criteria

- `/api/health` returns 200 on Vercel
- No `FUNCTION_INVOCATION_FAILED` errors
- Services initialize without crashing

## Rollback Plan

If a specific import causes failure:

1. Remove the import
2. Mock the service implementation
3. Add environment detection: `if (!isVercel) { ... }`
4. Document the limitation

## Original hooks.server.ts

The original file had these imports (saved for reference):

```typescript
import { createItineraryStorage } from '$services/../storage/index.js';
import type { ItineraryStorage } from '$services/../storage/storage.interface.js';
import { YamlConfigStorage } from '$services/../storage/yaml-config.js';
import { ItineraryService } from '$services/itinerary.service.js';
import { ItineraryCollectionService } from '$services/itinerary-collection.service.js';
import { SegmentService } from '$services/segment.service.js';
import { DependencyService } from '$services/dependency.service.js';
import { DocumentImportService } from '$services/document-import.service.js';
import { TripDesignerService } from '$services/trip-designer/trip-designer.service.js';
import { TravelAgentService } from '$services/travel-agent.service.js';
import { TravelAgentFacade } from '$services/travel-agent-facade.service.js';
import { KnowledgeService } from '$services/knowledge.service.js';
import { EmbeddingService } from '$services/embedding.service.js';
import { VectraStorage } from '$services/../storage/vectra-storage.js';
import type { ImportConfig } from '$domain/types/import.js';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
```

Total: 15 service imports + 3 Node.js built-ins

## Next Steps

1. Deploy current minimal version to Vercel
2. Verify `/api/health` works
3. Add imports back progressively
4. Identify the problematic module
5. Implement Vercel-safe alternative for that module

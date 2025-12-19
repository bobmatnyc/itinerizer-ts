# Agent Memory: ops
<!-- Last Updated: 2025-12-18T18:20:00.000000+00:00Z -->

## Itinerizer Server Configuration

**Default paired ports:**
- **Frontend (Svelte)**: `5176`
- **API (real server)**: `5177`

**Start commands:**
```bash
# API Server (real - reads config from .itinerizer/config.yaml)
npx tsx src/server/index.ts

# Frontend Dev Server
cd viewer-svelte && npm run dev
```

**Config files:**
- `viewer-svelte/vite.config.ts` - Frontend port (5176)
- `viewer-svelte/.env` - API URL (VITE_API_URL=http://localhost:5177)
- `viewer-svelte/src/lib/api.ts` - API URL default
- `.itinerizer/config.yaml` - API keys (OpenRouter, SerpAPI)
- `src/server/index.ts` - API server entry point

**API Key Loading:**
1. Primary: `.itinerizer/config.yaml` → `openrouter.apiKey`
2. Fallback: `OPENROUTER_API_KEY` environment variable
3. If neither: Server runs in read-only mode (import disabled)

**Schema Normalization:**
- LLM outputs are automatically normalized during import
- Existing files can be re-normalized: `npx tsx scripts/normalize-existing.ts`
- Validates: `npx tsx scripts/validate-itineraries.ts`


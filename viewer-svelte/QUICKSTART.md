# Quickstart Guide

## Prerequisites

- Node.js 18+ installed

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:5176 in your browser.

## Environment Configuration

Create a `.env` file (or use the existing one):

```bash
# Optional: OpenRouter API key for LLM features
OPENROUTER_API_KEY=your-key-here
```

**Note:** SvelteKit handles both the frontend AND API on the same server (port 5176).

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript and Svelte checks

## First Steps

1. Start the dev server: `npm run dev`
2. Open http://localhost:5176
3. You should see the Itinerizer Viewer interface
4. Import a PDF file to test the full workflow

## Features

- View all itineraries in the sidebar
- Click an itinerary to see details
- Upload PDF files with optional model selection
- View segments with type-specific styling
- Dark mode based on system preferences

## Troubleshooting

### Port already in use
Change the port in `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 5177 // Change to any available port
  }
});
```

### API routes not working
Verify SvelteKit routes are properly configured in `src/routes/api/v1/`

### Build errors
Clean and reinstall dependencies:
```bash
rm -rf node_modules .svelte-kit
npm install
npm run check
```

## Differences from React Viewer

### Performance
- Smaller bundle size (~80% reduction)
- Faster initial load
- No virtual DOM overhead

### Development
- File-based routing (no React Router)
- Svelte stores instead of React Query
- Reactive statements instead of useEffect
- Simpler component syntax

### API
SvelteKit handles all API routes at `/api/v1/*`:
- GET /api/v1/itineraries
- GET /api/v1/itineraries/:id
- POST /api/v1/designer/sessions
- POST /api/v1/designer/sessions/:id/messages
- POST /api/v1/agent/import/pdf

## Next Steps

- Explore the codebase in `src/`
- Read `CONVERSION.md` for detailed migration patterns
- Check `README.md` for full documentation

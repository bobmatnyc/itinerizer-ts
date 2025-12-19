# Itinerizer Web Viewer

This document describes the new features added to itinerizer-ts: Dynamic Model Selection and Web Viewer.

## Feature 1: Dynamic Model Selection

The `ModelSelectorService` automatically selects the most cost-effective model based on PDF file size.

### How It Works

- **Small files (<500KB)**: Uses `claude-3-haiku` (8,192 tokens, $0.25/M input)
- **Medium files (<2MB)**: Uses `claude-3.5-sonnet` (16,384 tokens, $3.00/M input)
- **Large files (<10MB)**: Uses `claude-3-opus` (32,768 tokens, $15.00/M input)

### Usage

```typescript
import { ModelSelectorService } from './services/model-selector.service.js';

const selector = new ModelSelectorService();

// Auto-select model based on file size
const result = await selector.selectModelForFile('path/to/file.pdf');
if (result.success) {
  console.log(`Selected model: ${result.value.name}`);
  console.log(`Max tokens: ${result.value.maxTokens}`);
}

// Estimate cost
const costResult = await selector.estimateCost('path/to/file.pdf');
if (costResult.success) {
  console.log(`Estimated cost: $${costResult.value.estimatedCost.toFixed(4)}`);
}
```

### Integration

The `DocumentImportService` now automatically uses `ModelSelectorService` when no model is specified:

```bash
# Auto-selects best model based on file size
itinerizer import my-itinerary.pdf

# Or specify a model explicitly
itinerizer import my-itinerary.pdf --model anthropic/claude-3.5-sonnet
```

## Feature 2: Web Viewer

A modern React-based web interface for viewing and managing itineraries.

### Architecture

**Backend (Express API Server)**
- `/api/itineraries` - List all itineraries
- `/api/itineraries/:id` - Get itinerary details
- `/api/models` - List available models
- `/api/import` - Import PDF (multipart form)
- `/api/costs` - Get cost summary

**Frontend (Vite + React + Tailwind)**
- List view with all itineraries
- Detail view with segment timeline
- Visual indicators for segment source (📄 import, 🤖 agent, ✍️ manual)
- Color-coded segment types
- PDF import with model selection
- Gap detection visualization

### Running the Viewer

1. Set up environment variables:

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your OpenRouter API key
OPENROUTER_API_KEY=your_key_here
```

2. Start both API server and viewer:

```bash
npm run viewer
```

This will start:
- API server on http://localhost:3001
- Vite dev server on http://localhost:5173

3. Open http://localhost:5173 in your browser

### Building for Production

```bash
# Build viewer for production
npm run viewer:build

# Build is output to viewer/dist/
```

### Features

**Itinerary List**
- Shows all imported itineraries
- Date ranges and trip metadata
- Tag-based filtering
- Click to view details

**Itinerary Detail**
- Complete segment timeline
- Source indicators (import/agent/manual)
- Status badges (confirmed, tentative, cancelled)
- Type-specific details (flight numbers, hotel names, etc.)
- Inferred segment highlighting

**PDF Import**
- Drag-and-drop or file select
- Model selection dropdown (or auto-select)
- Real-time import progress
- Continuity validation results

**Visual Design**
- Dark mode support
- Color-coded segments:
  - 🔵 Flights (blue)
  - 🟣 Hotels (purple)
  - 🟠 Transfers (orange)
  - 🟢 Activities (green)
  - 🔴 Meetings (indigo)
  - ⚪ Custom (gray)

## API Examples

### Import a PDF via API

```bash
curl -X POST http://localhost:3001/api/import \
  -F "file=@my-itinerary.pdf" \
  -F "model=anthropic/claude-3.5-sonnet"
```

### Get All Itineraries

```bash
curl http://localhost:3001/api/itineraries
```

### Get Available Models

```bash
curl http://localhost:3001/api/models
```

## Development

### Project Structure

```
itinerizer-ts/
├── src/
│   ├── services/
│   │   └── model-selector.service.ts  # Dynamic model selection
│   └── server/
│       ├── api.ts                     # Express API routes
│       └── index.ts                   # Server entry point
├── viewer/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ItineraryList.tsx
│   │   │   ├── ItineraryDetail.tsx
│   │   │   ├── SegmentCard.tsx
│   │   │   └── GapIndicator.tsx
│   │   ├── hooks/
│   │   │   └── useItineraries.ts      # React Query hooks
│   │   ├── lib/
│   │   │   └── api.ts                 # API client
│   │   └── types/
│   │       └── index.ts               # TypeScript types
│   ├── tailwind.config.js
│   └── vite.config.ts
└── package.json
```

### Scripts

- `npm run server` - Start API server only
- `npm run viewer:dev` - Start Vite dev server only
- `npm run viewer` - Start both (recommended)
- `npm run viewer:build` - Build viewer for production

## LOC Summary

**Feature 1: Model Selector Service**
- Added: ~200 lines (model-selector.service.ts)
- Modified: ~50 lines (document-import.service.ts, llm.service.ts)

**Feature 2: Web Viewer**
- Added: ~1,200 lines (server, viewer components, hooks, types)
- Modified: ~20 lines (package.json scripts)

**Total Net Change**: +1,470 lines

Both features integrate seamlessly with the existing codebase and maintain type safety throughout.

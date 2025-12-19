# Quickstart Guide

## Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:3001`

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Environment Configuration

Create a `.env` file (or use the existing one):

```bash
VITE_API_URL=http://localhost:3001
```

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript and Svelte checks

## First Steps

1. Make sure the backend API is running on port 3001
2. Start the dev server: `npm run dev`
3. Open http://localhost:5173
4. You should see the Itinerizer Viewer interface
5. Import a PDF file to test the full workflow

## Features

- View all itineraries in the sidebar
- Click an itinerary to see details
- Upload PDF files with optional model selection
- View segments with type-specific styling
- Dark mode based on system preferences

## Troubleshooting

### Backend not responding
Make sure the backend is running:
```bash
cd ../backend
npm run dev
```

### Port already in use
Change the port in the dev command:
```bash
npm run dev -- --port 5174
```

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
All API endpoints are identical:
- GET /api/itineraries
- GET /api/itineraries/:id
- GET /api/models
- POST /api/import
- GET /api/costs

## Next Steps

- Explore the codebase in `src/`
- Read `CONVERSION.md` for detailed migration patterns
- Check `README.md` for full documentation

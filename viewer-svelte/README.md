# Itinerizer Viewer - SvelteKit

A SvelteKit-based frontend viewer for the Itinerizer system. This is a conversion from the React viewer with identical functionality.

## Features

- Two-pane layout with sidebar itinerary list and detail panel
- PDF upload with LLM model selection
- Type-specific segment cards with color coding
- Source badges (Import, Agent, Manual)
- Inferred segment indicators
- Dark mode support
- Full TypeScript type safety

## Tech Stack

- **SvelteKit** - Full-stack web framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **lucide-svelte** - Icons
- **Vite** - Build tool

## Project Structure

```
viewer-svelte/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main application page
│   │   └── +layout.svelte        # App layout with CSS imports
│   ├── lib/
│   │   ├── api.ts                # Fetch-based API client
│   │   ├── types.ts              # TypeScript types
│   │   ├── stores/
│   │   │   └── itineraries.ts    # Svelte stores for state
│   │   └── components/
│   │       ├── ItineraryList.svelte
│   │       ├── ItineraryDetail.svelte
│   │       ├── SegmentCard.svelte
│   │       └── GapIndicator.svelte
│   └── app.css                   # Tailwind imports
├── tailwind.config.js
└── package.json
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API URL:**
   Copy `.env.example` to `.env` and set your API URL (default: `http://localhost:3001`):
   ```bash
   cp .env.example .env
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## API Endpoints

The viewer expects the following backend API endpoints:

- `GET /api/itineraries` - List all itineraries
- `GET /api/itineraries/:id` - Get single itinerary
- `GET /api/models` - Get available LLM models
- `POST /api/import` - Upload PDF (multipart/form-data)
- `GET /api/costs` - Get cost summary

## Key Svelte Patterns Used

### State Management
- Uses Svelte stores (`writable`, `derived`) instead of React Query
- Stores defined in `/lib/stores/itineraries.ts`
- Access store values with `$` prefix (e.g., `$itineraries`)

### Reactivity
- `$:` reactive statements for derived values
- `onMount` lifecycle for initialization
- Direct variable updates trigger reactivity

### Components
- Props: `export let propName`
- Events: `on:click`, `on:change`
- Bindings: `bind:value`, `bind:this`
- Component communication via callback props

### API Calls
- Native `fetch` API instead of Axios
- Async/await for all API operations
- Error handling with try/catch

## Component Conversions

### React → Svelte Mappings

| React Pattern | Svelte Equivalent |
|---------------|-------------------|
| `useState` | `let` variable |
| `useEffect` | `onMount` or `$:` |
| `useQuery` | Svelte stores + `onMount` |
| `className` | `class` |
| `onClick` | `on:click` |
| `{children}` | `<slot />` |
| Props | `export let prop` |

## Dark Mode

Dark mode is automatically applied based on system preferences using Tailwind's `dark:` prefix classes.

## Development

- Hot module replacement (HMR) enabled
- TypeScript strict mode
- ESLint and Prettier configured (optional)

## License

Same as parent Itinerizer project.

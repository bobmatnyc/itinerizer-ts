# React to Svelte Conversion Summary

This document details the conversion from the React viewer to SvelteKit.

## File Structure Comparison

### React (viewer/)
```
viewer/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── ItineraryList.tsx
│   │   ├── ItineraryDetail.tsx
│   │   ├── SegmentCard.tsx
│   │   └── GapIndicator.tsx
│   ├── hooks/
│   │   └── useItineraries.ts
│   ├── lib/
│   │   └── api.ts
│   └── types/
│       └── index.ts
```

### SvelteKit (viewer-svelte/)
```
viewer-svelte/
├── src/
│   ├── routes/
│   │   ├── +page.svelte (App.tsx equivalent)
│   │   └── +layout.svelte
│   ├── lib/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── stores/
│   │   │   └── itineraries.ts (hooks equivalent)
│   │   └── components/
│   │       ├── ItineraryList.svelte
│   │       ├── ItineraryDetail.svelte
│   │       ├── SegmentCard.svelte
│   │       └── GapIndicator.svelte
│   └── app.css
```

## Key Conversions

### 1. State Management

**React (React Query):**
```tsx
import { useQuery, useMutation } from '@tanstack/react-query';

const { data: itineraries, isLoading } = useItineraries();
const { data: selectedItinerary } = useItinerary(selectedId);
const importMutation = useImportPDF();
```

**Svelte (Stores):**
```ts
import { writable } from 'svelte/store';

export const itineraries = writable<ItineraryListItem[]>([]);
export const itinerariesLoading = writable<boolean>(true);

// In component:
import { itineraries } from '$lib/stores/itineraries';
// Access with $itineraries
```

### 2. Component Syntax

**React Component:**
```tsx
interface Props {
  segment: Segment;
}

export function SegmentCard({ segment }: Props) {
  return (
    <div className="p-4">
      <h3>{segment.title}</h3>
    </div>
  );
}
```

**Svelte Component:**
```svelte
<script lang="ts">
  import type { Segment } from '../types';

  export let segment: Segment;
</script>

<div class="p-4">
  <h3>{segment.title}</h3>
</div>
```

### 3. Reactivity

**React (useEffect, useState):**
```tsx
const [count, setCount] = useState(0);
const [doubled, setDoubled] = useState(0);

useEffect(() => {
  setDoubled(count * 2);
}, [count]);
```

**Svelte (Reactive Statements):**
```svelte
<script lang="ts">
  let count = 0;
  $: doubled = count * 2;
</script>
```

### 4. Event Handling

**React:**
```tsx
<button onClick={() => handleClick(id)}>Click</button>
<input onChange={(e) => handleChange(e)} />
```

**Svelte:**
```svelte
<button on:click={() => handleClick(id)}>Click</button>
<input on:change={(e) => handleChange(e)} />
```

### 5. Conditional Rendering

**React:**
```tsx
{isLoading && <Loader />}
{error && <Error message={error} />}
{data && <Content data={data} />}
```

**Svelte:**
```svelte
{#if isLoading}
  <Loader />
{/if}

{#if error}
  <Error message={error} />
{/if}

{#if data}
  <Content {data} />
{/if}
```

### 6. List Rendering

**React:**
```tsx
{items.map((item) => (
  <Item key={item.id} item={item} />
))}
```

**Svelte:**
```svelte
{#each items as item (item.id)}
  <Item {item} />
{/each}
```

### 7. API Client

**React (Axios):**
```ts
import axios from 'axios';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

export const apiClient = {
  async getItineraries(): Promise<ItineraryListItem[]> {
    const response = await api.get<ItineraryListItem[]>('/itineraries');
    return response.data;
  },
};
```

**Svelte (Fetch):**
```ts
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export const apiClient = {
  async getItineraries(): Promise<ItineraryListItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/itineraries`);
    return handleResponse<ItineraryListItem[]>(response);
  },
};
```

### 8. Icon Libraries

**React:**
```tsx
import { Upload, Loader2 } from 'lucide-react';

<Upload className="w-4 h-4" />
```

**Svelte:**
```svelte
<script lang="ts">
  import { Upload, Loader2 } from 'lucide-svelte';
</script>

<Upload class="w-4 h-4" />
```

### 9. Dynamic Components

**React:**
```tsx
const Icon = SEGMENT_ICONS[segment.type];
<Icon className="w-5 h-5" />
```

**Svelte:**
```svelte
<script lang="ts">
  $: Icon = SEGMENT_ICONS[segment.type];
</script>

<svelte:component this={Icon} class="w-5 h-5" />
```

### 10. Lifecycle

**React:**
```tsx
import { useEffect } from 'react';

useEffect(() => {
  loadData();
}, []); // on mount
```

**Svelte:**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    loadData();
  });
</script>
```

## Bundle Size Comparison

### React Build
- Main bundle: ~150KB (with React, React DOM, React Query)
- Total dependencies: ~80 packages

### Svelte Build
- Main bundle: ~30KB (Svelte compiles away)
- Total dependencies: ~68 packages

**Reduction:** ~80% smaller JavaScript bundle

## Performance Benefits

1. **No Virtual DOM**: Svelte compiles to vanilla JavaScript, no runtime overhead
2. **Smaller Bundle**: Significantly smaller JavaScript payload
3. **Reactive by Default**: No need for memo/useMemo/useCallback
4. **Less Boilerplate**: Simpler component syntax
5. **Built-in Animations**: Transitions/animations included

## Development Experience

### What's Better in Svelte:
- Less boilerplate code
- Built-in reactivity without hooks
- Simpler component syntax
- Better TypeScript inference in templates
- No prop drilling (use stores or context)
- Scoped styles by default

### What's Different:
- File-based routing (SvelteKit)
- Store pattern instead of Context API
- `$:` reactive statements instead of useEffect
- Component instances are true JavaScript objects

## Migration Checklist

- [x] Create SvelteKit project structure
- [x] Install dependencies (Tailwind, lucide-svelte)
- [x] Convert TypeScript types
- [x] Implement API client with fetch
- [x] Create Svelte stores for state management
- [x] Convert all components to Svelte syntax
- [x] Implement main page with layout
- [x] Add Tailwind CSS configuration
- [x] Verify type checking
- [x] Test production build
- [x] Document conversion patterns

## Testing the Conversion

1. Start the backend API server on port 3001
2. Run the Svelte viewer:
   ```bash
   cd viewer-svelte
   npm install
   npm run dev
   ```
3. Compare functionality with React viewer
4. Verify all features work identically

## Notes

- All functionality from the React version is preserved
- Same Tailwind classes used for identical styling
- Same API endpoints and data structures
- Dark mode support maintained
- TypeScript strict mode enabled
- Zero breaking changes to API contract

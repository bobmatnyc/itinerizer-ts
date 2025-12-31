# Import UI - Quick Reference

## Usage Examples

### Basic Import Dialog (Standalone)

```svelte
<script lang="ts">
  import ImportDialog from '$lib/components/ImportDialog.svelte';

  let showImport = $state(false);

  function handleComplete(itineraryId: string, itineraryName: string) {
    console.log(`Imported to ${itineraryName}`);
    showImport = false;
  }
</script>

<button onclick={() => showImport = true}>Import</button>

<ImportDialog bind:open={showImport} onComplete={handleComplete} />
```

### Pre-selected Itinerary

```svelte
<script lang="ts">
  import ImportDialog from '$lib/components/ImportDialog.svelte';

  let showImport = $state(false);
  let currentItineraryId = $state('itin_abc123');

  function handleComplete(itineraryId: string, itineraryName: string) {
    toast.success(`Added to ${itineraryName}`);
  }
</script>

<button onclick={() => showImport = true}>Import to This Trip</button>

<ImportDialog
  bind:open={showImport}
  preselectedItineraryId={currentItineraryId}
  onComplete={handleComplete}
/>
```

### Using Individual Components

#### Segment Preview Only

```svelte
<script lang="ts">
  import SegmentPreview from '$lib/components/SegmentPreview.svelte';
  import type { ExtractedSegment } from '$lib/types';

  let segments: ExtractedSegment[] = [
    {
      type: 'FLIGHT',
      status: 'CONFIRMED',
      startDatetime: new Date('2025-03-01T10:00:00Z'),
      endDatetime: new Date('2025-03-01T14:00:00Z'),
      airline: { name: 'United', code: 'UA' },
      flightNumber: '123',
      origin: { name: 'LAX', code: 'LAX', city: 'Los Angeles' },
      destination: { name: 'JFK', code: 'JFK', city: 'New York' },
      confidence: 0.95
    }
  ];
</script>

<SegmentPreview {segments} />
```

#### Trip Match Card Only

```svelte
<script lang="ts">
  import TripMatchCard from '$lib/components/TripMatchCard.svelte';
  import type { TripMatch } from '$lib/types';

  let match: TripMatch = {
    itineraryId: 'itin_123',
    itineraryName: 'Tokyo Trip',
    destination: 'Tokyo, Japan',
    dateRange: { start: '2025-03-01', end: '2025-03-07' },
    matchScore: 0.85,
    matchReasons: ['Date overlap: 80% (5 days)', 'Destination match: Tokyo']
  };

  let selected = $state(false);

  function handleSelect() {
    selected = true;
    console.log('Selected:', match.itineraryId);
  }
</script>

<TripMatchCard {match} {selected} onSelect={handleSelect} />
```

## API Integration

### Upload File and Get Matches

```typescript
async function uploadFile(file: File, userId: string) {
  const formData = new FormData();
  formData.append('file', file);

  const url = `/api/v1/import/upload?userId=${encodeURIComponent(userId)}&autoMatch=true`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const result = await response.json();
  // result.segments: ExtractedSegment[]
  // result.tripMatches: TripMatch[]
  // result.confidence: number
  // result.summary: string

  return result;
}
```

### Confirm Import to Existing Trip

```typescript
async function confirmImport(
  segments: ExtractedSegment[],
  itineraryId: string,
  userId: string
) {
  const response = await fetch('/api/v1/import/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      segments,
      itineraryId,
      userId
    })
  });

  if (!response.ok) {
    throw new Error('Import failed');
  }

  const result = await response.json();
  // result.action: 'added_to_existing'
  // result.itineraryId: string
  // result.itineraryName: string
  // result.deduplication: { added, skipped, duplicates }

  return result;
}
```

### Confirm Import with New Trip

```typescript
async function confirmImportNewTrip(
  segments: ExtractedSegment[],
  tripName: string,
  userId: string
) {
  const response = await fetch('/api/v1/import/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      segments,
      createNew: true,
      name: tripName, // or tripName: tripName
      userId
    })
  });

  if (!response.ok) {
    throw new Error('Import failed');
  }

  const result = await response.json();
  // result.action: 'created_new'
  // result.selectedItinerary: { id, name }

  return result;
}
```

## Type Definitions

### ExtractedSegment

```typescript
interface ExtractedSegment extends Omit<Segment, 'id' | 'metadata' | 'travelerIds'> {
  confidence: number; // 0-1
  source?: 'import' | 'user' | 'agent';
}

// Example
const flightSegment: ExtractedSegment = {
  type: 'FLIGHT',
  status: 'CONFIRMED',
  startDatetime: new Date(),
  endDatetime: new Date(),
  airline: { name: 'United', code: 'UA' },
  flightNumber: '123',
  origin: { /* ... */ },
  destination: { /* ... */ },
  confidence: 0.92
};
```

### TripMatch

```typescript
interface TripMatch {
  itineraryId: string;
  itineraryName: string;
  destination: string;
  dateRange: {
    start: string; // ISO date or 'Not set'
    end: string;   // ISO date or 'Not set'
  };
  matchScore: number; // 0-1
  matchReasons: string[]; // Human-readable reasons
}

// Example
const match: TripMatch = {
  itineraryId: 'itin_abc123',
  itineraryName: 'Tokyo Spring Trip',
  destination: 'Tokyo, Japan',
  dateRange: { start: '2025-03-01', end: '2025-03-07' },
  matchScore: 0.82,
  matchReasons: [
    'Date overlap: 80% (5 days)',
    'Destination match: Tokyo'
  ]
};
```

## Styling Customization

### Override Modal Styles

```svelte
<ImportDialog bind:open={showImport} />

<style>
  :global(.modal-backdrop) {
    backdrop-filter: blur(8px); /* Increase blur */
  }

  :global(.modal-card) {
    max-width: 60rem; /* Wider modal */
  }

  :global(.modal-button-confirm) {
    background-color: #10b981; /* Green instead of blue */
  }
</style>
```

### Custom Segment Preview

```svelte
<SegmentPreview {segments} />

<style>
  :global(.segment-preview) {
    background-color: #fafafa;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  :global(.segment-item) {
    background-color: white; /* Override default */
  }
</style>
```

## Common Patterns

### Loading State

```svelte
<script lang="ts">
  let uploading = $state(false);
  let segments = $state<ExtractedSegment[]>([]);

  async function handleUpload(file: File) {
    uploading = true;
    try {
      const result = await uploadFile(file, userId);
      segments = result.segments;
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      uploading = false;
    }
  }
</script>

{#if uploading}
  <div class="spinner">Processing...</div>
{:else if segments.length > 0}
  <SegmentPreview {segments} />
{/if}
```

### Error Handling

```svelte
<script lang="ts">
  let error = $state<string | null>(null);

  async function handleImport() {
    error = null;
    try {
      await confirmImport(segments, itineraryId, userId);
      toast.success('Import successful');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Import failed';
      toast.error(error);
    }
  }
</script>

{#if error}
  <div class="error-banner">{error}</div>
{/if}
```

### Validation

```svelte
<script lang="ts">
  let selectedTripId = $state<string | null>(null);
  let createNew = $state(false);
  let newTripName = $state('');

  let canProceed = $derived(
    selectedTripId || (createNew && newTripName.trim())
  );
</script>

<button disabled={!canProceed} onclick={handleConfirm}>
  Confirm Import
</button>
```

## Troubleshooting

### Dialog Not Opening
```svelte
<!-- ✗ Wrong - missing bind -->
<ImportDialog open={showImport} />

<!-- ✓ Correct - use bind: -->
<ImportDialog bind:open={showImport} />
```

### Segments Not Showing
```svelte
<!-- Check data structure -->
console.log('Segments:', segments);
console.log('Has confidence?', segments[0]?.confidence);

<!-- Ensure segments match ExtractedSegment type -->
```

### Trip Match Not Selecting
```svelte
<!-- ✗ Wrong - not updating state -->
<TripMatchCard {match} selected={false} onSelect={() => {}} />

<!-- ✓ Correct - state management -->
<script>
  let selectedId = $state<string | null>(null);
</script>
<TripMatchCard
  {match}
  selected={selectedId === match.itineraryId}
  onSelect={() => selectedId = match.itineraryId}
/>
```

### API Errors
```typescript
// Check response status
const response = await fetch('/api/v1/import/upload', { /* ... */ });
if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error);
}

// Common issues:
// - OPENROUTER_API_KEY not set
// - userId missing from query params
// - File too large
// - Invalid file format
```

## Best Practices

### 1. Always Use bind: for open State
```svelte
<!-- Allows dialog to close itself -->
<ImportDialog bind:open={showImport} />
```

### 2. Provide onComplete Callback
```svelte
<!-- Get notified when import succeeds -->
<ImportDialog
  bind:open={showImport}
  onComplete={(id, name) => {
    console.log('Success:', id, name);
    // Refresh itinerary list, navigate, etc.
  }}
/>
```

### 3. Pre-select When Possible
```svelte
<!-- Better UX when importing to specific trip -->
<ImportDialog
  bind:open={showImport}
  preselectedItineraryId={currentTripId}
/>
```

### 4. Handle Errors Gracefully
```svelte
<script>
  async function handleUpload() {
    try {
      await uploadFile(file, userId);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
      // Don't close dialog - let user retry
    }
  }
</script>
```

### 5. Show Loading States
```svelte
<button disabled={uploading} onclick={handleUpload}>
  {uploading ? 'Uploading...' : 'Upload'}
</button>
```

## Performance Tips

### 1. Lazy Load Dialog
```svelte
{#if showImport}
  <ImportDialog bind:open={showImport} />
{/if}
```

### 2. Debounce File Validation
```svelte
<script>
  import { debounce } from '$lib/utils';

  const validateFile = debounce((file: File) => {
    // Validate file type, size, etc.
  }, 300);
</script>
```

### 3. Limit Trip Matches
```svelte
<!-- Show top 5 matches only -->
{#each tripMatches.slice(0, 5) as match}
  <TripMatchCard {match} />
{/each}
```

---

**Quick Reference Version**: 1.0
**Last Updated**: 2025-12-29
**For**: Svelte 5 + Runes

# Split Pane Layout - Quick Reference

## What Changed

### Before
Two separate pages:
- `/itineraries` - Grid view of all itineraries
- `/itineraries/[id]` - Full-screen detail with "Back" button

### After
Single split-pane layout:
- `/itineraries` - List (left) + Welcome (right)
- `/itineraries/[id]` - List (left) + Detail (right)

## File Structure

```
viewer-svelte/src/routes/itineraries/
├── +layout.svelte       ← NEW: Provides split pane
├── +page.svelte         ← UPDATED: Welcome state
└── [id]/
    └── +page.svelte     ← UPDATED: Detail only (no header)
```

## Key Files

### `+layout.svelte` (NEW)
- Renders list on left (320px)
- Slot for child routes on right
- Handles: loading, selection, deletion
- Always visible

### `+page.svelte` (UPDATED)
- Simple welcome message
- "Select an itinerary" prompt
- Only renders when no ID in URL

### `[id]/+page.svelte` (UPDATED)
- No Header component (in layout now)
- No "Back" button (list always visible)
- Full detail view with chat panel

## URL Routing

| URL | Left Pane | Right Pane |
|-----|-----------|------------|
| `/itineraries` | List | Welcome |
| `/itineraries/abc-123` | List (abc-123 selected) | Detail view |

## Selection Logic

```typescript
// In layout: Track selected ID from URL
let selectedId = $derived($page.params.id);

// In list item: Highlight if selected
<ItineraryListItem
  selected={itinerary.id === selectedId}
/>

// Navigate to detail
goto(`/itineraries/${id}`);
```

## Responsive Breakpoints

```css
/* Desktop: Side by side */
@media (min-width: 769px) {
  .main-content {
    flex-direction: row;
  }
  .list-pane { width: 320px; }
  .detail-pane { flex: 1; }
}

/* Mobile: Stacked */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  .list-pane {
    width: 100%;
    max-height: 40vh;
  }
  .detail-pane { flex: 1; }
}
```

## Common Tasks

### Add a new action to the list
Edit `+layout.svelte`, add button in `.list-header`

### Customize the welcome message
Edit `/itineraries/+page.svelte`

### Modify detail view
Edit `[id]/+page.svelte`

### Change list width
Update `.itinerary-list-pane { width: 320px; }` in `+layout.svelte`

## State Management

### Stores Used
- `itineraries.svelte.ts` - List data
- `selectedItinerary` - Current itinerary
- `navigationStore` - Tabs, edit mode
- `modal` - Confirmations
- `toast` - Notifications

### URL as State
```typescript
// Selected ID comes from URL
$page.params.id

// Navigate = Select
goto('/itineraries/[id]')
```

## Debugging Tips

### List not showing?
Check `loadItineraries()` is called in `onMount()`

### Selection not highlighting?
Verify `selectedId === itinerary.id` logic

### Detail not loading?
Check `selectItinerary(id)` in `$effect()` hook

### Layout broken?
Inspect `.main-content` flex container

## Migration Checklist

When updating from old layout:
- [x] Remove duplicate Header from detail page
- [x] Remove "Back to List" button
- [x] Ensure list always renders
- [x] Update navigation to use goto()
- [x] Test mobile responsiveness
- [x] Verify delete returns to `/itineraries`

## Performance Notes

- List loads once on mount
- Detail loads on selection change
- No re-fetching on route changes
- Efficient O(1) selection via URL

## Common Pitfalls

❌ Don't put Header in detail page (it's in layout)
❌ Don't clear selection state manually (URL is source of truth)
❌ Don't forget mobile styles
❌ Don't use `<slot />` in Svelte 5 (use `{@render children?.()}`)

✅ Do use `goto()` for navigation
✅ Do derive selection from `$page.params.id`
✅ Do test on mobile breakpoint
✅ Do use `{@render children?.()}` with `children` prop

## Example: Adding a Filter

```svelte
<!-- In +layout.svelte -->
<script>
  let searchQuery = $state('');
  let filteredItineraries = $derived(
    $itineraries.filter(i =>
      i.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="list-header">
  <h1>My Itineraries</h1>
  <input
    type="search"
    bind:value={searchQuery}
    placeholder="Search..."
  />
</div>

<div class="list-content">
  {#each filteredItineraries as itinerary}
    <ItineraryListItem ... />
  {/each}
</div>
```

## Related Documentation

- [SvelteKit Layouts](https://kit.svelte.dev/docs/routing#layout)
- [Svelte 5 Runes](https://svelte-5-preview.vercel.app/docs/runes)
- [SPLIT_PANE_VISUAL.md](./SPLIT_PANE_VISUAL.md) - Detailed diagrams
- [SPLIT_PANE_IMPLEMENTATION.md](./SPLIT_PANE_IMPLEMENTATION.md) - Full spec

---

**Version**: 1.0
**Last Updated**: December 31, 2024

# Itinerary Routing - Quick Reference

## 🎯 Quick Summary

**What changed:** Split itineraries into two routes: list and detail
**Why:** Enable deep linking, browser refresh support, and proper back button behavior
**Impact:** Better UX, shareable URLs, proper browser history

## 📁 File Structure

```
src/routes/
├── itineraries/
│   ├── +page.svelte              # LIST VIEW (always shows grid)
│   └── [id]/
│       ├── +page.svelte          # DETAIL VIEW (specific itinerary)
│       └── +page.server.ts       # SSR auth check
```

## 🔗 URL Patterns

| URL | View | Description |
|-----|------|-------------|
| `/itineraries` | List | Grid of all itineraries |
| `/itineraries/abc123` | Detail | Specific itinerary with chat/tabs |

## 🚀 Navigation Examples

### From Code
```typescript
// Navigate to list
import { goto } from '$app/navigation';
goto('/itineraries');

// Navigate to detail
goto(`/itineraries/${itineraryId}`);

// Navigate back
goto(-1);  // Or use browser back
```

### From UI
```svelte
<!-- Link to list -->
<a href="/itineraries">View All</a>

<!-- Link to detail -->
<a href="/itineraries/{itinerary.id}">View Details</a>

<!-- Button navigation -->
<button onclick={() => goto('/itineraries')}>
  Back to List
</button>
```

## 🎨 Component Usage

### List View Components
```svelte
<script>
  import { goto } from '$app/navigation';
  import { itineraries, loadItineraries } from '$lib/stores/itineraries.svelte';

  function handleSelect(id: string) {
    goto(`/itineraries/${id}`);  // ← Navigate instead of selecting state
  }
</script>

{#each $itineraries as itinerary}
  <ItineraryCard onclick={() => handleSelect(itinerary.id)} />
{/each}
```

### Detail View Components
```svelte
<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { selectItinerary } from '$lib/stores/itineraries.svelte';

  let itineraryId = $derived($page.params.id);

  $effect(() => {
    if (itineraryId) {
      selectItinerary(itineraryId);  // Load data
    }
  });

  function handleBack() {
    goto('/itineraries');
  }
</script>

<button onclick={handleBack}>← Back to List</button>
<ItineraryDetail itinerary={$selectedItinerary} />
```

## 📊 State Management

### Before (State-based)
```typescript
// Selecting changed component state
selectItinerary(id);  // Store mutation

// URL didn't change
// /itineraries (always)
```

### After (Route-based)
```typescript
// Navigate changes URL
goto(`/itineraries/${id}`);

// URL reflects state
// /itineraries → /itineraries/abc123

// Route component loads itinerary
$effect(() => {
  selectItinerary($page.params.id);
});
```

## ✅ Testing Checklist

Copy-paste this checklist when testing:

```markdown
## List View (/itineraries)
- [ ] Shows grid of itinerary cards
- [ ] Clicking card navigates to detail view
- [ ] "Create New" button works
- [ ] Delete button removes from list
- [ ] Empty state shows when no itineraries
- [ ] Loading state shows while fetching

## Detail View (/itineraries/[id])
- [ ] Loads correct itinerary from URL
- [ ] Shows chat panel in AI mode
- [ ] Hides chat panel in manual mode
- [ ] All tabs work (Detail/Calendar/Map/Travelers)
- [ ] Edit mode toggle works
- [ ] Delete button works and navigates to list
- [ ] "Back to List" button works

## Browser Behavior
- [ ] Refresh on list view stays on list
- [ ] Refresh on detail view reloads same itinerary
- [ ] Back button from detail returns to list
- [ ] Forward button works
- [ ] Direct URL access works (/itineraries/abc123)
- [ ] Invalid ID shows "Not found" state

## Edge Cases
- [ ] Non-existent itinerary shows error + back button
- [ ] Unauthenticated user redirects to login
- [ ] Network error shows retry option
- [ ] Delete last itinerary redirects to home
```

## 🐛 Common Issues & Solutions

### Issue: "Page refreshes and loses selection"
**Solution:** You're probably on the old `/itineraries` page. Navigate to `/itineraries/{id}` instead.

### Issue: "Back button doesn't work"
**Solution:** Make sure you're using `goto()` for navigation, not direct state mutations.

### Issue: "Detail view shows wrong itinerary"
**Solution:** Check that `$page.params.id` is being read correctly in `$effect`.

### Issue: "Chat panel always shows"
**Solution:** Check that `showChatSidebar` is derived from `editMode`:
```typescript
let showChatSidebar = $derived(navigationStore.editMode === 'ai');
```

## 🔧 Debugging Tips

### Check Current Route
```svelte
<script>
  import { page } from '$app/stores';
  console.log('Current path:', $page.url.pathname);
  console.log('Params:', $page.params);
</script>
```

### Monitor Navigation
```typescript
import { goto } from '$app/navigation';

async function navigateWithLog(path: string) {
  console.log('Navigating to:', path);
  await goto(path);
  console.log('Navigation complete');
}
```

### Verify Store State
```svelte
<script>
  import { selectedItinerary } from '$lib/stores/itineraries.svelte';

  $effect(() => {
    console.log('Selected itinerary changed:', $selectedItinerary?.id);
  });
</script>
```

## 📚 Related Documentation

- **Implementation Details:** `ITINERARY_ROUTING_IMPLEMENTATION.md`
- **Architecture Diagrams:** `ROUTING_DIAGRAM.md`
- **SvelteKit Routing:** https://kit.svelte.dev/docs/routing
- **Advanced Routing:** https://kit.svelte.dev/docs/advanced-routing

## 💡 Tips & Best Practices

### ✅ DO
- Use `goto()` for programmatic navigation
- Use `<a href>` for link-based navigation
- Read params from `$page.params`
- Handle loading/error states
- Provide "Back" buttons in detail views

### ❌ DON'T
- Don't mutate selected state without URL change
- Don't mix state-based and route-based navigation
- Don't forget SSR considerations
- Don't skip error handling for invalid IDs
- Don't use `window.location` (breaks SSR)

## 🎯 Migration Path

If you have existing code that needs updating:

### 1. Find state-based selection
```typescript
// OLD
selectItinerary(id);
```

### 2. Replace with navigation
```typescript
// NEW
goto(`/itineraries/${id}`);
```

### 3. Update component mounting
```typescript
// OLD
onMount(() => {
  selectItinerary(initialId);
});

// NEW
$effect(() => {
  if ($page.params.id) {
    selectItinerary($page.params.id);
  }
});
```

### 4. Update links
```svelte
<!-- OLD -->
<button onclick={() => selectItinerary(id)}>View</button>

<!-- NEW -->
<a href="/itineraries/{id}">View</a>
<!-- OR -->
<button onclick={() => goto(`/itineraries/${id}`)}>View</button>
```

---

**Last Updated:** December 31, 2024
**Version:** 1.0
**Status:** ✅ Production Ready

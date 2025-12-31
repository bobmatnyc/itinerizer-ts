# Edit Mode Toggle - Quick Reference

## What Changed

**Before**: Two separate buttons ("Edit Manually", "Edit With AI Trip Designer")
**After**: Single toggle switch with two modes

## Toggle Component

### Location
- **File**: `viewer-svelte/src/lib/components/EditModeToggle.svelte`
- **Placement**: MainPane header actions area (top-right of itinerary detail)

### Props
```typescript
interface Props {
  mode: EditMode;           // Current mode ('ai' | 'manual')
  onChange: (mode: EditMode) => void;  // Callback when changed
}
```

### Usage
```svelte
<EditModeToggle
  bind:mode={navigationStore.editMode}
  onChange={handleEditModeChange}
/>
```

## State Management

### Navigation Store
```typescript
// Location: viewer-svelte/src/lib/stores/navigation.svelte.ts

export type EditMode = 'ai' | 'manual';

class NavigationStore {
  editMode = $state<EditMode>('ai');  // Default: AI mode

  setEditMode(mode: EditMode): void {
    this.editMode = mode;
  }
}
```

### Access in Components
```svelte
<script>
  import { navigationStore } from '$lib/stores/navigation.svelte';

  // Reactive derivation
  let inManualMode = $derived(navigationStore.editMode === 'manual');
</script>
```

## Layout Changes

### AI Mode (Default)
```
┌─────────┬──────────────────┐
│ Chat    │ Itinerary Detail │
│ Sidebar │ (read-only)      │
└─────────┴──────────────────┘
```

**Features**:
- Chat sidebar visible (350px, resizable)
- Itinerary read-only
- User interacts via chat

### Manual Mode
```
┌─────────────────────────────┐
│ Itinerary Detail (editable) │
│ Full width, no chat sidebar │
└─────────────────────────────┘
```

**Features**:
- Chat sidebar hidden
- Full-width itinerary
- Direct inline editing

## Code Snippets

### Toggle Visibility Logic
```svelte
<!-- +page.svelte -->
<script>
  // Hide chat sidebar in manual mode
  let showChatSidebar = $derived(
    navigationStore.mainView !== 'itinerary-detail' ||
    navigationStore.editMode === 'ai'
  );
</script>

{#if showChatSidebar}
  <div class="left-pane">
    <!-- Chat sidebar content -->
  </div>
  <div class="resize-handle"></div>
{/if}
```

### Conditional Editing UI
```svelte
<!-- ItineraryDetail.svelte -->
<script>
  let inManualEditMode = $derived(editMode === 'manual');
</script>

{#if inManualEditMode && !isEditingMetadata}
  <button onclick={startEditingMetadata}>
    ✏️ Edit Details
  </button>
{/if}

{#if inManualEditMode}
  <button onclick={() => showAddSegmentModal = true}>
    ➕ Add Segment
  </button>
{/if}
```

### Metadata Editing
```svelte
{#if isEditingMetadata}
  <div class="metadata-editor">
    <input bind:value={editedTitle} />
    <textarea bind:value={editedDescription}></textarea>
    <input type="date" bind:value={editedStartDate} />
    <input type="date" bind:value={editedEndDate} />

    <button onclick={cancelEditingMetadata}>Cancel</button>
    <button onclick={saveMetadata}>Save Changes</button>
  </div>
{/if}
```

### Segment Editing
```svelte
<SegmentCard
  {segment}
  editMode={inManualEditMode}
  onEdit={inManualEditMode ? () => handleEditSegment(segment.id) : undefined}
  onDelete={inManualEditMode ? () => handleDeleteSegment(segment.id) : undefined}
/>
```

## API Integration

### Update Itinerary Metadata
```typescript
import { updateItinerary } from '$lib/stores/itineraries.svelte';

async function saveMetadata() {
  await updateItinerary(itinerary.id, {
    title: editedTitle,
    description: editedDescription || undefined,
    startDate: editedStartDate || undefined,
    endDate: editedEndDate || undefined,
  });
  toast.success('Itinerary updated');
}
```

### Update Segment
```typescript
import { updateSegment } from '$lib/stores/itineraries.svelte';

async function handleSaveSegment(segmentData: Partial<Segment>) {
  await updateSegment(itinerary.id, segmentData.id!, segmentData);
  toast.success('Segment saved');
}
```

## Testing Scenarios

### Basic Functionality
1. ✅ Click toggle → switches mode
2. ✅ AI mode → chat sidebar visible
3. ✅ Manual mode → chat sidebar hidden
4. ✅ Layout adjusts responsively

### Manual Mode Editing
1. ✅ "Edit Details" button appears
2. ✅ Click → metadata editor opens
3. ✅ Edit fields → Save → API call → success toast
4. ✅ Cancel → closes editor without saving

### Segment Editing
1. ✅ Edit/Delete buttons appear on segments
2. ✅ Click Edit → segment becomes form
3. ✅ Save → validates → updates segment
4. ✅ Delete → confirmation → removes segment
5. ✅ Add Segment button → modal → creates segment

### Edge Cases
1. ✅ Switch modes mid-edit (no warning - Phase 2)
2. ✅ Validation errors → shown in UI
3. ✅ API errors → toast notification
4. ✅ Empty itinerary → Add Segment works

## CSS Classes Reference

### Toggle Component
```css
.edit-mode-toggle        /* Container */
.toggle-option           /* Button (inactive) */
.toggle-option.active    /* Button (active) */
```

### Metadata Editor
```css
.metadata-header         /* Header with Edit button */
.metadata-editor         /* Form container */
.form-group              /* Input wrapper */
.form-row                /* Two-column row */
.metadata-actions        /* Save/Cancel buttons */
```

## Common Patterns

### Initialize Edit State
```typescript
let isEditingMetadata = $state(false);
let editedTitle = $state(itinerary.title);
let editedDescription = $state(itinerary.description || '');
```

### Start Editing
```typescript
function startEditingMetadata() {
  isEditingMetadata = true;
  // Reinitialize with current values
  editedTitle = itinerary.title;
  editedDescription = itinerary.description || '';
}
```

### Save with Validation
```typescript
async function saveMetadata() {
  try {
    await updateItinerary(itinerary.id, { ... });
    isEditingMetadata = false;
    toast.success('Changes saved');
  } catch (error) {
    console.error('Save failed:', error);
    toast.error('Failed to save changes');
  }
}
```

### Cancel Editing
```typescript
function cancelEditingMetadata() {
  isEditingMetadata = false;
  // No need to reset values - they'll reinit on next edit
}
```

## Keyboard Shortcuts (Future)

Currently not implemented. Phase 2 enhancements:

- `Ctrl+E` - Toggle edit mode
- `Ctrl+S` - Save changes (when editing)
- `Esc` - Cancel editing
- `Ctrl+K` - Add segment

## Debugging Tips

### Check Current Mode
```javascript
console.log('Edit mode:', navigationStore.editMode);
console.log('Show sidebar:', showChatSidebar);
```

### Verify State Updates
```javascript
$effect(() => {
  console.log('Edit mode changed to:', navigationStore.editMode);
});
```

### Check Form Values
```javascript
console.log('Edited values:', {
  title: editedTitle,
  description: editedDescription,
  startDate: editedStartDate,
  endDate: editedEndDate,
});
```

## Related Files

### Core Implementation
- `viewer-svelte/src/lib/components/EditModeToggle.svelte`
- `viewer-svelte/src/lib/stores/navigation.svelte.ts`
- `viewer-svelte/src/routes/itineraries/+page.svelte`
- `viewer-svelte/src/lib/components/ItineraryDetail.svelte`

### Supporting Components
- `viewer-svelte/src/lib/components/SegmentCard.svelte` (displays segments)
- `viewer-svelte/src/lib/components/SegmentEditor.svelte` (edits segments)
- `viewer-svelte/src/lib/components/AddSegmentModal.svelte` (adds segments)

### Stores & API
- `viewer-svelte/src/lib/stores/itineraries.svelte.ts` (data operations)
- `viewer-svelte/src/lib/api.ts` (API client)
- `viewer-svelte/src/routes/api/v1/itineraries/[id]/+server.ts` (API endpoint)

## Performance Notes

- Toggle switch is pure CSS (no JS animations)
- Sidebar hide/show uses conditional rendering (no transitions yet)
- Form fields use Svelte's `bind:` for two-way data binding
- No debouncing on input (immediate updates to local state)
- API calls only on explicit Save action

## Accessibility

- ✅ ARIA labels on toggle buttons
- ✅ Keyboard navigation (Tab/Enter)
- ✅ Focus states on all interactive elements
- ✅ Semantic HTML (button, input, label)
- 🔄 Screen reader announcements (to be added)

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

---

**Last Updated**: 2025-12-28
**Version**: 1.0.0 (Phase 1 - MVP)

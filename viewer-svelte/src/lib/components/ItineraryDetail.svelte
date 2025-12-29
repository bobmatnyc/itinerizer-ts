<script lang="ts">
  import type { Itinerary, Segment } from '$lib/types';
  import SegmentCard from './SegmentCard.svelte';
  import SegmentEditor from './SegmentEditor.svelte';
  import AddSegmentModal from './AddSegmentModal.svelte';
  import { updateSegment, deleteSegment, addSegment } from '$lib/stores/itineraries.svelte';
  import { toast } from '$lib/stores/toast.svelte';

  let {
    itinerary,
    onEditManually,
    onEditWithPrompt,
    onDelete
  }: {
    itinerary: Itinerary;
    onEditManually?: (itinerary: Itinerary) => void;
    onEditWithPrompt?: (itinerary: Itinerary) => void;
    onDelete?: (itinerary: Itinerary) => void;
  } = $props();

  let showDeleteConfirm = $state(false);
  let editMode = $state(false);
  let editingSegmentId = $state<string | null>(null);
  let showAddSegmentModal = $state(false);

  function handleEditManually() {
    if (onEditManually) {
      onEditManually(itinerary);
    } else {
      // Default behavior: enter edit mode
      editMode = true;
    }
  }

  function handleEditWithPrompt() {
    onEditWithPrompt?.(itinerary);
  }

  function handleExitEditMode() {
    editMode = false;
    editingSegmentId = null;
  }

  function handleEditSegment(segmentId: string) {
    editingSegmentId = segmentId;
  }

  async function handleSaveSegment(segmentData: Partial<Segment>) {
    try {
      await updateSegment(itinerary.id, segmentData.id!, segmentData);
      editingSegmentId = null;
      toast.success('Segment saved');
    } catch (error) {
      console.error('Failed to save segment:', error);
      toast.error('Failed to save segment. Please try again.');
    }
  }

  function handleCancelEdit() {
    editingSegmentId = null;
  }

  async function handleDeleteSegment(segmentId: string) {
    try {
      await deleteSegment(itinerary.id, segmentId);
      toast.success('Segment deleted');
    } catch (error) {
      console.error('Failed to delete segment:', error);
      toast.error('Failed to delete segment. Please try again.');
    }
  }

  async function handleAddSegment(segmentData: Partial<Segment>) {
    await addSegment(itinerary.id, segmentData);
  }

  function handleDeleteClick() {
    showDeleteConfirm = true;
  }

  function handleConfirmDelete() {
    onDelete?.(itinerary);
    showDeleteConfirm = false;
  }

  function handleCancelDelete() {
    showDeleteConfirm = false;
  }

  // Format date range
  function formatDateRange(): string {
    if (!itinerary.startDate) return '';
    const start = new Date(itinerary.startDate);
    const end = itinerary.endDate ? new Date(itinerary.endDate) : null;

    if (end) {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    return start.toLocaleDateString();
  }

  // Get destinations string
  function getDestinationsString(): string {
    if (!itinerary.destinations || itinerary.destinations.length === 0) {
      return '';
    }
    return itinerary.destinations.map((d) => d.city || d.name).join(', ');
  }

  // Check if trip dates are in the past
  let hasPastDates = $derived.by(() => {
    if (!itinerary.endDate) return false;
    const endDate = new Date(itinerary.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  });

  // Extract destination from title (e.g., "Croatia Business Trip" → "Croatia")
  function inferDestinationFromTitle(title: string | undefined): string | null {
    if (!title || title === 'New Itinerary') return null;

    const patterns = [
      /^(.+?)\s+(business\s+)?trip$/i,           // "Croatia Business Trip" → "Croatia"
      /^(.+?)\s+vacation$/i,                      // "Hawaii Vacation" → "Hawaii"
      /^(.+?)\s+adventure$/i,                     // "Japan Adventure" → "Japan"
      /^trip\s+to\s+(.+)$/i,                      // "Trip to Paris" → "Paris"
      /^visit(?:ing)?\s+(.+)$/i,                  // "Visiting London" → "London"
      /^(.+?)\s+getaway$/i,                       // "Paris Getaway" → "Paris"
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const dest = match[1].trim();
        if (!['new', 'my', 'our', 'the', 'a', 'an', 'weekend'].includes(dest.toLowerCase())) {
          return dest;
        }
      }
    }
    return null;
  }

  // Get first destination for background - prefer explicit, then infer from title
  let destinationName = $derived(
    itinerary?.destinations?.[0]?.name ||
    itinerary?.destinations?.[0]?.city ||
    inferDestinationFromTitle(itinerary?.title)
  );

  let backgroundUrl = $derived(
    destinationName
      ? `https://source.unsplash.com/1600x900/?${encodeURIComponent(destinationName)},travel,city`
      : null
  );

  // Group segments by date
  interface SegmentsByDay {
    date: string;
    dateDisplay: string;
    segments: Segment[];
  }

  let segmentsByDay = $derived.by(() => {
    const grouped = new Map<string, Segment[]>();

    // Guard against missing segments
    if (!itinerary?.segments) {
      return [];
    }

    // Group segments by date (YYYY-MM-DD)
    itinerary.segments.forEach((segment) => {
      const date = new Date(segment.startDatetime);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(segment);
    });

    // Convert to array and sort by date
    const result: SegmentsByDay[] = Array.from(grouped.entries())
      .map(([dateKey, segments]) => {
        const date = new Date(dateKey);
        const dateDisplay = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });

        return {
          date: dateKey,
          dateDisplay,
          segments: segments.sort(
            (a, b) =>
              new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
          ),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  });
</script>

<div class="itinerary-detail" class:has-background={backgroundUrl}>
  {#if backgroundUrl}
    <div
      class="destination-background"
      style="background-image: url({backgroundUrl})"
    ></div>
    <div class="background-overlay"></div>
  {/if}

  <div class="detail-content h-full overflow-y-auto">
    <!-- Itinerary Metadata -->
    <div class="bg-minimal-card p-6">
    {#if formatDateRange()}
      <p class="text-minimal-text-muted text-sm mb-4">
        {formatDateRange()}
      </p>
    {/if}

    {#if hasPastDates}
      <div class="past-dates-warning">
        <span class="warning-icon">⚠️</span>
        <div class="warning-content">
          <p class="warning-title">Trip dates are in the past</p>
          <p class="warning-message">
            This itinerary is scheduled for {formatDateRange()}, which has already passed.
            Would you like to update the dates?
          </p>
        </div>
      </div>
    {/if}

    {#if itinerary.description}
      <p class="text-minimal-text-muted text-sm mb-4">
        {itinerary.description}
      </p>
    {/if}

    <div class="flex items-center gap-3 text-sm text-minimal-text-muted">
      {#if getDestinationsString()}
        <span>{getDestinationsString()}</span>
      {/if}

      {#if itinerary.tripType}
        <span class="minimal-badge">
          {itinerary.tripType.toLowerCase()}
        </span>
      {/if}
    </div>
  </div>

  <!-- Segments grouped by day -->
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-minimal-text-muted">
        {itinerary.segments?.length ?? 0} SEGMENT{(itinerary.segments?.length ?? 0) !== 1 ? 'S' : ''}
      </h3>
      {#if editMode}
        <div class="flex gap-2">
          <button
            class="minimal-button"
            onclick={() => showAddSegmentModal = true}
            type="button"
          >
            Add Segment
          </button>
          <button
            class="minimal-button primary"
            onclick={handleExitEditMode}
            type="button"
          >
            Done Editing
          </button>
        </div>
      {/if}
    </div>

    <div class="space-y-6">
      {#each segmentsByDay as day (day.date)}
        <div>
          <!-- Day header -->
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">📅</span>
            <h4 class="text-sm font-semibold text-minimal-text">
              {day.dateDisplay}
            </h4>
          </div>

          <!-- Segments for this day -->
          <div class="space-y-3 pl-7">
            {#each day.segments as segment (segment.id)}
              {#if editMode && editingSegmentId === segment.id}
                <!-- Editing mode -->
                <SegmentEditor
                  {segment}
                  onSave={handleSaveSegment}
                  onCancel={handleCancelEdit}
                  onDelete={() => handleDeleteSegment(segment.id)}
                />
              {:else}
                <!-- Display mode -->
                <SegmentCard
                  {segment}
                  {editMode}
                  onEdit={editMode ? () => handleEditSegment(segment.id) : undefined}
                  onDelete={editMode ? () => handleDeleteSegment(segment.id) : undefined}
                />
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="modal-overlay" onclick={handleCancelDelete}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h3 class="modal-title">Delete Itinerary</h3>
      <p class="modal-message">
        Are you sure you want to delete this itinerary? This cannot be undone.
      </p>
      <div class="modal-buttons">
        <button
          class="minimal-button"
          onclick={handleCancelDelete}
          type="button"
        >
          Cancel
        </button>
        <button
          class="minimal-button delete-button-confirm"
          onclick={handleConfirmDelete}
          type="button"
        >
          Confirm Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .itinerary-detail {
    position: relative;
    height: 100%;
  }

  /* Destination background image - subtle, at top of container */
  .destination-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    z-index: 0;
    opacity: 0.15;  /* Very subtle */
    transition: opacity 1s ease-in-out;
  }

  /* Gradient overlay for smooth transition */
  .background-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(250, 250, 250, 0.5) 50%,
      rgba(250, 250, 250, 1) 100%
    );
    z-index: 1;
  }

  /* Content appears above background */
  .detail-content {
    position: relative;
    z-index: 2;
  }

  /* Enhance text contrast when background is present */
  .has-background .bg-minimal-card {
    background-color: rgba(255, 255, 255, 0.95);
  }

  .past-dates-warning {
    display: flex;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 1px solid #f59e0b;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .warning-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .warning-content {
    flex: 1;
  }

  .warning-title {
    font-weight: 600;
    color: #92400e;
    font-size: 0.875rem;
    margin: 0 0 0.25rem 0;
  }

  .warning-message {
    color: #92400e;
    font-size: 0.8125rem;
    margin: 0;
    line-height: 1.4;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .delete-button {
    color: #dc2626;
    border-color: #fecaca;
  }

  .delete-button:hover:not(:disabled) {
    background-color: #fef2f2;
    border-color: #fca5a5;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .modal-message {
    color: #6b7280;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .modal-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .delete-button-confirm {
    background-color: #dc2626;
    color: white;
    border-color: #dc2626;
  }

  .delete-button-confirm:hover:not(:disabled) {
    background-color: #b91c1c;
    border-color: #b91c1c;
  }

  .minimal-button.primary {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .minimal-button.primary:hover:not(:disabled) {
    background-color: #2563eb;
    border-color: #2563eb;
  }
</style>

<!-- Add Segment Modal -->
<AddSegmentModal
  bind:open={showAddSegmentModal}
  itineraryId={itinerary.id}
  onSegmentAdded={handleAddSegment}
/>

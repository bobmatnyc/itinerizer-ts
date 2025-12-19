<script lang="ts">
  import type { ItineraryListItem } from '$lib/types';

  let { itinerary, onclick }: { itinerary: ItineraryListItem; onclick?: () => void } = $props();

  // Format date for display
  function formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Get date range display
  function getDateRange(): string {
    if (!itinerary.startDate) return '';
    const start = formatDate(itinerary.startDate);
    if (!itinerary.endDate || itinerary.startDate === itinerary.endDate) {
      return start;
    }
    const end = formatDate(itinerary.endDate);
    return `${start} - ${end}`;
  }

  // Get primary destination
  function getPrimaryDestination(): string {
    if (!itinerary.destinations || itinerary.destinations.length === 0) {
      return 'Unknown';
    }
    const dest = itinerary.destinations[0];
    return dest.city || dest.name || 'Unknown';
  }
</script>

<button
  class="minimal-card p-6 text-left w-full hover:cursor-pointer transition-all"
  onclick={onclick}
  type="button"
>
  <div class="space-y-3">
    <!-- Title -->
    <h3 class="text-lg font-semibold text-minimal-text">
      {itinerary.title || getPrimaryDestination()}
    </h3>

    <!-- Metadata -->
    <div class="flex flex-col gap-2 text-sm text-minimal-text-muted">
      <div class="flex items-center gap-2">
        <span class="font-medium">{itinerary.segmentCount}</span>
        <span>segment{itinerary.segmentCount !== 1 ? 's' : ''}</span>
      </div>

      {#if getDateRange()}
        <div class="text-xs">
          {getDateRange()}
        </div>
      {/if}
    </div>

    <!-- Status badge -->
    {#if itinerary.status}
      <div class="minimal-badge">
        {itinerary.status.toLowerCase()}
      </div>
    {/if}
  </div>
</button>

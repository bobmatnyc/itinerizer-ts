<script lang="ts">
  import type { ItineraryListItem } from '$lib/types';

  let {
    itinerary,
    selected = false,
    onclick
  }: {
    itinerary: ItineraryListItem;
    selected?: boolean;
    onclick?: () => void;
  } = $props();

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

  // Get primary destination or title
  function getTitle(): string {
    if (itinerary.title) return itinerary.title;
    if (!itinerary.destinations || itinerary.destinations.length === 0) {
      return 'Untitled';
    }
    const dest = itinerary.destinations[0];
    return dest.city || dest.name || 'Untitled';
  }

  // Format updated date
  function getUpdatedDate(): string {
    if (!itinerary.updatedAt) return '';
    const date = new Date(itinerary.updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Updated today';
    } else if (diffDays === 1) {
      return 'Updated yesterday';
    } else if (diffDays < 7) {
      return `Updated ${diffDays} days ago`;
    } else {
      return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  }
</script>

<button
  class="itinerary-list-item"
  class:selected
  onclick={onclick}
  type="button"
>
  <div class="item-content">
    <div class="item-info">
      <h3 class="font-semibold text-minimal-text truncate">
        {getTitle()}
      </h3>

      <div class="flex flex-col gap-1 text-xs text-minimal-text-muted">
        <div class="flex items-center gap-2">
          {#if getDateRange()}
            <span>{getDateRange()}</span>
            <span>•</span>
          {/if}
          <span>{itinerary.segmentCount} seg{itinerary.segmentCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="text-xs text-minimal-text-muted">
          {getUpdatedDate()}
        </div>
      </div>
    </div>
  </div>
</button>

<style>
  .itinerary-list-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    transition: all 0.15s ease;
    cursor: pointer;
    border: none;
    background: transparent;
  }

  .itinerary-list-item:hover {
    background-color: #f9fafb;
  }

  .itinerary-list-item.selected {
    background-color: #f1f5f9;
  }

  .itinerary-list-item.selected:hover {
    background-color: #e2e8f0;
  }

  .item-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }
</style>

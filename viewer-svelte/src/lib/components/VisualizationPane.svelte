<script lang="ts">
  import { visualizationStore } from '$lib/stores/visualization.svelte';
  import type { Visualization, MapVisualizationData, CalendarVisualizationData } from '$lib/stores/visualization.svelte';

  // Placeholder components - we'll implement these properly later
  import MapView from './MapView.svelte';
  // TODO: Create CalendarView component
  // import CalendarView from './CalendarView.svelte';

  // Get reactive state from store
  let current = $derived(visualizationStore.current);
  let isPaneVisible = $derived(visualizationStore.isPaneVisible);
  let isPaneCollapsed = $derived(visualizationStore.isPaneCollapsed);

  function handleClose() {
    visualizationStore.togglePaneVisibility();
  }

  function handleToggleCollapse() {
    visualizationStore.togglePaneCollapsed();
  }

  function getVisualizationTitle(viz: Visualization | null): string {
    if (!viz) return 'Visualization';
    return viz.label;
  }
</script>

{#if isPaneVisible}
  <div class="visualization-pane" class:collapsed={isPaneCollapsed}>
    <!-- Header -->
    <div class="visualization-header">
      <h3 class="visualization-title">{getVisualizationTitle(current)}</h3>
      <div class="visualization-actions">
        <button
          class="visualization-action-button"
          onclick={handleToggleCollapse}
          type="button"
          title={isPaneCollapsed ? 'Expand' : 'Collapse'}
        >
          {isPaneCollapsed ? '◀' : '▶'}
        </button>
        <button
          class="visualization-action-button"
          onclick={handleClose}
          type="button"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Content area -->
    {#if !isPaneCollapsed && current}
      <div class="visualization-content">
        {#if current.type === 'map'}
          {@const mapData = current.data as MapVisualizationData}
          <MapView
            markers={mapData.markers}
            polylines={mapData.polylines}
            itinerary={null}
          />
        {:else if current.type === 'calendar'}
          {@const calendarData = current.data as CalendarVisualizationData}
          <!-- TODO: Implement CalendarView -->
          <div class="visualization-placeholder">
            <div class="placeholder-icon">📅</div>
            <div class="placeholder-text">Calendar View</div>
            <div class="placeholder-subtext">Coming soon...</div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .visualization-pane {
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    border-left: 1px solid #e5e7eb;
    height: 100%;
    width: 100%;
    transition: all 0.3s ease-in-out;
  }

  .visualization-pane.collapsed {
    width: 48px;
  }

  .visualization-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
    flex-shrink: 0;
  }

  .collapsed .visualization-header {
    padding: 1rem 0.5rem;
  }

  .visualization-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collapsed .visualization-title {
    display: none;
  }

  .visualization-actions {
    display: flex;
    gap: 0.5rem;
  }

  .visualization-action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .visualization-action-button:hover {
    background-color: #f3f4f6;
    color: #1f2937;
    border-color: #d1d5db;
  }

  .collapsed .visualization-actions {
    flex-direction: column;
  }

  .visualization-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .visualization-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #6b7280;
    gap: 0.5rem;
  }

  .placeholder-icon {
    font-size: 3rem;
    opacity: 0.5;
  }

  .placeholder-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
  }

  .placeholder-subtext {
    font-size: 0.875rem;
    color: #9ca3af;
  }

  /* Smooth collapse/expand transition */
  .visualization-pane {
    transform-origin: right center;
  }

  .visualization-pane.collapsed .visualization-content {
    display: none;
  }
</style>

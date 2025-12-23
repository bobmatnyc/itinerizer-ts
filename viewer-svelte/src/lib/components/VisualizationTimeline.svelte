<script lang="ts">
  import { visualizationStore } from '$lib/stores/visualization.svelte';
  import type { Visualization } from '$lib/stores/visualization.svelte';

  // Get reactive state from store
  let history = $derived(visualizationStore.history);
  let current = $derived(visualizationStore.current);

  function handleSelect(visualization: Visualization) {
    visualizationStore.setCurrentVisualization(visualization.id);
  }

  function getIcon(type: 'map' | 'calendar'): string {
    return type === 'map' ? '🗺️' : '📅';
  }

  function formatTime(timestamp: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(timestamp);
  }

  function isActive(visualization: Visualization): boolean {
    return current?.id === visualization.id;
  }

  function truncateLabel(label: string, maxLength: number = 20): string {
    if (label.length <= maxLength) return label;
    return label.slice(0, maxLength - 3) + '...';
  }
</script>

{#if history.length > 0}
  <div class="visualization-timeline">
    <div class="timeline-container">
      {#each history as visualization}
        <button
          class="timeline-item"
          class:active={isActive(visualization)}
          onclick={() => handleSelect(visualization)}
          type="button"
          title={`${visualization.label} - ${formatTime(visualization.timestamp)}`}
        >
          <div class="timeline-icon">
            {getIcon(visualization.type)}
          </div>
          <div class="timeline-content">
            <div class="timeline-label">
              {truncateLabel(visualization.label)}
            </div>
            <div class="timeline-time">
              {formatTime(visualization.timestamp)}
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .visualization-timeline {
    border-top: 1px solid #e5e7eb;
    background-color: #f9fafb;
    overflow-x: auto;
    overflow-y: hidden;
    flex-shrink: 0;
  }

  .timeline-container {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    min-width: min-content;
  }

  .timeline-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    min-width: 140px;
  }

  .timeline-item:hover {
    border-color: #3b82f6;
    background-color: #eff6ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .timeline-item.active {
    border-color: #3b82f6;
    background-color: #eff6ff;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .timeline-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
    line-height: 1;
  }

  .timeline-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .timeline-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline-item.active .timeline-label {
    color: #3b82f6;
    font-weight: 600;
  }

  .timeline-time {
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
  }

  .timeline-item.active .timeline-time {
    color: #2563eb;
  }

  /* Custom scrollbar styling */
  .visualization-timeline::-webkit-scrollbar {
    height: 6px;
  }

  .visualization-timeline::-webkit-scrollbar-track {
    background-color: #f3f4f6;
  }

  .visualization-timeline::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 3px;
  }

  .visualization-timeline::-webkit-scrollbar-thumb:hover {
    background-color: #9ca3af;
  }
</style>

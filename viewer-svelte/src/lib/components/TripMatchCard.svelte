<script lang="ts">
  import type { TripMatch } from '$lib/types';

  let {
    match,
    selected = false,
    onSelect
  }: {
    match: TripMatch;
    selected: boolean;
    onSelect: () => void;
  } = $props();

  function formatDateRange(start: string, end: string): string {
    if (start === 'Not set' || end === 'Not set') {
      return 'Dates not set';
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  function getScoreColor(score: number): string {
    if (score >= 0.7) return '#10b981'; // green
    if (score >= 0.4) return '#f59e0b'; // amber
    return '#6b7280'; // gray
  }

  let scorePercentage = $derived(Math.round(match.matchScore * 100));
  let scoreColor = $derived(getScoreColor(match.matchScore));
</script>

<button
  class="trip-match-card"
  class:selected
  onclick={onSelect}
  type="button"
>
  <div class="card-header">
    <div class="radio-wrapper">
      <input
        type="radio"
        name="trip-match"
        checked={selected}
        onchange={onSelect}
        class="radio-input"
      />
    </div>
    <div class="trip-info">
      <h4 class="trip-name">{match.itineraryName}</h4>
      <p class="trip-destination">{match.destination}</p>
      <p class="trip-dates">{formatDateRange(match.dateRange.start, match.dateRange.end)}</p>
    </div>
  </div>

  {#if match.matchScore > 0}
    <div class="match-score">
      <div class="score-bar-container">
        <div
          class="score-bar"
          style="width: {scorePercentage}%; background-color: {scoreColor};"
        ></div>
      </div>
      <span class="score-text">{scorePercentage}% match</span>
    </div>

    {#if match.matchReasons.length > 0}
      <div class="match-reasons">
        {#each match.matchReasons as reason}
          <span class="reason-tag">{reason}</span>
        {/each}
      </div>
    {/if}
  {/if}
</button>

<style>
  .trip-match-card {
    width: 100%;
    text-align: left;
    padding: 1rem;
    background-color: white;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .trip-match-card:hover {
    border-color: #3b82f6;
    background-color: #f9fafb;
  }

  .trip-match-card.selected {
    border-color: #3b82f6;
    background-color: #eff6ff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .card-header {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .radio-wrapper {
    padding-top: 0.125rem;
    flex-shrink: 0;
  }

  .radio-input {
    width: 1.125rem;
    height: 1.125rem;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .trip-info {
    flex: 1;
    min-width: 0;
  }

  .trip-name {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .trip-destination {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0 0 0.25rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .trip-dates {
    font-size: 0.75rem;
    color: #9ca3af;
    margin: 0;
  }

  .match-score {
    margin-bottom: 0.75rem;
  }

  .score-bar-container {
    height: 6px;
    background-color: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .score-bar {
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 3px;
  }

  .score-text {
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
  }

  .match-reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .reason-tag {
    padding: 0.25rem 0.625rem;
    background-color: #f3f4f6;
    color: #374151;
    font-size: 0.6875rem;
    font-weight: 500;
    border-radius: 0.25rem;
    white-space: nowrap;
  }

  .selected .reason-tag {
    background-color: #dbeafe;
    color: #1e40af;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .trip-match-card {
      padding: 0.875rem;
    }

    .trip-name {
      font-size: 0.9375rem;
    }

    .trip-destination {
      font-size: 0.8125rem;
    }

    .reason-tag {
      font-size: 0.625rem;
      padding: 0.1875rem 0.5rem;
    }
  }
</style>

<script lang="ts">
  type Tab = 'itinerary' | 'calendar' | 'map';

  let { activeTab = $bindable('itinerary' as Tab) }: { activeTab: Tab } = $props();
</script>

<div class="tabs">
  <button
    class="tab-button"
    class:active={activeTab === 'itinerary'}
    onclick={() => activeTab = 'itinerary'}
    type="button"
  >
    Itinerary
  </button>
  <button
    class="tab-button"
    class:active={activeTab === 'calendar'}
    onclick={() => activeTab = 'calendar'}
    type="button"
  >
    Calendar
  </button>
  <button
    class="tab-button"
    class:active={activeTab === 'map'}
    onclick={() => activeTab = 'map'}
    type="button"
  >
    Map
  </button>
</div>

<style>
  .tabs {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background-color: #ffffff;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    background-color: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-button:hover {
    color: #1f2937;
  }

  .tab-button.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }
</style>

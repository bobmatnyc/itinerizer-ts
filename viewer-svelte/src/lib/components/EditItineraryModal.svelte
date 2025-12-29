<script lang="ts">
  import type { ItineraryListItem } from '$lib/types';
  import { updateItinerary } from '$lib/stores/itineraries.svelte';

  let {
    open = $bindable(false),
    itinerary
  }: {
    open?: boolean;
    itinerary: ItineraryListItem | null;
  } = $props();

  let title = $state('');
  let description = $state('');
  let startDate = $state('');
  let endDate = $state('');
  let saving = $state(false);
  let error = $state<string | null>(null);

  // Reset form when itinerary changes
  $effect(() => {
    if (itinerary) {
      title = itinerary.title || '';
      description = itinerary.description || '';
      startDate = itinerary.startDate ? itinerary.startDate.split('T')[0] : '';
      endDate = itinerary.endDate ? itinerary.endDate.split('T')[0] : '';
    }
  });

  function handleClose() {
    if (!saving) {
      open = false;
      error = null;
    }
  }

  async function handleSave() {
    if (!itinerary) return;

    // Validate
    if (!title.trim()) {
      error = 'Title is required';
      return;
    }

    if (!startDate || !endDate) {
      error = 'Start and end dates are required';
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      error = 'End date must be on or after start date';
      return;
    }

    saving = true;
    error = null;

    try {
      await updateItinerary(itinerary.id, {
        title: title.trim(),
        description: description.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });

      open = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update itinerary';
    } finally {
      saving = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
</script>

{#if open && itinerary}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={handleBackdropClick}>
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Edit Itinerary</h2>
        <button
          class="close-button"
          onclick={handleClose}
          disabled={saving}
          type="button"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div class="modal-body">
        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <div class="form-group">
          <label for="title">Title</label>
          <input
            id="title"
            type="text"
            bind:value={title}
            disabled={saving}
            placeholder="My Trip to..."
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            bind:value={description}
            disabled={saving}
            placeholder="Optional description..."
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              bind:value={startDate}
              disabled={saving}
            />
          </div>

          <div class="form-group">
            <label for="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              bind:value={endDate}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="minimal-button"
          onclick={handleClose}
          disabled={saving}
          type="button"
        >
          Cancel
        </button>
        <button
          class="minimal-button primary"
          onclick={handleSave}
          disabled={saving}
          type="button"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
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
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    color: #6b7280;
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }

  .close-button:hover:not(:disabled) {
    background-color: #f3f4f6;
    color: #1f2937;
  }

  .close-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  input[type='text'],
  input[type='date'],
  textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #1f2937;
    transition: all 0.2s;
  }

  input[type='text']:focus,
  input[type='date']:focus,
  textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  input:disabled,
  textarea:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
  }

  textarea {
    resize: vertical;
    min-height: 4rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
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

<script lang="ts">
  /**
   * Text Import Modal - Svelte 5 Runes
   *
   * Modal for importing travel itineraries from pasted text
   * (emails, notes, confirmations, etc.)
   */

  import { settingsStore } from '$lib/stores/settings';

  let { open = $bindable(false), onSuccess }: { open: boolean; onSuccess: (itineraryId: string) => void } = $props();

  let title = $state('');
  let text = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Reset form when modal is opened
  $effect(() => {
    if (open) {
      title = '';
      text = '';
      error = null;
      loading = false;
    }
  });

  async function handleSubmit() {
    // Validate inputs
    if (!title.trim()) {
      error = 'Title is required';
      return;
    }

    if (!text.trim()) {
      error = 'Travel text is required';
      return;
    }

    const apiKey = settingsStore.getApiKey();
    if (!apiKey) {
      error = 'API key is required. Please configure in settings.';
      return;
    }

    loading = true;
    error = null;

    try {
      const response = await fetch('/api/v1/import/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          text: text.trim(),
          apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Import failed');
      }

      if (data.success && data.itineraryId) {
        // Success - close modal and notify parent
        open = false;
        onSuccess(data.itineraryId);
      } else {
        throw new Error(data.error || 'Import failed - no itinerary ID returned');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
{#if open}
  <div class="modal-overlay" onclick={handleCancel} onkeydown={handleKeydown} role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="document">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">Import from Text</h2>
        <button class="close-button" onclick={handleCancel} type="button" aria-label="Close">
          ×
        </button>
      </div>

      <div class="modal-body">
        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div class="form-group">
            <label for="title-input" class="form-label">
              Itinerary Title <span class="required">*</span>
            </label>
            <input
              id="title-input"
              bind:value={title}
              type="text"
              class="form-input"
              placeholder="e.g., Summer Trip to Italy"
              disabled={loading}
              required
            />
          </div>

          <div class="form-group">
            <label for="text-input" class="form-label">
              Travel Text <span class="required">*</span>
            </label>
            <textarea
              id="text-input"
              bind:value={text}
              class="form-textarea"
              placeholder="Paste your travel confirmation emails, itinerary notes, or any travel-related text here..."
              disabled={loading}
              rows="12"
              required
            ></textarea>
            <p class="form-hint">
              Paste any travel text - confirmation emails, flight details, hotel bookings, activity plans, etc.
            </p>
          </div>

          {#if error}
            <div class="error-message" role="alert">
              {error}
            </div>
          {/if}

          <div class="modal-footer">
            <button type="button" class="minimal-button" onclick={handleCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" class="minimal-button primary" disabled={loading}>
              {#if loading}
                <span class="loading-spinner"></span>
                Importing...
              {:else}
                Import
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
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
    padding: 1rem;
  }

  .modal-content {
    background-color: #ffffff;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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

  .close-button:hover {
    background-color: #f3f4f6;
    color: #1f2937;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .required {
    color: #dc2626;
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #1f2937;
    background-color: #ffffff;
    transition: all 0.2s;
  }

  .form-input:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input:disabled,
  .form-textarea:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .form-textarea {
    resize: vertical;
    min-height: 200px;
    font-family: inherit;
  }

  .form-hint {
    margin-top: 0.375rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .error-message {
    padding: 0.75rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    color: #dc2626;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .modal-footer {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .minimal-button.primary {
    background-color: #3b82f6;
    color: #ffffff;
    border-color: #3b82f6;
  }

  .minimal-button.primary:hover:not(:disabled) {
    background-color: #2563eb;
    border-color: #2563eb;
  }

  .minimal-button.primary:disabled {
    background-color: #93c5fd;
    border-color: #93c5fd;
  }

  .loading-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 640px) {
    .modal-content {
      max-width: 100%;
      margin: 0;
      border-radius: 0;
      max-height: 100vh;
    }

    .modal-overlay {
      padding: 0;
    }
  }
</style>

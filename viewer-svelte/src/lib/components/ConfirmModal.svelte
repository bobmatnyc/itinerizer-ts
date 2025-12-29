<script lang="ts">
  import { modal } from '$lib/stores/modal.svelte';
  import { fade, scale } from 'svelte/transition';

  let dialog = $derived(modal.current);

  function handleConfirm() {
    modal.resolve(true);
  }

  function handleCancel() {
    modal.resolve(false);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
</script>

{#if dialog}
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleEscape}
    transition:fade={{ duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
    tabindex="-1"
  >
    <div class="modal-card" transition:scale={{ duration: 200, start: 0.95 }}>
      <h2 id="modal-title" class="modal-title">{dialog.title}</h2>
      <p id="modal-description" class="modal-message">{dialog.message}</p>

      <div class="modal-actions">
        <button
          class="modal-button modal-button-cancel"
          onclick={handleCancel}
          type="button"
        >
          {dialog.cancelText || 'Cancel'}
        </button>
        <button
          class="modal-button {dialog.destructive ? 'modal-button-destructive' : 'modal-button-confirm'}"
          onclick={handleConfirm}
          type="button"
          autofocus
        >
          {dialog.confirmText || 'Confirm'}
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
    z-index: 10000;
    padding: 1rem;
  }

  .modal-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    max-width: 28rem;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.75rem 0;
  }

  .modal-message {
    font-size: 0.9375rem;
    color: #6b7280;
    margin: 0 0 1.5rem 0;
    line-height: 1.6;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .modal-button {
    padding: 0.625rem 1.25rem;
    border-radius: 0.375rem;
    font-size: 0.9375rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .modal-button-cancel {
    background-color: #f3f4f6;
    color: #374151;
  }

  .modal-button-cancel:hover {
    background-color: #e5e7eb;
  }

  .modal-button-confirm {
    background-color: #3b82f6;
    color: white;
  }

  .modal-button-confirm:hover {
    background-color: #2563eb;
  }

  .modal-button-destructive {
    background-color: #ef4444;
    color: white;
  }

  .modal-button-destructive:hover {
    background-color: #dc2626;
  }

  .modal-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .modal-button-destructive:focus {
    outline-color: #ef4444;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .modal-card {
      padding: 1.25rem;
    }

    .modal-actions {
      flex-direction: column-reverse;
    }

    .modal-button {
      width: 100%;
    }
  }
</style>

<script lang="ts">
  import { toast } from '$lib/stores/toast.svelte';
  import { fly, fade } from 'svelte/transition';

  let toasts = $derived(toast.items);

  function handleDismiss(id: string) {
    toast.dismiss(id);
  }

  function getIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return 'ℹ';
    }
  }

  function getTypeClass(type: string): string {
    switch (type) {
      case 'success': return 'toast-success';
      case 'error': return 'toast-error';
      case 'warning': return 'toast-warning';
      case 'info': return 'toast-info';
      default: return 'toast-info';
    }
  }
</script>

<div class="toast-container">
  {#each toasts as toastItem (toastItem.id)}
    <div
      class="toast {getTypeClass(toastItem.type)}"
      transition:fly={{ x: 300, duration: 300 }}
    >
      <div class="toast-icon">{getIcon(toastItem.type)}</div>
      <div class="toast-message">{toastItem.message}</div>
      <button
        class="toast-dismiss"
        onclick={() => handleDismiss(toastItem.id)}
        aria-label="Dismiss"
        type="button"
      >
        ✕
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 5rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border-left: 4px solid;
    min-width: 300px;
    max-width: 400px;
  }

  .toast-success {
    border-left-color: #10b981;
  }

  .toast-error {
    border-left-color: #ef4444;
  }

  .toast-warning {
    border-left-color: #f59e0b;
  }

  .toast-info {
    border-left-color: #3b82f6;
  }

  .toast-icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
  }

  .toast-success .toast-icon {
    color: #10b981;
  }

  .toast-error .toast-icon {
    color: #ef4444;
  }

  .toast-warning .toast-icon {
    color: #f59e0b;
  }

  .toast-info .toast-icon {
    color: #3b82f6;
  }

  .toast-message {
    flex: 1;
    font-size: 0.875rem;
    color: #1f2937;
    line-height: 1.5;
  }

  .toast-dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 0.25rem;
    color: #9ca3af;
    cursor: pointer;
    font-size: 1.125rem;
    line-height: 1;
    transition: color 0.2s;
  }

  .toast-dismiss:hover {
    color: #4b5563;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .toast-container {
      left: 1rem;
      right: 1rem;
    }

    .toast {
      min-width: auto;
      max-width: none;
    }
  }
</style>

<script lang="ts">
  import type { QuickResponse } from '../utils/quick-responses';

  let {
    responses,
    disabled = false,
    onSelect,
  }: {
    responses: QuickResponse[];
    disabled?: boolean;
    onSelect: (text: string) => void;
  } = $props();
</script>

<div class="quick-responses">
  <div class="quick-responses-hint">Quick responses:</div>
  <div class="quick-responses-buttons">
    {#each responses as response}
      <button
        class="quick-response-button {response.category || 'neutral'}"
        onclick={() => onSelect(response.text)}
        disabled={disabled}
        type="button"
      >
        {response.text}
      </button>
    {/each}
  </div>
</div>

<style>
  .quick-responses {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .quick-responses-hint {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .quick-responses-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .quick-response-button {
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .quick-response-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .quick-response-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .quick-response-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Category-specific styling */
  .quick-response-button.affirmative {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border-color: #2563eb;
  }

  .quick-response-button.affirmative:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  }

  .quick-response-button.negative {
    background: #ffffff;
    color: #6b7280;
    border-color: #d1d5db;
  }

  .quick-response-button.negative:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .quick-response-button.clarification {
    background: #ffffff;
    color: #3b82f6;
    border-color: #bfdbfe;
  }

  .quick-response-button.clarification:hover:not(:disabled) {
    background: #eff6ff;
    border-color: #93c5fd;
  }

  .quick-response-button.action {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    border-color: #7c3aed;
  }

  .quick-response-button.action:hover:not(:disabled) {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  }

  .quick-response-button.neutral {
    background: #ffffff;
    color: #1f2937;
    border-color: #d1d5db;
  }

  .quick-response-button.neutral:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }
</style>

<script lang="ts">
  let { open = $bindable(false), children }: { open?: boolean; children: any } = $props();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      open = false;
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    onclick={handleBackdropClick}
    onkeydown={handleEscape}
    role="button"
    tabindex="-1"
  >
    <div
      class="minimal-card max-w-4xl w-[90vw] max-h-[85vh] overflow-auto m-4"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <!-- Close button -->
      <div class="sticky top-0 bg-minimal-card border-b border-minimal-border p-4 flex justify-between items-center">
        <h2 class="text-xl font-semibold text-minimal-text">Details</h2>
        <button
          class="text-minimal-text-muted hover:text-minimal-text transition-colors p-2"
          onclick={() => open = false}
          type="button"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div>
        {@render children()}
      </div>
    </div>
  </div>
{/if}

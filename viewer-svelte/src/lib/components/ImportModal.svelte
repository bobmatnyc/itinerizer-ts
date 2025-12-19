<script lang="ts">
  import { models, importing } from '$lib/stores/itineraries';

  let {
    open = $bindable(false),
    onImport
  }: {
    open: boolean;
    onImport: (file: File, model: string | undefined) => Promise<void>;
  } = $props();

  let uploadFile = $state<File | null>(null);
  let selectedModel = $state('');
  let isDragging = $state(false);

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  function closeModal() {
    open = false;
    uploadFile = null;
    selectedModel = '';
    isDragging = false;
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      uploadFile = file;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file && file.type === 'application/pdf') {
      uploadFile = file;
    }
  }

  async function handleImportClick() {
    if (!uploadFile) return;

    try {
      await onImport(uploadFile, selectedModel || undefined);
      closeModal();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Check console for details.');
    }
  }
</script>

{#if open}
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleEscape}
    role="button"
    tabindex="-1"
  >
    <div
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="import-modal-title"
      tabindex="-1"
    >
      <h2 id="import-modal-title" class="modal-title">Import PDF</h2>

      {#if !uploadFile}
        <!-- File Drop Zone -->
        <div
          class="drop-zone"
          class:dragging={isDragging}
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
        >
          <svg class="drop-zone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p class="drop-zone-text">Drop PDF file here or</p>
          <label class="file-input-label">
            <input
              type="file"
              accept=".pdf"
              onchange={handleFileSelect}
              class="file-input"
            />
            <span class="file-input-button">Browse files</span>
          </label>
        </div>
      {:else}
        <!-- File Selected -->
        <div class="file-selected">
          <div class="file-info">
            <svg class="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div class="file-details">
              <p class="file-name">{uploadFile.name}</p>
              <p class="file-size">{(uploadFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            type="button"
            class="file-remove"
            onclick={() => uploadFile = null}
            aria-label="Remove file"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Model Selector -->
        <div class="form-group">
          <label for="model-select" class="form-label">Model (optional)</label>
          <select
            id="model-select"
            bind:value={selectedModel}
            class="form-select"
          >
            <option value="">Auto-select model</option>
            {#each $models as model}
              <option value={model.name}>
                {model.name.split('/')[1]}
              </option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Actions -->
      <div class="modal-actions">
        <button
          type="button"
          class="minimal-button"
          onclick={closeModal}
          disabled={$importing}
        >
          Cancel
        </button>
        <button
          type="button"
          class="minimal-button primary"
          onclick={handleImportClick}
          disabled={!uploadFile || $importing}
        >
          {$importing ? 'Importing...' : 'Import'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    min-width: 500px;
    max-width: 90vw;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1.5rem 0;
  }

  /* Drop Zone */
  .drop-zone {
    border: 2px dashed #e5e7eb;
    border-radius: 8px;
    padding: 3rem 2rem;
    text-align: center;
    transition: all 0.2s;
    background-color: #fafafa;
    margin-bottom: 1.5rem;
  }

  .drop-zone.dragging {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  .drop-zone-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 1rem;
    color: #9ca3af;
  }

  .drop-zone-text {
    color: #6b7280;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  .file-input {
    display: none;
  }

  .file-input-label {
    display: inline-block;
  }

  .file-input-button {
    display: inline-block;
    padding: 0.5rem 1rem;
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #3b82f6;
    cursor: pointer;
    transition: all 0.2s;
  }

  .file-input-button:hover {
    background-color: #f9fafb;
    border-color: #3b82f6;
  }

  /* File Selected */
  .file-selected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .file-icon {
    width: 40px;
    height: 40px;
    color: #3b82f6;
  }

  .file-details {
    text-align: left;
  }

  .file-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .file-size {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0;
  }

  .file-remove {
    padding: 0.5rem;
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    transition: color 0.2s;
    border-radius: 0.25rem;
  }

  .file-remove:hover {
    color: #ef4444;
    background-color: #fee2e2;
  }

  /* Form Group */
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

  .form-select {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background-color: white;
    font-size: 0.875rem;
    color: #1f2937;
    transition: all 0.2s;
  }

  .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Modal Actions */
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
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

  .minimal-button.primary:disabled {
    background-color: #93c5fd;
    border-color: #93c5fd;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .modal-content {
      min-width: auto;
      padding: 1.5rem;
    }

    .drop-zone {
      padding: 2rem 1rem;
    }
  }
</style>

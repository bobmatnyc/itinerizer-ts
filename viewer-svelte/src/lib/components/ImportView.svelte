<script lang="ts">
  import { importPDF } from '$lib/stores/itineraries.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import type { ModelConfig } from '$lib/types';

  let {
    models = [],
    onSuccess
  }: {
    models?: ModelConfig[];
    onSuccess?: (itineraryId: string) => void;
  } = $props();

  type ImportMode = 'upload' | 'paste';

  let importMode = $state<ImportMode>('upload');
  let selectedFile = $state<File | null>(null);
  let pastedText = $state('');
  let selectedModel = $state<string | undefined>(undefined);
  let importing = $state(false);
  let error = $state<string | null>(null);
  let dragActive = $state(false);

  // File input reference
  let fileInput: HTMLInputElement | undefined = $state();

  function handleModeChange(mode: ImportMode) {
    importMode = mode;
    error = null;
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      selectedFile = file;
      error = null;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragActive = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragActive = false;

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        selectedFile = file;
        error = null;
      } else {
        error = 'Please select a PDF file';
      }
    }
  }

  function handleBrowseClick() {
    fileInput?.click();
  }

  async function handleUpload() {
    if (!selectedFile) {
      error = 'Please select a file';
      return;
    }

    const apiKey = settingsStore.openRouterKey;
    if (!apiKey || apiKey.trim() === '') {
      error = 'No OpenRouter API key configured. Please add your API key in Profile settings.';
      return;
    }

    importing = true;
    error = null;

    try {
      await importPDF(selectedFile, selectedModel);
      // Success - clear state
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      // Notify parent (optional)
      if (onSuccess) {
        // In real implementation, we'd get the ID from importPDF response
        onSuccess('imported-id');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Import failed. Please try again.';
    } finally {
      importing = false;
    }
  }

  async function handlePaste() {
    if (!pastedText.trim()) {
      error = 'Please paste some text';
      return;
    }

    const apiKey = settingsStore.openRouterKey;
    if (!apiKey || apiKey.trim() === '') {
      error = 'No OpenRouter API key configured. Please add your API key in Profile settings.';
      return;
    }

    importing = true;
    error = null;

    try {
      // Call text import API endpoint
      const response = await fetch('/api/v1/itineraries/import/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pastedText,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Import failed' }));
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();

      // Success - clear state
      pastedText = '';
      if (onSuccess && result.itinerary?.id) {
        onSuccess(result.itinerary.id);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Import failed. Please try again.';
    } finally {
      importing = false;
    }
  }
</script>

<div class="import-view">
  <div class="import-container">
    <!-- Header -->
    <div class="import-header">
      <h1 class="import-title">Import Itinerary</h1>
      <p class="import-subtitle">Upload a PDF or paste your itinerary text to get started</p>
    </div>

    <!-- Mode Selector -->
    <div class="mode-selector">
      <button
        class="mode-button {importMode === 'upload' ? 'active' : ''}"
        onclick={() => handleModeChange('upload')}
        type="button"
      >
        <span class="mode-icon">📄</span>
        <span class="mode-label">Upload PDF</span>
      </button>
      <button
        class="mode-button {importMode === 'paste' ? 'active' : ''}"
        onclick={() => handleModeChange('paste')}
        type="button"
      >
        <span class="mode-icon">📝</span>
        <span class="mode-label">Paste Text</span>
      </button>
    </div>

    <!-- Error Display -->
    {#if error}
      <div class="error-banner">
        <strong>Error:</strong> {error}
      </div>
    {/if}

    <!-- Upload Mode -->
    {#if importMode === 'upload'}
      <div class="upload-section">
        <!-- Drag & Drop Zone -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="drop-zone {dragActive ? 'drag-active' : ''} {selectedFile ? 'has-file' : ''}"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
          role="button"
          tabindex="0"
          onclick={handleBrowseClick}
          onkeydown={(e) => e.key === 'Enter' && handleBrowseClick()}
        >
          {#if selectedFile}
            <div class="file-info">
              <div class="file-icon">📄</div>
              <div class="file-name">{selectedFile.name}</div>
              <div class="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
            </div>
          {:else}
            <div class="drop-zone-content">
              <div class="drop-icon">☁️</div>
              <div class="drop-text">Drag & drop your PDF here</div>
              <div class="drop-hint">or click to browse</div>
            </div>
          {/if}
        </div>

        <!-- Hidden File Input -->
        <input
          type="file"
          accept="application/pdf,.pdf"
          onchange={handleFileSelect}
          bind:this={fileInput}
          class="hidden-input"
        />

        <!-- Model Selection (Optional) -->
        {#if models.length > 0}
          <div class="model-selection">
            <label for="model-select" class="model-label">AI Model (Optional):</label>
            <select
              id="model-select"
              bind:value={selectedModel}
              class="model-select"
            >
              <option value={undefined}>Auto-select best model</option>
              {#each models as model}
                <option value={model.name}>{model.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Upload Button -->
        <button
          class="import-button"
          onclick={handleUpload}
          disabled={!selectedFile || importing}
          type="button"
        >
          {importing ? 'Importing...' : 'Import PDF'}
        </button>
      </div>
    {/if}

    <!-- Paste Mode -->
    {#if importMode === 'paste'}
      <div class="paste-section">
        <!-- Text Area -->
        <textarea
          bind:value={pastedText}
          placeholder="Paste your itinerary text here..."
          class="paste-textarea"
          rows="15"
          disabled={importing}
        ></textarea>

        <!-- Model Selection (Optional) -->
        {#if models.length > 0}
          <div class="model-selection">
            <label for="model-select-paste" class="model-label">AI Model (Optional):</label>
            <select
              id="model-select-paste"
              bind:value={selectedModel}
              class="model-select"
            >
              <option value={undefined}>Auto-select best model</option>
              {#each models as model}
                <option value={model.name}>{model.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Import Button -->
        <button
          class="import-button"
          onclick={handlePaste}
          disabled={!pastedText.trim() || importing}
          type="button"
        >
          {importing ? 'Importing...' : 'Import Text'}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .import-view {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: #fafafa;
    padding: 2rem;
    overflow-y: auto;
  }

  .import-container {
    max-width: 600px;
    width: 100%;
    background: #ffffff;
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Header */
  .import-header {
    text-align: center;
  }

  .import-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .import-subtitle {
    font-size: 0.9375rem;
    color: #6b7280;
    margin: 0;
  }

  /* Mode Selector */
  .mode-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .mode-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-button:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .mode-button.active {
    border-color: #3b82f6;
    background: #eff6ff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .mode-icon {
    font-size: 2rem;
  }

  .mode-label {
    font-size: 0.9375rem;
    font-weight: 500;
    color: #1f2937;
  }

  /* Error Banner */
  .error-banner {
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fee2e2;
    border-radius: 0.5rem;
    color: #dc2626;
    font-size: 0.875rem;
  }

  /* Upload Section */
  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .drop-zone {
    border: 2px dashed #d1d5db;
    border-radius: 0.75rem;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: #f9fafb;
  }

  .drop-zone:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .drop-zone.drag-active {
    border-color: #3b82f6;
    background: #eff6ff;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .drop-zone.has-file {
    border-color: #10b981;
    background: #ecfdf5;
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .drop-icon {
    font-size: 3rem;
  }

  .drop-text {
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  .drop-hint {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .file-icon {
    font-size: 3rem;
  }

  .file-name {
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  .file-size {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .hidden-input {
    display: none;
  }

  /* Paste Section */
  .paste-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .paste-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    min-height: 200px;
  }

  .paste-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .paste-textarea:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }

  /* Model Selection */
  .model-selection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .model-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .model-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: #ffffff;
  }

  .model-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Import Button */
  .import-button {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: #ffffff;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .import-button:hover:not(:disabled) {
    background: #2563eb;
  }

  .import-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .import-view {
      padding: 1rem;
    }

    .import-container {
      padding: 1.5rem;
    }

    .mode-selector {
      grid-template-columns: 1fr;
    }
  }
</style>

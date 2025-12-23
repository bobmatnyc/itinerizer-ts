<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    itineraries,
    itinerariesLoading,
    itinerariesError,
    selectedItinerary,
    loadItineraries,
    loadModels,
    models,
    selectItinerary,
    importPDF,
    createItinerary,
    deleteItinerary,
  } from '$lib/stores/itineraries';
  import { pendingPrompt, chatMessages } from '$lib/stores/chat';
  import { visualizationStore } from '$lib/stores/visualization.svelte';
  import Header from '$lib/components/Header.svelte';
  import ImportModal from '$lib/components/ImportModal.svelte';
  import TextImportModal from '$lib/components/TextImportModal.svelte';
  import EditItineraryModal from '$lib/components/EditItineraryModal.svelte';
  import ChatPanel from '$lib/components/ChatPanel.svelte';
  import MainPane from '$lib/components/MainPane.svelte';
  import CalendarView from '$lib/components/CalendarView.svelte';
  import MapView from '$lib/components/MapView.svelte';
  import TravelersView from '$lib/components/TravelersView.svelte';
  import ItineraryListItem from '$lib/components/ItineraryListItem.svelte';
  import ItineraryDetail from '$lib/components/ItineraryDetail.svelte';
  import HelpView from '$lib/components/HelpView.svelte';
  import HomeView from '$lib/components/HomeView.svelte';
  import ImportView from '$lib/components/ImportView.svelte';
  import VisualizationPane from '$lib/components/VisualizationPane.svelte';
  import VisualizationTimeline from '$lib/components/VisualizationTimeline.svelte';
  import type { ItineraryListItem as ItineraryListItemType } from '$lib/types';

  type MainView = 'home' | 'itinerary-detail' | 'import' | 'help';
  type LeftPaneTab = 'chat' | 'itineraries';
  type DetailTab = 'itinerary' | 'calendar' | 'map' | 'travelers' | 'docs' | 'faq';

  interface AgentConfig {
    mode: 'trip-designer' | 'help';
    placeholderText: string;
    showTokenStats: boolean;
  }

  let mainView = $state<MainView>('home');
  let leftPaneTab = $state<LeftPaneTab>('chat');
  let detailTab = $state<DetailTab>('itinerary');
  let leftPaneWidth = $state(350);
  let importModalOpen = $state(false);
  let textImportModalOpen = $state(false);
  let editModalOpen = $state(false);
  let editingItinerary = $state<ItineraryListItemType | null>(null);

  // Agent configuration for ChatPanel
  let agentConfig = $state<AgentConfig>({
    mode: 'trip-designer',
    placeholderText: 'Type a message... (Shift+Enter for new line)',
    showTokenStats: true
  });

  // Resize state
  let isResizing = $state(false);
  let resizeStartX = $state(0);
  let resizeStartWidth = $state(0);

  // Visualization state from store
  let isPaneVisible = $derived(visualizationStore.isPaneVisible);
  let historyLength = $derived(visualizationStore.history.length);

  // Check URL parameters and update view state
  $effect(() => {
    const mode = $page.url.searchParams.get('mode');
    const view = $page.url.searchParams.get('view');
    const id = $page.url.searchParams.get('id');

    // Handle help mode
    if (mode === 'help') {
      mainView = 'help';
      detailTab = 'docs';
      agentConfig = {
        mode: 'help',
        placeholderText: 'Ask me anything about Itinerizer...',
        showTokenStats: false
      };
    }
    // Handle import view
    else if (view === 'import') {
      mainView = 'import';
      leftPaneTab = 'itineraries';
    }
    // Handle itinerary detail view
    else if (id && $selectedItinerary?.id === id) {
      mainView = 'itinerary-detail';
    }
    // Default to home
    else if (!id && !view && !mode) {
      mainView = 'home';
    }

    // Configure agent for trip designer
    if (mode !== 'help') {
      agentConfig = {
        mode: 'trip-designer',
        placeholderText: 'Type a message... (Shift+Enter for new line)',
        showTokenStats: true
      };
    }
  });

  onMount(() => {
    // Server handles authentication redirects
    // Load data on mount

    loadItineraries();
    loadModels();

    // Add mouse event listeners for resizing
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const delta = e.clientX - resizeStartX;
        const newWidth = Math.max(250, Math.min(600, resizeStartWidth + delta));
        leftPaneWidth = newWidth;
      }
    };

    const handleMouseUp = () => {
      isResizing = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });

  // Auto-select first itinerary when loaded
  $effect(() => {
    if ($itineraries.length > 0 && !$selectedItinerary) {
      selectItinerary($itineraries[0].id);
    }
  });

  // Auto-switch to itinerary view after first chat message response
  $effect(() => {
    // When chat messages arrive and we're on the home view, switch to itinerary view
    if (mainView === 'home' && $chatMessages.length > 0 && $selectedItinerary) {
      mainView = 'itinerary-detail';
    }
  });

  function handleImportClick() {
    importModalOpen = true;
  }

  function handleTextImportClick() {
    textImportModalOpen = true;
  }

  async function handleBuildClick() {
    try {
      // Create a new blank itinerary
      const newItinerary = await createItinerary({
        title: 'New Itinerary',
        description: '',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week default
      });

      // Select the new itinerary
      selectItinerary(newItinerary.id);

      // Switch to chat tab and itinerary detail view
      leftPaneTab = 'chat';
      mainView = 'itinerary-detail';
    } catch (error) {
      console.error('Failed to create itinerary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create new itinerary. Please try again.';
      alert(errorMessage);
    }
  }

  async function handleQuickPrompt(prompt: string) {
    // Set the pending prompt first
    pendingPrompt.set(prompt);

    // If no itinerary is selected, create one first
    if (!$selectedItinerary) {
      await handleBuildClick();
    }

    // Switch to chat view with the itinerary
    leftPaneTab = 'chat';
    mainView = 'itinerary-detail';
  }

  function handleHomeClick() {
    mainView = 'home';
  }

  function handleHelpClick() {
    mainView = 'help';
    detailTab = 'docs';
  }

  async function handleImport(file: File, model: string | undefined) {
    await importPDF(file, model);
    alert('Import successful!');
  }

  function handleTextImportSuccess(itineraryId: string) {
    // Reload itineraries
    loadItineraries();
    // Select the newly imported itinerary
    selectItinerary(itineraryId);
  }

  function handleSelect(id: string) {
    selectItinerary(id);
    mainView = 'itinerary-detail';
  }

  function handleEdit(itinerary: ItineraryListItemType) {
    editingItinerary = itinerary;
    editModalOpen = true;
  }

  function handleEditManually(itinerary: any) {
    // Select the itinerary and open edit modal
    editingItinerary = itinerary as ItineraryListItemType;
    editModalOpen = true;
  }

  function handleEditWithPrompt(itinerary: any) {
    // Select the itinerary
    selectItinerary(itinerary.id);
    // Switch to chat tab and detail view
    leftPaneTab = 'chat';
    mainView = 'itinerary-detail';
  }

  async function handleDelete(itinerary: any) {
    try {
      await deleteItinerary(itinerary.id);
    } catch (error) {
      console.error('Failed to delete itinerary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete itinerary. Please try again.';
      alert(errorMessage);
    }
  }

  function startResize(e: MouseEvent) {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartWidth = leftPaneWidth;
    e.preventDefault();
  }
</script>

<div class="app-container">
  <!-- Fixed Header -->
  <Header />

  <!-- Import Modal (PDF) -->
  <ImportModal bind:open={importModalOpen} onImport={handleImport} />

  <!-- Text Import Modal -->
  <TextImportModal bind:open={textImportModalOpen} onSuccess={handleTextImportSuccess} />

  <!-- Edit Modal -->
  <EditItineraryModal bind:open={editModalOpen} itinerary={editingItinerary} />

  <!-- Main Content Area -->
  <div class="main-content">
    <!-- Left Pane: Tabbed Navigation -->
    <div class="left-pane" style="width: {leftPaneWidth}px;">
      <!-- Tab Navigation -->
      <div class="left-pane-tabs">
        <button
          class="tab-button {leftPaneTab === 'chat' ? 'active' : ''}"
          onclick={() => leftPaneTab = 'chat'}
          type="button"
        >
          💬 Chat
        </button>
        <button
          class="tab-button {leftPaneTab === 'itineraries' ? 'active' : ''}"
          onclick={() => leftPaneTab = 'itineraries'}
          type="button"
        >
          📋 Itineraries
        </button>
      </div>

      <!-- Tab Content -->
      {#if leftPaneTab === 'chat'}
        <!-- Chat Tab: Full-height ChatPanel -->
        <div class="chat-tab-content">
          {#if $selectedItinerary}
            <ChatPanel agent={agentConfig} itineraryId={$selectedItinerary.id} />
          {:else}
            <div class="chat-no-itinerary">
              <div class="chat-no-itinerary-icon">💬</div>
              <p class="chat-no-itinerary-text">Start planning your next adventure!</p>
              <p class="chat-no-itinerary-hint">Create a new itinerary or select an existing one to begin chatting with the Trip Designer.</p>
              <button class="minimal-button" onclick={handleBuildClick} type="button">
                Create New Itinerary
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <!-- Itineraries Tab: Header + List + Create Button -->
        <div class="left-pane-header">
          <button class="minimal-button" onclick={handleImportClick} type="button">
            Import PDF
          </button>
          <button class="minimal-button" onclick={handleTextImportClick} type="button">
            Import Text
          </button>
          <button class="minimal-button" onclick={handleBuildClick} type="button">
            Create New
          </button>
        </div>

        <div class="left-pane-content">
          {#if $itinerariesLoading}
            <div class="flex items-center justify-center h-full">
              <div class="text-center">
                <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-minimal-accent border-r-transparent mb-4"></div>
                <p class="text-sm text-minimal-text-muted">Loading...</p>
              </div>
            </div>
          {:else if $itinerariesError}
            <div class="flex items-center justify-center h-full p-4">
              <div class="text-center">
                <p class="text-minimal-text mb-4 text-sm">Error: {$itinerariesError}</p>
                <button class="minimal-button" onclick={loadItineraries} type="button">
                  Retry
                </button>
              </div>
            </div>
          {:else if $itineraries.length === 0}
            <div class="flex items-center justify-center h-full p-4">
              <div class="text-center">
                <p class="text-minimal-text-muted mb-4 text-sm">No itineraries yet</p>
                <button class="minimal-button" onclick={handleBuildClick} type="button">
                  Build your first itinerary
                </button>
              </div>
            </div>
          {:else}
            <div class="space-y-1 p-2">
              {#each $itineraries as itinerary (itinerary.id)}
                <ItineraryListItem
                  {itinerary}
                  selected={$selectedItinerary?.id === itinerary.id}
                  onclick={() => handleSelect(itinerary.id)}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Resize Handle -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="resize-handle"
      class:resizing={isResizing}
      onmousedown={startResize}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      tabindex="0"
    ></div>

    <!-- Right Pane: Main View Area + Visualization -->
    <div class="right-pane-wrapper">
      <!-- Main Content Area -->
      <div class="right-pane-content" class:with-viz={isPaneVisible}>
        {#if mainView === 'home'}
          <!-- Home View: Welcome and Quick Prompts -->
          <HomeView onQuickPromptClick={handleQuickPrompt} />
        {:else if mainView === 'import'}
          <!-- Import View: Upload/Paste Flow -->
          <ImportView models={$models} onSuccess={handleTextImportSuccess} />
        {:else if mainView === 'help'}
          <!-- Help View: Documentation and FAQ -->
          <MainPane
            title="Help & Documentation"
            tabs={[
              { id: 'docs', label: 'Documentation', icon: '📚' },
              { id: 'faq', label: 'FAQ', icon: '❓' }
            ]}
            bind:activeTab={detailTab}
          >
            <HelpView activeTab={detailTab} />
          </MainPane>
        {:else if mainView === 'itinerary-detail' && $selectedItinerary}
          <!-- Itinerary Detail View with Tabs -->
          <MainPane
            title={$selectedItinerary.title}
            tabs={[
              { id: 'itinerary', label: 'Detail' },
              { id: 'calendar', label: 'Calendar' },
              { id: 'map', label: 'Map' },
              { id: 'travelers', label: 'Travelers' }
            ]}
            bind:activeTab={detailTab}
          >
            {#snippet actions()}
              <button
                class="minimal-button"
                onclick={() => handleEditManually($selectedItinerary)}
                type="button"
              >
                Edit Manually
              </button>
              <button
                class="minimal-button"
                onclick={() => handleEditWithPrompt($selectedItinerary)}
                type="button"
              >
                Edit With AI Trip Designer
              </button>
              <button
                class="minimal-button delete-button"
                onclick={() => handleDelete($selectedItinerary)}
                type="button"
              >
                Delete
              </button>
            {/snippet}

            {#if detailTab === 'itinerary'}
              <ItineraryDetail
                itinerary={$selectedItinerary}
                onEditManually={handleEditManually}
                onEditWithPrompt={handleEditWithPrompt}
                onDelete={handleDelete}
              />
            {:else if detailTab === 'calendar'}
              <CalendarView itinerary={$selectedItinerary} />
            {:else if detailTab === 'map'}
              <MapView itinerary={$selectedItinerary} />
            {:else if detailTab === 'travelers'}
              <TravelersView itinerary={$selectedItinerary} />
            {/if}
          </MainPane>
        {:else}
          <!-- Fallback: Empty state -->
          <div class="flex items-center justify-center h-full">
            <p class="text-minimal-text-muted">Select an itinerary or view</p>
          </div>
        {/if}
      </div>

      <!-- Visualization Pane (conditional) -->
      {#if isPaneVisible}
        <div class="visualization-pane-container">
          <VisualizationPane />

          <!-- Visualization Timeline (at bottom, conditional) -->
          {#if historyLength > 0}
            <VisualizationTimeline />
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #fafafa;
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .left-pane {
    flex-shrink: 0;
    background-color: #ffffff;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .left-pane-tabs {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
  }

  .tab-button {
    flex: 1;
    padding: 0.875rem 1rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-button:hover {
    background-color: #f3f4f6;
    color: #1f2937;
  }

  .tab-button.active {
    background-color: #ffffff;
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .chat-tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-no-itinerary {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    gap: 1rem;
  }

  .chat-no-itinerary-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .chat-no-itinerary-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .chat-no-itinerary-hint {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    max-width: 280px;
  }

  .left-pane-header {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    gap: 0.5rem;
    background-color: #ffffff;
    flex-shrink: 0;
  }

  .left-pane-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  :global(.help-welcome) {
    padding: 2rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  :global(.help-welcome .help-icon) {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  :global(.help-welcome h2) {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  :global(.help-welcome p) {
    font-size: 0.9375rem;
    color: #6b7280;
    margin: 0;
  }

  :global(.help-welcome .help-examples-title) {
    margin-top: 1rem;
    font-weight: 500;
    color: #374151;
  }

  :global(.help-welcome .help-examples) {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-align: left;
  }

  :global(.help-welcome .help-examples li) {
    padding: 0.75rem 1rem;
    background-color: #f3f4f6;
    border-radius: 0.5rem;
    color: #4b5563;
    font-size: 0.875rem;
    border: 1px solid #e5e7eb;
  }

  .resize-handle {
    width: 5px;
    cursor: col-resize;
    background-color: transparent;
    transition: background-color 0.2s;
    position: relative;
  }

  .resize-handle:hover,
  .resize-handle.resizing {
    background-color: #3b82f6;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -3px;
    right: -3px;
  }

  .right-pane-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: row;
  }

  .right-pane-content {
    flex: 1;
    overflow: hidden;
    background-color: #fafafa;
    display: flex;
    flex-direction: column;
    transition: flex 0.3s ease;
  }

  .right-pane-content.with-viz {
    /* Main content shrinks when viz pane is visible */
    flex: 0.6;
  }

  .visualization-pane-container {
    flex: 0.4;
    min-width: 400px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Utility classes (minimal design system) */
  :global(.minimal-button) {
    padding: 0.5rem 1rem;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    cursor: pointer;
    transition: all 0.2s;
  }

  :global(.minimal-button:hover:not(:disabled)) {
    background-color: #f9fafb;
    border-color: #d1d5db;
  }

  :global(.minimal-button:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.delete-button) {
    color: #dc2626;
    border-color: #fecaca;
  }

  :global(.delete-button:hover:not(:disabled)) {
    background-color: #fef2f2;
    border-color: #fca5a5;
  }

  :global(.text-minimal-text) {
    color: #1f2937;
  }

  :global(.text-minimal-text-muted) {
    color: #6b7280;
  }

  :global(.text-minimal-accent) {
    color: #3b82f6;
  }

  :global(.bg-minimal-card) {
    background-color: #ffffff;
  }

  :global(.border-minimal-border) {
    border-color: #e5e7eb;
  }

  :global(.minimal-badge) {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background-color: #f3f4f6;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: capitalize;
  }

  /* Responsive: stack on mobile */
  @media (max-width: 768px) {
    .main-content {
      flex-direction: column;
    }

    .left-pane {
      width: 100% !important;
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
      max-height: 50%;
    }

    .resize-handle {
      display: none;
    }

    .right-pane-wrapper {
      flex: 1;
      flex-direction: column;
    }

    .right-pane-content {
      flex: 1 !important;
    }

    .visualization-pane-container {
      flex: 0 0 auto;
      min-width: 100%;
      max-height: 40vh;
    }
  }

  /* Flexbox utilities */
  :global(.flex) {
    display: flex;
  }

  :global(.flex-col) {
    flex-direction: column;
  }

  :global(.items-center) {
    align-items: center;
  }

  :global(.justify-center) {
    justify-content: center;
  }

  :global(.gap-1) {
    gap: 0.25rem;
  }

  :global(.h-full) {
    height: 100%;
  }

  :global(.text-center) {
    text-align: center;
  }

  :global(.mb-4) {
    margin-bottom: 1rem;
  }

  :global(.p-4) {
    padding: 1rem;
  }

  :global(.text-sm) {
    font-size: 0.875rem;
  }

  :global(.space-y-1 > * + *) {
    margin-top: 0.25rem;
  }

  :global(.p-2) {
    padding: 0.5rem;
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import {
    chatSessionId,
    chatMessages,
    chatLoading,
    chatError,
    structuredQuestions,
    streamingContent,
    isStreaming,
    currentToolCall,
    itineraryUpdated,
    sessionTokens,
    sessionCost,
    createChatSession,
    sendMessage,
    sendMessageStreaming,
    resetChat,
  } from '../stores/chat';
  import { loadItinerary } from '../stores/itineraries';
  import type { StructuredQuestion } from '../types';

  let {
    itineraryId,
    disabled = false,
  }: {
    itineraryId: string;
    disabled?: boolean;
  } = $props();

  let message = $state('');
  let messagesContainer: HTMLDivElement | undefined = $state();
  let showScrollButton = $state(false);
  let selectedOptions = $state<Set<string>>(new Set());
  let scaleValues = $state<Map<string, number>>(new Map());
  let dateRangeValues = $state<Map<string, { start: string; end: string }>>(new Map());

  // Auto-create session on mount
  onMount(async () => {
    if (itineraryId && !$chatSessionId) {
      try {
        await createChatSession(itineraryId);
      } catch (error) {
        console.error('Failed to initialize chat session:', error);
      }
    }
  });

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  $effect(() => {
    const container = messagesContainer;
    if (container && ($chatMessages.length > 0 || $streamingContent)) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 0);
      }
    }
  });

  // Reload itinerary when updated
  $effect(() => {
    if ($itineraryUpdated) {
      loadItinerary(itineraryId);
      itineraryUpdated.set(false);
    }
  });

  function handleScroll() {
    if (!messagesContainer) return;
    const { scrollHeight, scrollTop, clientHeight } = messagesContainer;
    showScrollButton = scrollHeight - scrollTop - clientHeight > 100;
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  async function handleSend() {
    if (!message.trim() || $chatLoading) return;

    const userMessage = message;
    message = '';

    // Use streaming
    await sendMessageStreaming(userMessage);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleStructuredAnswer(
    question: StructuredQuestion,
    optionId?: string
  ) {
    if (question.type === 'single_choice' && optionId) {
      const option = question.options?.find((o) => o.id === optionId);
      if (option) {
        message = option.label;
        await handleSend();
        selectedOptions.clear();
      }
    } else if (question.type === 'multiple_choice') {
      if (optionId) {
        // Toggle selection
        if (selectedOptions.has(optionId)) {
          selectedOptions.delete(optionId);
        } else {
          selectedOptions.add(optionId);
        }
        selectedOptions = new Set(selectedOptions);
      }
    }
  }

  async function confirmMultipleChoice(question: StructuredQuestion) {
    if (selectedOptions.size === 0) return;

    const selectedLabels = Array.from(selectedOptions)
      .map((id) => question.options?.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    message = selectedLabels;
    await handleSend();
    selectedOptions.clear();
  }

  function initializeScaleValue(questionId: string, defaultValue: number) {
    if (!scaleValues.has(questionId)) {
      scaleValues.set(questionId, defaultValue);
      scaleValues = new Map(scaleValues);
    }
  }

  function updateScaleValue(questionId: string, value: number) {
    scaleValues.set(questionId, value);
    scaleValues = new Map(scaleValues);
  }

  async function handleScaleSubmit(question: StructuredQuestion) {
    const value = scaleValues.get(question.id);
    if (value === undefined) return;

    message = value.toString();
    await handleSend();
    scaleValues.delete(question.id);
  }

  function initializeDateRange(questionId: string) {
    if (!dateRangeValues.has(questionId)) {
      dateRangeValues.set(questionId, { start: '', end: '' });
      dateRangeValues = new Map(dateRangeValues);
    }
  }

  function updateDateRangeStart(questionId: string, value: string) {
    const current = dateRangeValues.get(questionId) || { start: '', end: '' };
    dateRangeValues.set(questionId, { ...current, start: value });
    dateRangeValues = new Map(dateRangeValues);
  }

  function updateDateRangeEnd(questionId: string, value: string) {
    const current = dateRangeValues.get(questionId) || { start: '', end: '' };
    dateRangeValues.set(questionId, { ...current, end: value });
    dateRangeValues = new Map(dateRangeValues);
  }

  async function handleDateRangeSubmit(question: StructuredQuestion) {
    const range = dateRangeValues.get(question.id);
    if (!range || !range.start || !range.end) return;

    message = `From ${range.start} to ${range.end}`;
    await handleSend();
    dateRangeValues.delete(question.id);
  }

  async function handleTextSubmit(question: StructuredQuestion, value: string) {
    if (!value.trim()) return;

    message = value;
    await handleSend();
  }

  function formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  function getToolCallLabel(toolName: string): string {
    const labels: Record<string, string> = {
      search_flights: 'Searching for flights...',
      search_hotels: 'Finding hotels...',
      search_activities: 'Discovering activities...',
      search_transfers: 'Looking up transfers...',
      search_web: 'Researching...',
      get_weather: 'Checking weather...',
      get_itinerary: 'Loading itinerary...',
      add_segment: 'Adding to your trip...',
      add_flight: 'Adding flight...',
      add_hotel: 'Adding accommodation...',
      add_activity: 'Adding activity...',
      add_transfer: 'Adding transfer...',
      update_segment: 'Updating your trip...',
      update_itinerary: 'Updating trip details...',
      delete_segment: 'Removing from trip...',
      move_segment: 'Rearranging itinerary...',
    };
    return labels[toolName] || `Processing...`;
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }

  async function handleResetChat() {
    if (confirm('Start a new conversation? This will clear the current chat history.')) {
      resetChat();
      if (itineraryId) {
        await createChatSession(itineraryId);
      }
    }
  }
</script>

<div class="chatbox">
  {#if $chatError}
    <div class="chatbox-error">
      <strong>Error:</strong>
      {$chatError}
    </div>
  {/if}

  {#if $chatSessionId && $sessionTokens.total > 0}
    <div class="chatbox-stats-bar" title="Input: {formatNumber($sessionTokens.input)} tokens ({formatCost($sessionCost.input)})&#10;Output: {formatNumber($sessionTokens.output)} tokens ({formatCost($sessionCost.output)})">
      <div class="chatbox-stats-info">
        <span class="chatbox-stats-label">Session:</span>
        <span class="chatbox-stats-tokens">{formatNumber($sessionTokens.total)} tokens</span>
        <span class="chatbox-stats-separator">|</span>
        <span class="chatbox-stats-cost">{formatCost($sessionCost.total)}</span>
      </div>
      <button
        class="chatbox-reset-button"
        onclick={handleResetChat}
        type="button"
        title="Start a new conversation"
      >
        New Chat
      </button>
    </div>
  {/if}

  <div class="chatbox-messages" bind:this={messagesContainer} onscroll={handleScroll}>
    {#if $chatMessages.length === 0}
      <div class="chatbox-empty">
        <p>Start a conversation to plan your trip</p>
        <p class="chatbox-empty-hint">Ask about destinations, activities, or travel dates</p>
      </div>
    {:else}
      {#each $chatMessages as msg}
        <div class="chatbox-message chatbox-message-{msg.role}">
          <div class="chatbox-message-content">
            {msg.content}
          </div>
          <div class="chatbox-message-time">{formatTime(msg.timestamp)}</div>
        </div>
      {/each}

      {#if $isStreaming && $streamingContent}
        <div class="chatbox-message chatbox-message-assistant">
          <div class="chatbox-message-content chatbox-streaming">
            {$streamingContent}<span class="chatbox-cursor"></span>
          </div>
        </div>
      {/if}

      {#if $currentToolCall}
        <div class="chatbox-message chatbox-message-assistant">
          <div class="chatbox-suspense">
            <div class="chatbox-suspense-icon">
              {#if $currentToolCall.includes('search')}
                🔍
              {:else if $currentToolCall.includes('update') || $currentToolCall.includes('add')}
                ✏️
              {:else}
                🔧
              {/if}
            </div>
            <div class="chatbox-suspense-content">
              <div class="chatbox-suspense-label">{getToolCallLabel($currentToolCall)}</div>
              <div class="chatbox-suspense-progress">
                <div class="chatbox-suspense-bar"></div>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if $chatLoading && !$isStreaming && !$currentToolCall}
        <div class="chatbox-message chatbox-message-assistant">
          <div class="chatbox-suspense">
            <div class="chatbox-suspense-icon">💭</div>
            <div class="chatbox-suspense-content">
              <div class="chatbox-suspense-label">Thinking...</div>
              <div class="chatbox-suspense-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  {#if showScrollButton}
    <button class="chatbox-scroll-button" onclick={scrollToBottom} type="button">
      ↓ Scroll to bottom
    </button>
  {/if}

{#if $structuredQuestions && $structuredQuestions.length > 0}
    <div class="chatbox-structured-questions">
      {#each $structuredQuestions as question}
        <div class="chatbox-question">
          <div class="chatbox-question-text">{question.question}</div>
          {#if question.context}
            <div class="chatbox-question-context">{question.context}</div>
          {/if}
          <div class="chatbox-question-options">
            {#if question.type === 'single_choice' && question.options}
              {#each question.options as option}
                <button
                  class="chatbox-option-button"
                  onclick={() => handleStructuredAnswer(question, option.id)}
                  disabled={$chatLoading}
                  type="button"
                >
                  {#if option.imageUrl}
                    <img
                      src={option.imageUrl}
                      alt={option.label}
                      class="chatbox-option-image"
                    />
                  {/if}
                  <span class="chatbox-option-label">{option.label}</span>
                  {#if option.description}
                    <span class="chatbox-option-description">{option.description}</span>
                  {/if}
                </button>
              {/each}
            {:else if question.type === 'multiple_choice' && question.options}
              {#each question.options as option}
                <button
                  class="chatbox-option-button {selectedOptions.has(option.id)
                    ? 'chatbox-option-selected'
                    : ''}"
                  onclick={() => handleStructuredAnswer(question, option.id)}
                  disabled={$chatLoading}
                  type="button"
                >
                  {#if option.imageUrl}
                    <img
                      src={option.imageUrl}
                      alt={option.label}
                      class="chatbox-option-image"
                    />
                  {/if}
                  <span class="chatbox-option-label">{option.label}</span>
                  {#if option.description}
                    <span class="chatbox-option-description">{option.description}</span>
                  {/if}
                </button>
              {/each}
              {#if selectedOptions.size > 0}
                <button
                  class="chatbox-confirm-button"
                  onclick={() => confirmMultipleChoice(question)}
                  type="button"
                >
                  Confirm ({selectedOptions.size} selected)
                </button>
              {/if}
            {:else if question.type === 'scale' && question.scale}
              {@const scale = question.scale}
              {#snippet _init()}{initializeScaleValue(question.id, scale.min)}{/snippet}
              {@render _init()}
              <div class="chatbox-scale-question">
                <input
                  type="range"
                  min={scale.min}
                  max={scale.max}
                  step={scale.step || 1}
                  value={scaleValues.get(question.id) || scale.min}
                  oninput={(e) =>
                    updateScaleValue(question.id, Number(e.currentTarget.value))}
                  class="chatbox-scale-input"
                />
                <div class="chatbox-scale-labels">
                  <span>{scale.minLabel || scale.min}</span>
                  <span class="chatbox-scale-value">
                    {scaleValues.get(question.id) || scale.min}
                  </span>
                  <span>{scale.maxLabel || scale.max}</span>
                </div>
                <button
                  class="chatbox-confirm-button"
                  onclick={() => handleScaleSubmit(question)}
                  type="button"
                >
                  Confirm
                </button>
              </div>
            {:else if question.type === 'date_range'}
              {#snippet _init()}{initializeDateRange(question.id)}{/snippet}
              {@render _init()}
              <div class="chatbox-date-range-question">
                <label class="chatbox-date-label">
                  <span>Start Date:</span>
                  <input
                    type="date"
                    value={dateRangeValues.get(question.id)?.start || ''}
                    oninput={(e) => updateDateRangeStart(question.id, e.currentTarget.value)}
                    class="chatbox-date-input"
                  />
                </label>
                <label class="chatbox-date-label">
                  <span>End Date:</span>
                  <input
                    type="date"
                    value={dateRangeValues.get(question.id)?.end || ''}
                    oninput={(e) => updateDateRangeEnd(question.id, e.currentTarget.value)}
                    class="chatbox-date-input"
                  />
                </label>
                <button
                  class="chatbox-confirm-button"
                  onclick={() => handleDateRangeSubmit(question)}
                  disabled={
                    !dateRangeValues.get(question.id)?.start ||
                    !dateRangeValues.get(question.id)?.end
                  }
                  type="button"
                >
                  Confirm
                </button>
              </div>
            {:else if question.type === 'text'}
              <div class="chatbox-text-question">
                <input
                  type="text"
                  placeholder="Type your answer..."
                  class="chatbox-text-input"
                  onkeydown={(e) => {
                    if (e.key === 'Enter') {
                      handleTextSubmit(question, e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="chatbox-input-container">
    <textarea
      bind:value={message}
      onkeydown={handleKeydown}
      placeholder="Type a message... (Shift+Enter for new line)"
      class="chatbox-input"
      rows="3"
      disabled={disabled || $chatLoading}
    ></textarea>
    <button
      onclick={handleSend}
      disabled={disabled || $chatLoading || !message.trim()}
      class="chatbox-send-button"
      type="button"
    >
      {$chatLoading ? 'Sending...' : 'Send'}
    </button>
  </div>
</div>

<style>
  .chatbox {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #ffffff;
    border-top: 1px solid #e5e7eb;
    position: relative;
  }

  .chatbox-error {
    padding: 0.75rem 1rem;
    background-color: #fef2f2;
    border-bottom: 1px solid #fee2e2;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .chatbox-stats-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.75rem;
    color: #6b7280;
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
    transition: background-color 0.2s;
    flex-shrink: 0;
  }

  .chatbox-stats-bar:hover {
    background-color: #f3f4f6;
  }

  .chatbox-stats-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: help;
  }

  .chatbox-stats-label {
    font-weight: 600;
    color: #374151;
  }

  .chatbox-stats-tokens {
    color: #4b5563;
  }

  .chatbox-stats-separator {
    color: #d1d5db;
  }

  .chatbox-stats-cost {
    color: #059669;
    font-weight: 600;
  }

  .chatbox-reset-button {
    padding: 0.375rem 0.75rem;
    background-color: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .chatbox-reset-button:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
    color: #1f2937;
  }

  .chatbox-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 0;
  }

  .chatbox-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #6b7280;
    text-align: center;
  }

  .chatbox-empty p {
    margin: 0.25rem 0;
  }

  .chatbox-empty-hint {
    font-size: 0.875rem;
    color: #9ca3af;
  }

  .chatbox-message {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .chatbox-message-user {
    align-items: flex-end;
  }

  .chatbox-message-user .chatbox-message-content {
    background-color: #3b82f6;
    color: white;
    border-radius: 1rem 1rem 0.25rem 1rem;
    margin-left: 2rem;
  }

  .chatbox-message-user .chatbox-message-time {
    text-align: right;
  }

  .chatbox-message-assistant {
    align-items: flex-start;
  }

  .chatbox-message-assistant .chatbox-message-content {
    background-color: #f3f4f6;
    color: #1f2937;
    border-radius: 1rem 1rem 1rem 0.25rem;
    margin-right: 2rem;
  }

  .chatbox-message-content {
    padding: 0.875rem 1.25rem;
    font-size: 0.9375rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .chatbox-message-time {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-top: 0.375rem;
    padding: 0 0.25rem;
  }

  .chatbox-typing {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .chatbox-typing span {
    width: 0.5rem;
    height: 0.5rem;
    background-color: #9ca3af;
    border-radius: 50%;
    animation: typing 1.4s infinite;
  }

  .chatbox-typing span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .chatbox-typing span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%,
    60%,
    100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-0.5rem);
    }
  }

  .chatbox-streaming {
    position: relative;
  }

  .chatbox-cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background-color: #1f2937;
    margin-left: 2px;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%,
    50% {
      opacity: 1;
    }
    51%,
    100% {
      opacity: 0;
    }
  }

  .chatbox-suspense {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: 1rem;
    border: 1px solid #bae6fd;
  }

  .chatbox-suspense-icon {
    font-size: 1.25rem;
    animation: pulse 2s ease-in-out infinite;
  }

  .chatbox-suspense-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .chatbox-suspense-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #0369a1;
  }

  .chatbox-suspense-progress {
    height: 3px;
    background-color: #e0f2fe;
    border-radius: 2px;
    overflow: hidden;
  }

  .chatbox-suspense-bar {
    height: 100%;
    width: 30%;
    background: linear-gradient(90deg, #0ea5e9, #38bdf8);
    border-radius: 2px;
    animation: progress 1.5s ease-in-out infinite;
  }

  @keyframes progress {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }

  .chatbox-suspense-dots {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .chatbox-suspense-dots span {
    width: 6px;
    height: 6px;
    background-color: #0ea5e9;
    border-radius: 50%;
    animation: suspenseDot 1.4s infinite;
  }

  .chatbox-suspense-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .chatbox-suspense-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes suspenseDot {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.6;
    }
    30% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }

  .chatbox-tool-call {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-style: italic;
    color: #6b7280;
  }

  .chatbox-tool-icon {
    font-size: 1rem;
  }

  .chatbox-scroll-button {
    position: absolute;
    bottom: 6rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
  }

  .chatbox-scroll-button:hover {
    background-color: #f9fafb;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .chatbox-structured-questions {
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
    background-color: #f9fafb;
    flex-shrink: 0;
    max-height: 40%;
    overflow-y: auto;
  }

  .chatbox-question {
    margin-bottom: 1rem;
  }

  .chatbox-question:last-child {
    margin-bottom: 0;
  }

  .chatbox-question-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .chatbox-question-context {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
    font-style: italic;
  }

  .chatbox-question-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chatbox-option-button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.5rem 0.75rem;
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .chatbox-option-button:hover:not(:disabled) {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  .chatbox-option-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chatbox-option-selected {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  .chatbox-option-label {
    font-weight: 500;
    color: #1f2937;
  }

  .chatbox-option-description {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .chatbox-option-image {
    width: 100%;
    height: auto;
    max-height: 150px;
    object-fit: cover;
    border-radius: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .chatbox-confirm-button {
    padding: 0.5rem 1rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .chatbox-confirm-button:hover {
    background-color: #2563eb;
  }

  .chatbox-input-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
    background-color: #ffffff;
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    z-index: 10;
  }

  .chatbox-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    resize: vertical;
    font-family: inherit;
    background-color: #ffffff;
    color: #1f2937;
  }

  .chatbox-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  .chatbox-input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }

  .chatbox-send-button {
    align-self: flex-end;
    padding: 0.5rem 1rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .chatbox-send-button:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .chatbox-send-button:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }

  .chatbox-scale-question {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .chatbox-scale-input {
    width: 100%;
    cursor: pointer;
  }

  .chatbox-scale-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .chatbox-scale-value {
    font-weight: 600;
    color: #3b82f6;
    font-size: 1rem;
  }

  .chatbox-date-range-question {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .chatbox-date-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #1f2937;
  }

  .chatbox-date-input {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: inherit;
  }

  .chatbox-date-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  .chatbox-text-question {
    width: 100%;
  }

  .chatbox-text-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: inherit;
  }

  .chatbox-text-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }
</style>

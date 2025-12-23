<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { itineraries } from '$lib/stores/itineraries';

  let {
    onQuickPromptClick
  }: {
    onQuickPromptClick: (prompt: string) => void;
  } = $props();

  // Derive user's first name or email for welcome message
  let displayName = $derived(() => {
    if (authStore.userEmail) {
      // Extract first name from email if possible
      const emailPrefix = authStore.userEmail.split('@')[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return 'there';
  });

  // Quick prompt buttons
  const quickPrompts = [
    {
      id: 'weekend-getaway',
      text: 'Plan a weekend getaway',
      icon: '🏖️',
      description: 'Create a quick 2-3 day trip'
    },
    {
      id: 'upcoming-trip',
      text: 'Help me with my upcoming trip',
      icon: '✈️',
      description: 'Get assistance with trip planning'
    },
    {
      id: 'find-activities',
      text: 'Find activities for my destination',
      icon: '🎯',
      description: 'Discover things to do'
    },
    {
      id: 'optimize-itinerary',
      text: 'Optimize my travel schedule',
      icon: '📅',
      description: 'Improve your itinerary flow'
    }
  ];

  function handlePromptClick(prompt: string) {
    onQuickPromptClick(prompt);
  }
</script>

<div class="home-view">
  <div class="home-content">
    <!-- Welcome Section -->
    <div class="welcome-section">
      <div class="welcome-icon">👋</div>
      <h1 class="welcome-title">Welcome back, {displayName()}!</h1>
      <p class="welcome-subtitle">Ready to plan your next adventure?</p>
    </div>

    <!-- Itinerary Summary -->
    <div class="summary-card">
      <div class="summary-icon">🗂️</div>
      <div class="summary-content">
        <div class="summary-number">{$itineraries.length}</div>
        <div class="summary-label">
          {$itineraries.length === 1 ? 'Itinerary' : 'Itineraries'}
        </div>
      </div>
    </div>

    <!-- Quick Prompts Section -->
    <div class="quick-prompts-section">
      <h2 class="section-title">Get Started</h2>
      <p class="section-subtitle">Choose a quick action below or start chatting with the Trip Designer</p>

      <div class="quick-prompts-grid">
        {#each quickPrompts as prompt}
          <button
            class="prompt-button"
            onclick={() => handlePromptClick(prompt.text)}
            type="button"
          >
            <div class="prompt-icon">{prompt.icon}</div>
            <div class="prompt-content">
              <div class="prompt-text">{prompt.text}</div>
              <div class="prompt-description">{prompt.description}</div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Help Section -->
    <div class="help-section">
      <div class="help-icon">💡</div>
      <p class="help-text">
        New to Itinerizer? Check out our <a href="/help" class="help-link">Help & Documentation</a> to learn more.
      </p>
    </div>
  </div>
</div>

<style>
  .home-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    overflow-y: auto;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #fef3c7 100%);
    padding: 2rem;
  }

  .home-content {
    max-width: 800px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Welcome Section */
  .welcome-section {
    text-align: center;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .welcome-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: wave 2s ease-in-out infinite;
  }

  @keyframes wave {
    0%, 100% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(20deg);
    }
    75% {
      transform: rotate(-20deg);
    }
  }

  .welcome-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .welcome-subtitle {
    font-size: 1.125rem;
    color: #6b7280;
    margin: 0;
  }

  /* Summary Card */
  .summary-card {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem 2rem;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border: 2px solid #3b82f6;
  }

  .summary-icon {
    font-size: 3rem;
  }

  .summary-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-number {
    font-size: 2.5rem;
    font-weight: 700;
    color: #3b82f6;
    line-height: 1;
  }

  .summary-label {
    font-size: 1rem;
    font-weight: 500;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  /* Quick Prompts Section */
  .quick-prompts-section {
    background: rgba(255, 255, 255, 0.8);
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
    text-align: center;
  }

  .section-subtitle {
    font-size: 0.9375rem;
    color: #6b7280;
    margin: 0 0 1.5rem 0;
    text-align: center;
  }

  .quick-prompts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

  .prompt-button {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .prompt-button:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
  }

  .prompt-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .prompt-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .prompt-text {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }

  .prompt-description {
    font-size: 0.875rem;
    color: #6b7280;
  }

  /* Help Section */
  .help-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
  }

  .help-icon {
    font-size: 1.5rem;
  }

  .help-text {
    font-size: 0.9375rem;
    color: #4b5563;
    margin: 0;
  }

  .help-link {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
  }

  .help-link:hover {
    text-decoration: underline;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .home-view {
      padding: 1rem;
    }

    .welcome-title {
      font-size: 1.5rem;
    }

    .welcome-subtitle {
      font-size: 1rem;
    }

    .quick-prompts-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

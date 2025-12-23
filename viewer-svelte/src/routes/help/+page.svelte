<script lang="ts">
  import Header from '$lib/components/Header.svelte';

  // Help sections
  const helpSections = [
    {
      title: 'Getting Started',
      icon: '🚀',
      items: [
        {
          title: 'Create Your First Itinerary',
          content: 'Click "New Itinerary" to start building your travel plan. Our AI Trip Designer will help you create a personalized itinerary based on your preferences.'
        },
        {
          title: 'Import Existing Plans',
          content: 'Have an existing itinerary? Use "Import PDF" or "Import Text" to bring in your travel plans. Our AI will parse and organize them automatically.'
        }
      ]
    },
    {
      title: 'Using the AI Trip Designer',
      icon: '🤖',
      items: [
        {
          title: 'Start a Conversation',
          content: 'Select an itinerary and use the chat interface to describe your ideal trip. Tell the AI about your destination, dates, interests, and travel style.'
        },
        {
          title: 'Refine Your Plans',
          content: 'Ask the AI to add activities, change accommodations, adjust timing, or get recommendations. It understands context and remembers your preferences.'
        },
        {
          title: 'Get Local Insights',
          content: 'Ask about local cuisine, hidden gems, transportation options, or cultural tips. The AI can search for up-to-date information when needed.'
        }
      ]
    },
    {
      title: 'Managing Itineraries',
      icon: '📋',
      items: [
        {
          title: 'View Modes',
          content: 'Switch between List, Calendar, and Map views using the tabs at the bottom. Each view offers a different perspective on your itinerary.'
        },
        {
          title: 'Edit Segments',
          content: 'Click on any segment to view details. You can edit times, locations, and notes directly or ask the AI to make changes.'
        },
        {
          title: 'Travelers',
          content: 'Add travelers to your itinerary in the Travelers tab. This helps personalize recommendations and track who\'s joining each activity.'
        }
      ]
    },
    {
      title: 'Tips & Best Practices',
      icon: '💡',
      items: [
        {
          title: 'Be Specific',
          content: 'The more details you provide (dates, budget, interests, mobility needs), the better the AI can tailor recommendations to your needs.'
        },
        {
          title: 'Iterate and Refine',
          content: 'Don\'t expect perfection on the first try. Use the conversation to refine and improve your itinerary step by step.'
        },
        {
          title: 'Save Often',
          content: 'Your itineraries are automatically saved, but you can create new versions if you want to explore different options.'
        }
      ]
    }
  ];
</script>

<div class="help-page">
  <Header />

  <main class="help-content">
    <div class="help-header">
      <h1>Help Center</h1>
      <p>Everything you need to know about using Itinerizer</p>
    </div>

    <div class="help-sections">
      {#each helpSections as section}
        <section class="help-section">
          <h2>
            <span class="section-icon">{section.icon}</span>
            {section.title}
          </h2>
          <div class="help-items">
            {#each section.items as item}
              <article class="help-item">
                <h3>{item.title}</h3>
                <p>{item.content}</p>
              </article>
            {/each}
          </div>
        </section>
      {/each}
    </div>

    <div class="help-footer">
      <div class="ai-help-cta">
        <h3>Need more help?</h3>
        <p>Ask our AI assistant! When chatting with an itinerary, just ask any question about how to use the app.</p>
        <a href="/itineraries" class="back-button">Back to Itineraries</a>
      </div>
    </div>
  </main>
</div>

<style>
  .help-page {
    min-height: 100vh;
    background-color: #f9fafb;
  }

  .help-content {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
  }

  .help-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .help-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .help-header p {
    font-size: 1.125rem;
    color: #6b7280;
  }

  .help-sections {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .help-section {
    background-color: #ffffff;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .help-section h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .section-icon {
    font-size: 1.5rem;
  }

  .help-items {
    display: grid;
    gap: 1rem;
  }

  .help-item {
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .help-item h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .help-item p {
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.6;
    margin: 0;
  }

  .help-footer {
    margin-top: 3rem;
  }

  .ai-help-cta {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 1rem;
    padding: 2rem;
    text-align: center;
    color: white;
  }

  .ai-help-cta h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .ai-help-cta p {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 1.5rem;
  }

  .back-button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    text-decoration: none;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .back-button:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 640px) {
    .help-content {
      padding: 1rem;
    }

    .help-header h1 {
      font-size: 2rem;
    }

    .help-section {
      padding: 1rem;
    }
  }
</style>

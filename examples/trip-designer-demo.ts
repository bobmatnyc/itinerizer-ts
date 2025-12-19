/**
 * Trip Designer Agent demonstration
 * Shows how to use the conversational trip planning agent
 */

import { TripDesignerService } from '../src/services/trip-designer/index.js';
import { ItineraryService } from '../src/services/itinerary.service.js';
import { SegmentService } from '../src/services/segment.service.js';
import { DependencyService } from '../src/services/dependency.service.js';
import { FileSystemStorage } from '../src/storage/filesystem.storage.js';
import type { ItineraryId } from '../src/domain/types/branded.js';

/**
 * Demo: Interactive trip planning conversation
 */
async function demo() {
  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENROUTER_API_KEY environment variable not set');
    console.error('Get your key from: https://openrouter.ai/keys');
    process.exit(1);
  }

  // Initialize storage and services
  const storage = new FileSystemStorage('./data');
  const itineraryService = new ItineraryService(storage);
  const segmentService = new SegmentService(storage);
  const dependencyService = new DependencyService();

  // Create Trip Designer
  const tripDesigner = new TripDesignerService(
    {
      apiKey,
      model: 'anthropic/claude-3.5-sonnet:online',
      maxTokens: 4096,
      temperature: 0.7,
    },
    undefined, // Use default in-memory session storage
    {
      itineraryService,
      segmentService,
      dependencyService,
    }
  );

  console.log('🤖 Trip Designer Agent Demo\n');

  // Create a new itinerary
  console.log('Creating a new itinerary...');
  const createResult = await itineraryService.create({
    title: 'Paris Family Trip',
    startDate: new Date('2024-06-15'),
    endDate: new Date('2024-06-22'),
    description: 'Week-long family trip to Paris',
  });

  if (!createResult.success) {
    console.error('Failed to create itinerary:', createResult.error);
    return;
  }

  const itineraryId = createResult.value.id as ItineraryId;
  console.log(`✓ Created itinerary: ${itineraryId}\n`);

  // Create a session
  console.log('Starting planning session...');
  const sessionResult = await tripDesigner.createSession(itineraryId);

  if (!sessionResult.success) {
    console.error('Failed to create session:', sessionResult.error);
    return;
  }

  const sessionId = sessionResult.value;
  console.log(`✓ Session created: ${sessionId}\n`);

  // Conversation flow
  const messages = [
    "Hi! I'm planning a week in Paris for my family of 4 (2 adults, 2 kids ages 8 and 10) in June. We love food, history, and art. Our budget is around $8,000 for everything except flights.",
    "That sounds great! We'd prefer a hotel in a central location. What are the options?",
    "The Hotel Louvre Lens sounds perfect. Can you add it to our itinerary?",
    "Yes, let's add the Louvre tour on our first full day. What time would work best?",
  ];

  for (const userMessage of messages) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`👤 User: ${userMessage}`);
    console.log(`${'='.repeat(60)}\n`);

    const response = await tripDesigner.chat(sessionId, userMessage);

    if (!response.success) {
      console.error('❌ Error:', response.error);
      continue;
    }

    const { message, structuredQuestions, itineraryUpdated, toolCallsMade } = response.value;

    console.log(`🤖 Agent: ${message}\n`);

    // Show tool calls if any
    if (toolCallsMade && toolCallsMade.length > 0) {
      console.log('🛠️  Tool calls made:');
      for (const toolCall of toolCallsMade) {
        console.log(`   - ${toolCall.function.name}`);
      }
      console.log();
    }

    // Show structured questions if any
    if (structuredQuestions && structuredQuestions.length > 0) {
      console.log('📋 Structured Questions:');
      for (const question of structuredQuestions) {
        console.log(`   Q: ${question.question}`);
        if (question.options) {
          for (const option of question.options) {
            console.log(`      - ${option.label}: ${option.description || ''}`);
          }
        }
      }
      console.log();
    }

    // Show itinerary update status
    if (itineraryUpdated) {
      console.log('✅ Itinerary updated\n');
    }

    // Small delay to make output readable
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Get final session state
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Final Session State');
  console.log(`${'='.repeat(60)}\n`);

  const finalSessionResult = await tripDesigner.getSession(sessionId);
  if (finalSessionResult.success) {
    const session = finalSessionResult.value;
    console.log(`Messages exchanged: ${session.metadata.messageCount}`);
    console.log(`Total tokens used: ${session.metadata.totalTokens}`);
    console.log(`Cost (estimated): $${session.metadata.costUSD?.toFixed(4) || 'N/A'}`);
    console.log(`\nTrip Profile:`);
    console.log(`  Travelers: ${session.tripProfile.travelers.count}`);
    console.log(`  Budget: ${session.tripProfile.budget?.total || 'Not specified'}`);
    console.log(`  Interests: ${session.tripProfile.interests?.join(', ') || 'Not extracted'}`);
    console.log(`  Confidence: ${(session.tripProfile.confidence * 100).toFixed(0)}%`);
  }

  // Get final itinerary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📅 Final Itinerary');
  console.log(`${'='.repeat(60)}\n`);

  const itineraryResult = await itineraryService.get(itineraryId);
  if (itineraryResult.success) {
    const itinerary = itineraryResult.value;
    console.log(`Title: ${itinerary.title}`);
    console.log(`Dates: ${itinerary.startDate.toLocaleDateString()} - ${itinerary.endDate.toLocaleDateString()}`);
    console.log(`Segments: ${itinerary.segments.length}`);
    console.log();

    for (const segment of itinerary.segments) {
      console.log(`  [${segment.type}] ${segment.startDatetime.toLocaleString()}`);
      if (segment.type === 'FLIGHT') {
        console.log(`    Flight ${(segment as any).flightNumber}: ${(segment as any).origin.code} → ${(segment as any).destination.code}`);
      } else if (segment.type === 'HOTEL') {
        console.log(`    ${(segment as any).property.name}`);
      } else if (segment.type === 'ACTIVITY') {
        console.log(`    ${(segment as any).name}`);
      }
    }
  }

  console.log(`\n${'✓'.repeat(60)}`);
  console.log('Demo complete! 🎉');
  console.log(`${'✓'.repeat(60)}\n`);
}

/**
 * Run the demo
 */
demo().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});

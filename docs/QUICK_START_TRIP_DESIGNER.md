# Trip Designer Agent - Quick Start Guide

## 5-Minute Setup

### 1. Get OpenRouter API Key
```bash
# Visit https://openrouter.ai/keys
# Sign up and create an API key
export OPENROUTER_API_KEY="sk-or-v1-..."
```

### 2. Install Dependencies
```bash
npm install
npm run build
```

### 3. Create Your First Session
```typescript
import { TripDesignerService } from './src/services/trip-designer';
import { ItineraryService, SegmentService, DependencyService } from './src/services';
import { FileSystemStorage } from './src/storage/filesystem.storage';

// Setup
const storage = new FileSystemStorage('./data');
const tripDesigner = new TripDesignerService(
  { apiKey: process.env.OPENROUTER_API_KEY! },
  undefined,
  {
    itineraryService: new ItineraryService(storage),
    segmentService: new SegmentService(storage),
    dependencyService: new DependencyService(),
  }
);

// Create itinerary
const itin = await itineraryService.create({
  title: 'My Trip',
  startDate: new Date('2024-06-15'),
  endDate: new Date('2024-06-22'),
});

// Start session
const session = await tripDesigner.createSession(itin.value.id);

// Chat!
const response = await tripDesigner.chat(
  session.value,
  "Plan a relaxing beach vacation"
);

console.log(response.value.message);
```

### 4. Run the Demo
```bash
npm run demo:trip-designer
```

## Common Use Cases

### Planning a Trip from Scratch
```typescript
// Start conversation
await chat(sessionId, "I want to plan a trip to Japan in cherry blossom season");

// Agent asks discovery questions
// User responds with preferences
await chat(sessionId, "2 weeks, budget $6000, love culture and food");

// Agent searches and suggests
// User confirms bookings
await chat(sessionId, "Add the hotel in Kyoto");

// Agent adds segments to itinerary
// User refines
await chat(sessionId, "Move the temple visit to the morning");
```

### Getting Flight Recommendations
```typescript
await chat(sessionId, "Find me flights from SFO to Tokyo in March");

// Agent uses search_flights tool
// Presents options with prices
// User selects
await chat(sessionId, "Book the direct flight on United");

// Agent adds flight segment
```

### Structured Questions Example
```typescript
const response = await chat(sessionId, "What type of hotel should I stay at?");

if (response.value.structuredQuestions) {
  // Render UI
  const question = response.value.structuredQuestions[0];
  console.log(question.question);

  for (const option of question.options) {
    console.log(`- ${option.label}: ${option.description}`);
  }

  // User selects
  await chat(sessionId, "I prefer boutique hotel");
}
```

## Available Tools

### Query Tools
```typescript
get_itinerary()           // Get complete itinerary state
get_segment(segmentId)    // Get specific segment details
```

### Add Segments
```typescript
add_flight({              // Add flight
  airline: { name, code },
  flightNumber,
  origin: { name, code, city },
  destination: { name, code, city },
  departureTime,
  arrivalTime
})

add_hotel({               // Add accommodation
  property: { name },
  location: { name, city },
  checkInDate,
  checkOutDate,
  roomType,
  price
})

add_activity({            // Add activity/tour
  name,
  location: { name, city },
  startTime,
  durationHours,
  description
})

add_transfer({            // Add ground transport
  transferType,
  pickupLocation: { name },
  dropoffLocation: { name },
  pickupTime,
  estimatedDurationMinutes
})

add_meeting({             // Add meeting
  title,
  location: { name },
  startTime,
  endTime,
  attendees
})
```

### Modify Segments
```typescript
update_segment(segmentId, updates)  // Update fields
delete_segment(segmentId)           // Remove segment
move_segment(segmentId, newTime)    // Adjust time (cascades)
reorder_segments([segmentIds])      // Change order
```

### Search Tools
```typescript
search_web(query)                   // General web search
search_flights({                    // Flight prices
  origin, destination,
  departureDate, returnDate
})
search_hotels({                     // Hotel prices
  location, checkInDate,
  checkOutDate, adults
})
search_transfers({                  // Transfer options
  origin, destination
})
```

## Response Format

Every agent response includes:
```typescript
{
  message: string                      // Natural language
  structuredQuestions?: [...]          // UI-friendly options
  itineraryUpdated?: boolean           // True if segments changed
  segmentsModified?: [segmentIds]      // Which segments changed
  toolCallsMade?: [...]                // What tools were used
}
```

## Session Management

### Create Session
```typescript
const sessionId = await tripDesigner.createSession(itineraryId);
```

### Get Session State
```typescript
const session = await tripDesigner.getSession(sessionId);
console.log(session.value.metadata.messageCount);
console.log(session.value.tripProfile);
```

### List All Sessions
```typescript
const sessions = await sessionManager.listSessions();
// Or for specific itinerary:
const sessions = await sessionManager.listSessions(itineraryId);
```

### Cleanup
```typescript
// Manually cleanup idle sessions
const cleaned = await tripDesigner.cleanupIdleSessions();

// Or delete specific session
await sessionManager.deleteSession(sessionId);
```

## Configuration Options

### Basic
```typescript
{
  apiKey: process.env.OPENROUTER_API_KEY!  // Required
}
```

### Advanced
```typescript
{
  apiKey: process.env.OPENROUTER_API_KEY!,
  model: 'anthropic/claude-3.5-sonnet:online',  // Or 'openai/gpt-4o'
  maxTokens: 4096,                              // Max completion length
  temperature: 0.7,                             // Creativity (0-1)
  sessionCostLimit: 2.0,                        // Max $ per session
  compactionThreshold: 0.8,                     // When to compact (0-1)
}
```

### With SERP API
```typescript
{
  apiKey: process.env.OPENROUTER_API_KEY!,
  serpApiKey: process.env.SERP_API_KEY,        // For price search
}
```

## Error Handling

```typescript
const response = await tripDesigner.chat(sessionId, message);

if (!response.success) {
  switch (response.error.type) {
    case 'session_not_found':
      console.error('Session expired or invalid');
      break;

    case 'rate_limit_exceeded':
      const retryAfter = response.error.retryAfter;
      console.error(`Rate limited. Retry in ${retryAfter}s`);
      break;

    case 'llm_api_error':
      if (response.error.retryable) {
        console.error('Temporary error, retry');
      } else {
        console.error('Fatal error:', response.error.error);
      }
      break;

    case 'cost_limit_exceeded':
      console.error('Session cost limit reached');
      break;
  }
}
```

## Trip Profile

Automatically extracted from conversation:

```typescript
const session = await tripDesigner.getSession(sessionId);
const profile = session.value.tripProfile;

console.log('Travelers:', profile.travelers.count);
console.log('Budget:', profile.budget?.total);
console.log('Interests:', profile.interests);
console.log('Confidence:', profile.confidence);  // 0-1 score
```

## Best Practices

### 1. One Session Per Trip
```typescript
// ✅ Good
const session1 = await tripDesigner.createSession(parisItineraryId);
const session2 = await tripDesigner.createSession(tokyoItineraryId);

// ❌ Bad - Don't reuse sessions across trips
```

### 2. Cleanup Regularly
```typescript
// Run every 30 minutes
setInterval(async () => {
  await tripDesigner.cleanupIdleSessions();
}, 30 * 60 * 1000);
```

### 3. Handle Structured Questions
```typescript
const response = await chat(sessionId, message);

if (response.value.structuredQuestions) {
  // Present in UI with actual buttons/dropdowns
  // Don't just print to console
  renderQuestions(response.value.structuredQuestions);
}
```

### 4. Refresh UI on Updates
```typescript
if (response.value.itineraryUpdated) {
  // Reload itinerary from service
  const itinerary = await itineraryService.get(itineraryId);
  updateUI(itinerary.value);
}
```

### 5. Provide Service Dependencies
```typescript
// ✅ Good - Services provided
new TripDesignerService(config, storage, {
  itineraryService,
  segmentService,
  dependencyService
});

// ⚠️ Limited - Tool calls will fail
new TripDesignerService(config);
```

## Performance Tips

### Reduce Token Usage
- Use structured questions instead of long text descriptions
- Compact sessions proactively if conversation is long
- Delete old sessions you won't resume

### Faster Responses
- Use streaming (when implemented)
- Lower temperature (0.3-0.5) for more deterministic responses
- Reduce maxTokens if you don't need long responses

### Cost Optimization
- Set sessionCostLimit to prevent runaway costs
- Use GPT-4o instead of Claude for cheaper option
- Monitor token usage: `session.metadata.totalTokens`

## Monitoring

### Session Stats
```typescript
const stats = tripDesigner.getStats();
console.log('Active sessions:', stats.activeSessions);
```

### Cost Tracking
```typescript
const session = await tripDesigner.getSession(sessionId);
console.log('Cost so far:', session.value.metadata.costUSD);
console.log('Tokens used:', session.value.metadata.totalTokens);
```

### Message History
```typescript
const session = await tripDesigner.getSession(sessionId);
for (const msg of session.value.messages) {
  console.log(`[${msg.role}] ${msg.content.slice(0, 100)}...`);
}
```

## Troubleshooting

### "Invalid API key"
```bash
# Check environment variable
echo $OPENROUTER_API_KEY

# Should start with sk-or-v1-
# Get key from: https://openrouter.ai/keys
```

### "Session not found"
```typescript
// Sessions expire after being idle for 24 hours
// Create a new session:
const newSession = await tripDesigner.createSession(itineraryId);
```

### "Tool execution failed"
```typescript
// Make sure services are provided
const tripDesigner = new TripDesignerService(config, storage, {
  itineraryService,      // Required for get_itinerary
  segmentService,        // Required for add/update/delete
  dependencyService,     // Required for move_segment
});
```

### "Context limit exceeded"
```typescript
// Session history is too long
// Solution 1: Manual compaction
await tripDesigner.compactSession(sessionId);

// Solution 2: Start fresh session
const newSession = await tripDesigner.createSession(itineraryId);
```

## Next Steps

1. **Read the architecture**: `docs/architecture/trip-designer-agent.md`
2. **Run the demo**: `examples/trip-designer-demo.ts`
3. **Check examples**: See conversation flows in `docs/architecture/trip-designer-flow.md`
4. **Integrate**: Add to your CLI or web app

## Getting Help

- **Architecture**: See `docs/architecture/`
- **API Reference**: Check JSDoc comments in source files
- **Examples**: Look at `examples/trip-designer-demo.ts`
- **Tests**: Review `tests/services/trip-designer/`

## What's Next?

After you're comfortable with basics:
- Implement context compaction
- Add SERP API for real price search
- Build a web UI with structured questions
- Add streaming for real-time responses
- Implement cost tracking and limits

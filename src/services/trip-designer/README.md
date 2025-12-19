# Trip Designer Agent

Conversational AI assistant for trip planning powered by OpenRouter (Claude 3.5 Sonnet or GPT-4o).

## Quick Start

```typescript
import { TripDesignerService } from './services/trip-designer';
import { ItineraryService, SegmentService, DependencyService } from './services';

// Create dependencies
const itineraryService = new ItineraryService(storage);
const segmentService = new SegmentService(storage);
const dependencyService = new DependencyService();

// Create Trip Designer
const tripDesigner = new TripDesignerService(
  {
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: 'anthropic/claude-3.5-sonnet:online',
  },
  undefined, // Use default in-memory session storage
  {
    itineraryService,
    segmentService,
    dependencyService,
  }
);

// Create a session
const sessionResult = await tripDesigner.createSession(itineraryId);
const sessionId = sessionResult.value;

// Chat with the agent
const response = await tripDesigner.chat(
  sessionId,
  "I'm planning a week in Paris for my family in June. We love food and history."
);

if (response.success) {
  console.log(response.value.message);

  if (response.value.structuredQuestions) {
    // Render UI with structured questions
  }

  if (response.value.itineraryUpdated) {
    // Refresh itinerary display
  }
}
```

## Features

### 🤖 Conversational Planning
- Natural language trip planning
- Context-aware suggestions
- Remembers preferences across conversation

### 🛠️ Tool Integration
- **Itinerary Management**: Add/update/delete segments
- **Web Search**: Current travel info via OpenRouter :online
- **Price Search**: Flight and hotel prices (SERP API)
- **Transfer Search**: Ground transportation options

### 📋 Structured Questions
Present options in a UI-friendly format:
```json
{
  "structuredQuestions": [{
    "type": "single_choice",
    "question": "What type of accommodation do you prefer?",
    "options": [
      {"id": "luxury", "label": "Luxury Hotel"},
      {"id": "boutique", "label": "Boutique Hotel"},
      {"id": "resort", "label": "Resort"},
      {"id": "rental", "label": "Vacation Rental"}
    ]
  }]
}
```

### 💾 Session Management
- Automatic context compaction
- Session persistence
- Trip profile extraction

## Architecture

```
TripDesignerService
├── SessionManager (conversation state)
├── ToolExecutor (maps to existing services)
├── OpenRouter Client (LLM integration)
└── Prompts (system instructions)
```

## Tool Definitions

### Itinerary Tools
- `get_itinerary` - Get current itinerary state
- `get_segment` - Get specific segment details
- `add_flight` - Add flight segment
- `add_hotel` - Add accommodation
- `add_activity` - Add activity/tour
- `add_transfer` - Add ground transport
- `add_meeting` - Add meeting/appointment
- `update_segment` - Modify segment
- `delete_segment` - Remove segment
- `move_segment` - Adjust time (cascades)
- `reorder_segments` - Change display order

### Search Tools
- `search_web` - General web search
- `search_flights` - Flight prices (SERP API)
- `search_hotels` - Hotel prices (SERP API)
- `search_transfers` - Transfer options

## Configuration

```typescript
interface TripDesignerConfig {
  apiKey: string;              // OpenRouter API key
  model?: string;              // Default: claude-3.5-sonnet:online
  serpApiKey?: string;         // For search tools
  maxTokens?: number;          // Default: 4096
  temperature?: number;        // Default: 0.7
  sessionCostLimit?: number;   // Default: $2.00
  streaming?: boolean;         // Default: false
  compactionThreshold?: number; // Default: 0.8
}
```

## Session Lifecycle

1. **Create**: `createSession(itineraryId)`
2. **Active**: Exchange messages via `chat()`
3. **Auto-compact**: When context > 80% of limit
4. **Idle**: No activity for 30 min (stays in memory)
5. **Archive**: No activity for 24 hours (persists to disk)

## Trip Profile

Extracted automatically from conversation:

```typescript
interface TripProfile {
  travelers: { count: number; ages?: number[]; relationships?: string };
  budget?: { total?: number; currency?: string; flexibility?: string };
  travelStyle?: string[];
  accommodationPreference?: string;
  pacePreference?: 'packed' | 'balanced' | 'leisurely';
  dietaryRestrictions?: string[];
  mobilityNeeds?: string[];
  interests?: string[];
  mustSee?: string[];
  avoidances?: string[];
  extractedAt: Date;
  confidence: number; // 0-1
}
```

## Response Format

```typescript
interface AgentResponse {
  message: string;                    // Natural language response
  structuredQuestions?: StructuredQuestion[];
  itineraryUpdated?: boolean;
  segmentsModified?: SegmentId[];
  toolCallsMade?: ToolCall[];
  suggestedActions?: SuggestedAction[];
  tripProfileUpdated?: boolean;
}
```

## Error Handling

```typescript
type TripDesignerError =
  | { type: 'session_not_found'; sessionId: SessionId }
  | { type: 'itinerary_not_found'; itineraryId: ItineraryId }
  | { type: 'tool_execution_failed'; tool: string; error: string }
  | { type: 'llm_api_error'; error: string; retryable: boolean }
  | { type: 'context_limit_exceeded'; tokens: number; limit: number }
  | { type: 'invalid_tool_call'; tool: string; validation: string }
  | { type: 'cost_limit_exceeded'; cost: number; limit: number }
  | { type: 'rate_limit_exceeded'; retryAfter?: number };
```

## Testing

```typescript
// Mock services for testing
const mockItineraryService = {
  get: vi.fn(),
  update: vi.fn(),
};

const tripDesigner = new TripDesignerService(
  { apiKey: 'test-key' },
  new InMemorySessionStorage(),
  { itineraryService: mockItineraryService }
);
```

## Cost Management

Track and limit costs:
```typescript
const stats = tripDesigner.getStats();
console.log(stats.activeSessions); // Number of active sessions

// Cleanup idle sessions
const cleaned = await tripDesigner.cleanupIdleSessions();
console.log(`Cleaned ${cleaned} idle sessions`);
```

## Best Practices

1. **Create one session per planning conversation**
2. **Cleanup idle sessions periodically** (every 30 minutes)
3. **Set cost limits** to prevent runaway costs
4. **Provide services** for tool execution to work
5. **Handle structured questions** in your UI
6. **Refresh itinerary** when `itineraryUpdated` is true

## Security

- Rate limiting: Max 20 messages/min per session
- Input validation on all tool parameters
- API keys in environment variables
- No logging of full message content

## Future Enhancements

- [ ] Multi-traveler preferences
- [ ] Budget optimization
- [ ] Voice interface
- [ ] Collaborative planning
- [ ] Template library
- [ ] Real-time price alerts
- [ ] Constraint solver

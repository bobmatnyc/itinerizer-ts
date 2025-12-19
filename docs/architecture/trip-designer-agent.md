# Trip Designer Agent Architecture

## Overview

The Trip Designer Agent is a conversational AI assistant that helps users plan trips through natural dialogue. It uses OpenRouter (Claude 3.5 Sonnet or GPT-4o) with web search capabilities to provide intelligent travel planning assistance, updating itineraries in real-time through structured tool calls.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│  (CLI / Web / API Client)                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Chat Request / Response
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              TripDesignerService                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Session Management                                   │   │
│  │ - Message history                                    │   │
│  │ - Trip profile extraction                            │   │
│  │ - Context compaction                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Prompt Engineering                                   │   │
│  │ - System prompt with tools                           │   │
│  │ - Structured question formatting                     │   │
│  │ - Tool call schema definitions                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Tool Execution Router                                │   │
│  │ - Parse tool calls from LLM                          │   │
│  │ - Execute against services                           │   │
│  │ - Format results for LLM                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Tool Calls
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   Tool Definitions                          │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Itinerary Tools  │  │  Search Tools    │                │
│  │ - add_flight     │  │ - search_web     │                │
│  │ - add_hotel      │  │ - search_flights │                │
│  │ - add_activity   │  │ - search_hotels  │                │
│  │ - add_transfer   │  │ - search_xfers   │                │
│  │ - add_meeting    │  └──────────────────┘                │
│  │ - update_segment │                                       │
│  │ - delete_segment │  ┌──────────────────┐                │
│  │ - move_segment   │  │  Query Tools     │                │
│  │ - reorder_segs   │  │ - get_itinerary  │                │
│  │ - get_itinerary  │  │ - get_segment    │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Service Calls
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Existing Services Layer                        │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ SegmentService   │  │ItineraryService  │                │
│  │ - add()          │  │ - get()          │                │
│  │ - update()       │  │ - update()       │                │
│  │ - delete()       │  │ - create()       │                │
│  │ - reorder()      │  └──────────────────┘                │
│  └──────────────────┘                                       │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │DependencyService │  │ External APIs    │                │
│  │ - adjustDepend() │  │ - SERP API       │                │
│  └──────────────────┘  │ - OpenRouter     │                │
│                        └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. TripDesignerService

**Location**: `src/services/trip-designer/trip-designer.service.ts`

Main orchestrator for the conversational agent. Responsibilities:
- Manage chat sessions with message history
- Extract and maintain trip profile from conversation
- Build prompts with tool definitions
- Execute tool calls via existing services
- Format responses with structured questions
- Handle context compaction when limits approached

**Key Methods**:
```typescript
class TripDesignerService {
  // Start a new planning session
  async createSession(itineraryId: ItineraryId): Promise<Result<SessionId, Error>>;

  // Send a message and get agent response
  async chat(sessionId: SessionId, message: string): Promise<Result<AgentResponse, Error>>;

  // Get current session state
  async getSession(sessionId: SessionId): Promise<Result<TripDesignerSession, Error>>;

  // Compact session history when approaching context limits
  async compactSession(sessionId: SessionId): Promise<Result<void, Error>>;
}
```

### 2. Tool Definitions Module

**Location**: `src/services/trip-designer/tools.ts`

OpenRouter-compatible tool definitions that map to existing services. Each tool includes:
- JSON Schema for parameters
- Description for LLM understanding
- Execution handler that calls appropriate service

**Tool Categories**:

#### Itinerary Manipulation Tools
```typescript
// Add segment tools
- add_flight: Add flight with airline, flight number, origin/destination
- add_hotel: Add accommodation with property, location, check-in/out
- add_activity: Add tour/activity with name, location, duration
- add_transfer: Add ground transport between locations
- add_meeting: Add meeting/appointment with attendees

// Segment management tools
- update_segment: Modify existing segment fields
- delete_segment: Remove a segment (with dependency cleanup)
- move_segment: Adjust segment time (cascades to dependents)
- reorder_segments: Change display order
```

#### Query Tools
```typescript
- get_itinerary: Fetch current itinerary state
- get_segment: Get specific segment details
```

#### Search Tools
```typescript
- search_web: OpenRouter's :online search for travel info
- search_flights: SERP API Google Flights search
- search_hotels: SERP API Google Hotels search
- search_transfers: Rome2Rio or SERP for transportation options
```

### 3. Session Management

**Location**: `src/services/trip-designer/session.ts`

Handles conversation state and context management:

```typescript
interface TripDesignerSession {
  id: SessionId;
  itineraryId: ItineraryId;
  messages: Message[];
  tripProfile: TripProfile;
  createdAt: Date;
  lastActiveAt: Date;
  metadata: {
    messageCount: number;
    totalTokens: number;
    lastCompactedAt?: Date;
  };
}

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: Date;
}

interface TripProfile {
  // Demographics
  travelers: {
    count: number;
    ages?: number[];
    relationships?: string; // "family", "couple", "solo", "friends"
  };

  // Budget
  budget?: {
    total?: number;
    currency?: string;
    flexibility?: 'strict' | 'flexible' | 'no_limit';
  };

  // Preferences
  travelStyle?: string[]; // "luxury", "budget", "adventure", "relaxed"
  accommodationPreference?: string; // "hotel", "resort", "airbnb", "hostel"
  pacePreference?: 'packed' | 'balanced' | 'leisurely';

  // Restrictions
  dietaryRestrictions?: string[];
  mobilityNeeds?: string[];
  allergies?: string[];

  // Interests
  interests?: string[]; // "food", "culture", "nature", "shopping", "nightlife"
  mustSee?: string[]; // Specific attractions/experiences
  avoidances?: string[]; // Things to avoid

  // Extracted from conversation
  extractedAt: Date;
  confidence: number; // 0-1 score
}
```

**Context Compaction Strategy**:
- Monitor token usage per message
- When approaching 80% of context window:
  1. Summarize trip profile into structured format
  2. Condense early conversation to key decisions
  3. Keep recent messages (last 5-10) in full
  4. Keep all tool calls and results
  5. Create new system message with compacted context

### 4. Structured Questions

**Location**: Part of `src/domain/types/trip-designer.ts`

When the agent needs specific user input, it returns structured questions for UI rendering:

```typescript
interface StructuredQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'date_range' | 'text';
  question: string;
  context?: string; // Additional explanation
  options?: QuestionOption[];
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  metadata?: Record<string, unknown>;
}

interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

interface AgentResponse {
  message: string; // Natural language response
  structuredQuestions?: StructuredQuestion[];
  itineraryUpdated?: boolean;
  toolCallsMade?: ToolCall[];
  suggestedActions?: SuggestedAction[];
}

interface SuggestedAction {
  type: 'add_flight' | 'search_hotels' | 'view_map' | 'view_budget';
  label: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}
```

**Example Structured Question**:
```json
{
  "id": "accommodation_preference",
  "type": "single_choice",
  "question": "What type of accommodation do you prefer?",
  "context": "This will help me find the best options for your stay.",
  "options": [
    {
      "id": "luxury_hotel",
      "label": "Luxury Hotel",
      "description": "5-star hotels with premium amenities",
      "imageUrl": "/icons/luxury-hotel.svg"
    },
    {
      "id": "boutique_hotel",
      "label": "Boutique Hotel",
      "description": "Unique, design-focused properties",
      "imageUrl": "/icons/boutique-hotel.svg"
    },
    {
      "id": "resort",
      "label": "Resort",
      "description": "All-inclusive properties with activities",
      "imageUrl": "/icons/resort.svg"
    },
    {
      "id": "airbnb",
      "label": "Vacation Rental",
      "description": "Private homes or apartments",
      "imageUrl": "/icons/airbnb.svg"
    }
  ]
}
```

### 5. System Prompt

**Location**: `src/services/trip-designer/prompts.ts`

The system prompt defines the agent's personality and capabilities:

```typescript
export const TRIP_DESIGNER_SYSTEM_PROMPT = `You are an expert travel designer assistant helping users plan their trips through conversation. You have access to tools to manage their itinerary and search for travel information.

## Your Personality
- Friendly, enthusiastic, and knowledgeable about travel
- Proactive in making suggestions with pros/cons
- Detail-oriented but not overwhelming
- Adaptive to user's travel style and budget

## Your Capabilities
1. **Itinerary Management**: Add, update, delete, and reorder segments
2. **Web Search**: Look up current travel information, events, weather
3. **Price Search**: Find flight and hotel prices (SERP API)
4. **Transportation Search**: Find transfer options between locations

## Your Process
1. **Discovery Phase**
   - Ask about trip basics: where, when, who, budget
   - Understand preferences: pace, interests, must-sees
   - Note restrictions: dietary, mobility, time constraints

2. **Planning Phase**
   - Suggest specific options with rationale
   - Use search tools to validate and get current prices
   - Add segments to itinerary as decisions are made
   - Present structured questions for key decisions

3. **Refinement Phase**
   - Review complete itinerary
   - Identify gaps or issues
   - Suggest optimizations
   - Make final adjustments

## Tool Usage Guidelines
- Always get current itinerary state before making changes
- Use web search for factual information (hours, closures, events)
- Use price search before quoting costs
- Add segments immediately when user confirms
- Move segments with cascading to maintain continuity

## Structured Questions
When presenting options, use structured questions for:
- Accommodation type selection
- Activity choices (with images)
- Date/time selection
- Budget preferences (scale)
- Multiple destination selection

Format:
{
  "structuredQuestions": [{
    "type": "single_choice",
    "question": "...",
    "options": [...]
  }]
}

## Response Format
Always respond with:
{
  "message": "Natural language response",
  "structuredQuestions": [...] (if needed),
  "itineraryUpdated": true/false
}

## Important Rules
- Never make assumptions about budget without asking
- Always validate dates and availability with search
- Explain trade-offs when presenting options
- Keep responses conversational, not robotic
- Update itinerary incrementally, not all at once
- Ask clarifying questions before making big changes`;
```

## OpenRouter Integration

### Model Configuration

**Primary Model**: `anthropic/claude-3.5-sonnet:online`
- Context window: 200K tokens
- Tool calling: Native support
- Web search: Built-in via `:online` suffix
- Cost: ~$3/1M input, ~$15/1M output tokens

**Fallback Model**: `openai/gpt-4o`
- Context window: 128K tokens
- Tool calling: Native support
- Web search: Via browsing tool
- Cost: ~$2.50/1M input, ~$10/1M output tokens

### Tool Calling Format

OpenRouter uses the OpenAI function calling format:

```typescript
interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, JSONSchema>;
      required: string[];
    };
  };
}

// Example: add_flight tool
{
  type: 'function',
  function: {
    name: 'add_flight',
    description: 'Add a flight segment to the itinerary',
    parameters: {
      type: 'object',
      properties: {
        airline: {
          type: 'object',
          description: 'Airline information',
          properties: {
            name: { type: 'string' },
            code: { type: 'string' }
          },
          required: ['name', 'code']
        },
        flightNumber: {
          type: 'string',
          description: 'Flight number (e.g., "UA123")'
        },
        origin: {
          type: 'object',
          description: 'Origin airport',
          properties: {
            name: { type: 'string' },
            code: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string' }
          },
          required: ['name', 'code']
        },
        destination: {
          type: 'object',
          description: 'Destination airport',
          properties: {
            name: { type: 'string' },
            code: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string' }
          },
          required: ['name', 'code']
        },
        departureTime: {
          type: 'string',
          format: 'date-time',
          description: 'Departure date and time (ISO 8601)'
        },
        arrivalTime: {
          type: 'string',
          format: 'date-time',
          description: 'Arrival date and time (ISO 8601)'
        },
        price: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            currency: { type: 'string' }
          }
        },
        cabinClass: {
          type: 'string',
          enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']
        }
      },
      required: ['airline', 'flightNumber', 'origin', 'destination', 'departureTime', 'arrivalTime']
    }
  }
}
```

### Streaming Response Handling

Enable streaming for real-time updates:

```typescript
const stream = await openai.chat.completions.create({
  model: 'anthropic/claude-3.5-sonnet:online',
  messages: [...],
  tools: [...],
  stream: true
});

for await (const chunk of stream) {
  // Handle delta updates
  if (chunk.choices[0]?.delta?.content) {
    // Stream text to UI
  }
  if (chunk.choices[0]?.delta?.tool_calls) {
    // Handle tool call streaming
  }
}
```

## SERP API Integration

For real-time price search capabilities:

### Google Flights Search

```typescript
interface FlightSearchParams {
  departure_id: string; // Airport code
  arrival_id: string;
  outbound_date: string; // YYYY-MM-DD
  return_date?: string;
  currency?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
}

const response = await fetch('https://serpapi.com/search', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${SERP_API_KEY}` },
  body: JSON.stringify({
    engine: 'google_flights',
    ...params
  })
});
```

### Google Hotels Search

```typescript
interface HotelSearchParams {
  q: string; // Hotel name or location
  check_in_date: string;
  check_out_date: string;
  adults?: number;
  children?: number;
  currency?: string;
  gl?: string; // Country code
  hl?: string; // Language code
}
```

## Session Storage

Sessions are stored in memory with optional persistence:

```typescript
interface SessionStorage {
  // In-memory for active sessions
  activeSessions: Map<SessionId, TripDesignerSession>;

  // Persistent storage (JSON files)
  async saveSession(session: TripDesignerSession): Promise<void>;
  async loadSession(sessionId: SessionId): Promise<TripDesignerSession | null>;
  async listSessions(itineraryId?: ItineraryId): Promise<SessionSummary[]>;
  async deleteSession(sessionId: SessionId): Promise<void>;
}
```

**Storage Location**: `data/sessions/{sessionId}.json`

**Session Lifecycle**:
1. Create: New session for itinerary
2. Active: Messages exchanged, tools executed
3. Idle: No activity for 30 minutes (stay in memory)
4. Archived: No activity for 24 hours (persist to disk)
5. Expired: No activity for 30 days (eligible for deletion)

## Error Handling

```typescript
type TripDesignerError =
  | { type: 'session_not_found'; sessionId: SessionId }
  | { type: 'itinerary_not_found'; itineraryId: ItineraryId }
  | { type: 'tool_execution_failed'; tool: string; error: string }
  | { type: 'llm_api_error'; error: string; retryable: boolean }
  | { type: 'context_limit_exceeded'; tokens: number; limit: number }
  | { type: 'invalid_tool_call'; tool: string; validation: string };

// Graceful degradation
- LLM API failure → Return cached suggestions
- Tool execution failure → Explain to user, suggest retry
- Context limit → Auto-compact and retry
- Invalid tool call → Ask LLM to retry with correct schema
```

## Cost Management

Track and limit costs per session:

```typescript
interface CostTracking {
  sessionCosts: Map<SessionId, CostMetrics>;

  recordUsage(sessionId: SessionId, usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
  }): void;

  getCostEstimate(sessionId: SessionId): number;

  // Warn at 80% of limit
  checkBudget(sessionId: SessionId, limit: number): boolean;
}
```

**Default Limits**:
- Per session: $2.00
- Per itinerary: $10.00
- Per user (if auth): $50.00/month

## Security Considerations

1. **Input Validation**: Sanitize all user inputs before tool execution
2. **Rate Limiting**: Max 20 messages per minute per session
3. **Tool Access Control**: Verify session owns itinerary before modifications
4. **API Key Management**: Store SERP/OpenRouter keys in environment
5. **PII Protection**: Never log full messages, only metadata
6. **Prompt Injection**: Use OpenRouter's built-in protections

## Testing Strategy

### Unit Tests
- Tool definition parsing
- Session management (create, update, compact)
- Trip profile extraction
- Tool execution routing

### Integration Tests
- Full chat flow with mock LLM responses
- Tool calls executing against real services
- Context compaction with long conversations
- Structured question formatting

### E2E Tests
- Complete trip planning conversation
- Error recovery scenarios
- Multi-turn conversations with tool usage
- Streaming response handling

### Load Tests
- Multiple concurrent sessions
- Token usage under load
- Session storage performance

## Future Enhancements

1. **Multi-Traveler Support**: Different preferences per traveler
2. **Budget Optimization**: Suggest cheaper alternatives
3. **Smart Suggestions**: ML-based recommendations
4. **Voice Interface**: Audio input/output
5. **Collaborative Planning**: Multiple users editing same trip
6. **Template Library**: Pre-built itineraries to customize
7. **Constraint Solver**: Optimize itinerary given constraints
8. **Real-time Updates**: Push notifications for price changes

## File Structure

```
src/services/trip-designer/
├── trip-designer.service.ts       # Main service orchestrator
├── tools.ts                       # Tool definitions and handlers
├── session.ts                     # Session management
├── prompts.ts                     # System prompts
├── search.service.ts              # SERP API integration
├── context-compactor.ts           # Context compression
└── profile-extractor.ts           # Extract trip profile from messages

src/domain/types/
└── trip-designer.ts               # TypeScript types

tests/services/trip-designer/
├── trip-designer.service.test.ts
├── tools.test.ts
├── session.test.ts
└── integration.test.ts

data/sessions/                     # Session storage
└── {sessionId}.json
```

## Implementation Phases

### Phase 1: Core Infrastructure (Current)
- [x] Architecture design
- [ ] Type definitions
- [ ] Tool definitions
- [ ] Session management
- [ ] Basic TripDesignerService

### Phase 2: Tool Integration
- [ ] Map tools to existing services
- [ ] Tool execution handlers
- [ ] Error handling
- [ ] Unit tests

### Phase 3: LLM Integration
- [ ] OpenRouter client setup
- [ ] Streaming support
- [ ] Context compaction
- [ ] Cost tracking

### Phase 4: Search Integration
- [ ] SERP API flights
- [ ] SERP API hotels
- [ ] Rome2Rio transfers
- [ ] Web search (OpenRouter)

### Phase 5: Enhanced UX
- [ ] Structured questions
- [ ] Suggested actions
- [ ] Trip profile extraction
- [ ] Multi-turn conversation flow

### Phase 6: Production Ready
- [ ] Integration tests
- [ ] E2E tests
- [ ] Error recovery
- [ ] Documentation
- [ ] CLI integration

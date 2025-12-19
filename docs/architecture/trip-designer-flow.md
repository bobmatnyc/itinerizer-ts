# Trip Designer Agent - Conversation Flow

## Complete Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│  (CLI / Web / API Client)                                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 1. Create Session
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TripDesignerService                              │
│                                                                     │
│  createSession(itineraryId)                                         │
│      │                                                              │
│      ├──► SessionManager.createSession()                           │
│      │       └──► Generate SessionId                               │
│      │       └──► Initialize empty TripProfile                     │
│      │       └──► Store in SessionStorage                          │
│      │                                                              │
│      └──► Return SessionId                                          │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 2. User Message
                               │ "Plan a week in Paris for my family"
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TripDesignerService                              │
│                                                                     │
│  chat(sessionId, userMessage)                                       │
│      │                                                              │
│      ├──► SessionManager.getSession(sessionId)                     │
│      │       └──► Load conversation history                        │
│      │                                                              │
│      ├──► SessionManager.addMessage(user, message)                 │
│      │       └──► Append to message history                        │
│      │                                                              │
│      ├──► Check if compaction needed (>80% tokens)                 │
│      │       └──► If yes: compactSession()                         │
│      │                                                              │
│      └──► buildMessages(session)                                    │
│              └──► System prompt + conversation history             │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 3. LLM Request with Tools
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OpenRouter API                                   │
│  (Claude 3.5 Sonnet :online)                                        │
│                                                                     │
│  Request:                                                           │
│    model: "anthropic/claude-3.5-sonnet:online"                     │
│    messages: [system, ...history, user]                            │
│    tools: [15 tool definitions]                                     │
│                                                                     │
│  Processing:                                                        │
│    ├──► Understand user intent                                     │
│    ├──► Check if web search needed                                 │
│    │     └──► :online suffix enables search                        │
│    ├──► Determine which tools to call                              │
│    └──► Generate response                                           │
│                                                                     │
│  Response:                                                          │
│    message: "Great! Let me help plan your Paris trip..."           │
│    tool_calls: [                                                    │
│      {                                                              │
│        id: "call_1",                                                │
│        function: {                                                  │
│          name: "get_itinerary",                                     │
│          arguments: "{}"                                            │
│        }                                                            │
│      },                                                             │
│      {                                                              │
│        id: "call_2",                                                │
│        function: {                                                  │
│          name: "search_hotels",                                     │
│          arguments: "{\"location\": \"Paris\", ...}"               │
│        }                                                            │
│      }                                                              │
│    ]                                                                │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 4. Tool Call Execution
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ToolExecutor                                     │
│                                                                     │
│  For each tool_call:                                                │
│                                                                     │
│    execute(context) {                                               │
│      const args = JSON.parse(arguments)                            │
│                                                                     │
│      switch (name) {                                                │
│        case 'get_itinerary':                                        │
│          ├──► itineraryService.get(itineraryId)                    │
│          └──► Return current itinerary state                       │
│                                                                     │
│        case 'search_hotels':                                        │
│          ├──► serpApi.searchHotels(params)  [PLACEHOLDER]          │
│          └──► Return hotel results                                 │
│                                                                     │
│        case 'add_flight':                                           │
│          ├──► Build FlightSegment from args                        │
│          ├──► segmentService.add(itineraryId, segment)             │
│          └──► Return { success, segmentId }                        │
│                                                                     │
│        case 'move_segment':                                         │
│          ├──► Get current segment                                   │
│          ├──► Calculate time delta                                  │
│          ├──► dependencyService.adjustDependentSegments()          │
│          └──► Update all affected segments                         │
│      }                                                              │
│    }                                                                │
│                                                                     │
│  Results: [                                                         │
│    { toolCallId: "call_1", success: true, result: {...} },        │
│    { toolCallId: "call_2", success: true, result: {...} }         │
│  ]                                                                  │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 5. Second LLM Call with Results
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OpenRouter API                                   │
│                                                                     │
│  Request:                                                           │
│    messages: [                                                      │
│      ...previous,                                                   │
│      assistant: { content: "...", tool_calls: [...] },            │
│      tool: { tool_call_id: "call_1", content: "{...}" },          │
│      tool: { tool_call_id: "call_2", content: "{...}" }           │
│    ]                                                                │
│                                                                     │
│  Processing:                                                        │
│    ├──► Analyze tool results                                       │
│    ├──► Format natural language response                           │
│    └──► Optionally include structured questions                    │
│                                                                     │
│  Response:                                                          │
│    message: "I found several great hotels in Paris. Here are       │
│             my top recommendations..."                              │
│                                                                     │
│    [May include structured questions JSON]                          │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 6. Format Response
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TripDesignerService                              │
│                                                                     │
│  ├──► Parse structured questions from message                      │
│  ├──► Record message with token usage                              │
│  ├──► Update session metadata                                      │
│  └──► Build AgentResponse {                                        │
│         message: "Natural language response",                      │
│         structuredQuestions: [...],                                │
│         itineraryUpdated: true/false,                              │
│         segmentsModified: [segmentId, ...],                        │
│         toolCallsMade: [...]                                        │
│      }                                                              │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 7. Return to User
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│                                                                     │
│  ├──► Display agent message                                        │
│  ├──► Render structured questions (if any)                         │
│  └──► Refresh itinerary display (if updated)                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Example Conversation Flow

### Turn 1: Discovery

**User**: "I'm planning a week in Paris for my family in June. We love food and history."

**Agent Actions**:
1. Extract profile: 4 travelers, interests=[food, history], destination=Paris
2. No tools called (just discovery)
3. Ask follow-up questions

**Agent Response**:
```json
{
  "message": "Wonderful! Paris is perfect for food and history lovers. A few questions to help me plan:\n- How many people are traveling?\n- What's your approximate budget?\n- Do you prefer a hotel or vacation rental?",
  "structuredQuestions": [{
    "type": "single_choice",
    "question": "What type of accommodation do you prefer?",
    "options": [
      {"id": "hotel", "label": "Hotel", "description": "Traditional hotel with services"},
      {"id": "boutique", "label": "Boutique Hotel", "description": "Unique, design-focused"},
      {"id": "rental", "label": "Vacation Rental", "description": "Private apartment"}
    ]
  }]
}
```

### Turn 2: Hotel Booking

**User**: "We prefer a boutique hotel in a central location. Budget is $5,000 for accommodations."

**Agent Actions**:
1. Tool call: `search_hotels` (location: Paris, dates: June, budget: $5000)
2. Tool call: `get_itinerary` (check current state)
3. Present options

**Agent Response**:
```json
{
  "message": "Perfect! I found 3 excellent boutique hotels:\n\n**Hotel Henriette** - $3,200 for 7 nights\n- Pros: Latin Quarter, walkable to Notre Dame\n- Cons: Smaller rooms\n\n**Hotel Providence** - $4,100 for 7 nights\n- Pros: Near Canal St-Martin, great restaurants\n- Cons: Slightly off main tourist area\n\n**Hotel Fabric** - $3,800 for 7 nights\n- Pros: Le Marais, trendy neighborhood\n- Cons: Can be busy\n\nWhich appeals to you?",
  "toolCallsMade": [
    {"function": {"name": "search_hotels", ...}},
    {"function": {"name": "get_itinerary", ...}}
  ]
}
```

### Turn 3: Confirm and Add

**User**: "Hotel Fabric looks great! Let's book that one."

**Agent Actions**:
1. Tool call: `add_hotel` (property: Hotel Fabric, dates: June 15-22)
2. Tool call: `get_itinerary` (verify addition)

**Agent Response**:
```json
{
  "message": "Excellent choice! I've added Hotel Fabric to your itinerary (June 15-22, 7 nights, $3,800).\n\nNow, let's plan some activities. Since you love food and history, I recommend:\n- Private food tour in Le Marais\n- Skip-the-line Louvre tickets\n- Evening Seine river cruise\n\nShould I add these?",
  "itineraryUpdated": true,
  "segmentsModified": ["seg_hotel_fabric_123"],
  "toolCallsMade": [
    {"function": {"name": "add_hotel", ...}},
    {"function": {"name": "get_itinerary", ...}}
  ]
}
```

## Data Flow Diagram

```
Session State Evolution
━━━━━━━━━━━━━━━━━━━━

Turn 0 (Initial):
┌──────────────────┐
│ TripProfile      │
│ - travelers: 1   │
│ - confidence: 0  │
│                  │
│ Messages: []     │
│ Segments: []     │
└──────────────────┘

Turn 1 (Discovery):
┌──────────────────┐
│ TripProfile      │
│ - travelers: 4   │
│ - interests:     │
│   [food, history]│
│ - confidence: 0.5│
│                  │
│ Messages: [      │
│   user: "...",   │
│   assistant: "..." │
│ ]                │
│ Segments: []     │
└──────────────────┘

Turn 2 (Search):
┌──────────────────┐
│ TripProfile      │
│ - travelers: 4   │
│ - budget: $5000  │
│ - accommodation: │
│   "boutique"     │
│ - confidence: 0.7│
│                  │
│ Messages: [      │
│   ... (4 msgs)   │
│ ]                │
│ Segments: []     │
└──────────────────┘

Turn 3 (Booking):
┌──────────────────┐
│ TripProfile      │
│ - travelers: 4   │
│ - budget: $5000  │
│ - accommodation: │
│   "boutique"     │
│ - confidence: 0.9│
│                  │
│ Messages: [      │
│   ... (6 msgs)   │
│ ]                │
│ Segments: [      │
│   {type: HOTEL,  │
│    name: "Hotel  │
│    Fabric"}      │
│ ]                │
└──────────────────┘
```

## Context Compaction Flow

When session exceeds 80% of context window (160K tokens):

```
Before Compaction:
┌─────────────────────────────┐
│ Messages (50 turns)         │
│ ├─ Turn 1-10: Discovery     │
│ ├─ Turn 11-20: Hotels       │
│ ├─ Turn 21-30: Activities   │
│ ├─ Turn 31-40: Flights      │
│ └─ Turn 41-50: Refinement   │
│                             │
│ Total: 180K tokens          │
└─────────────────────────────┘

Compaction Process:
1. Summarize turns 1-40 into TripProfile
2. Keep full turns 41-50 (recent)
3. Keep all tool calls/results
4. Create compacted system message

After Compaction:
┌─────────────────────────────┐
│ Messages (Compacted)        │
│ ├─ System: "Trip summary:   │
│ │   - 4 travelers           │
│ │   - Paris, June 15-22     │
│ │   - Budget: $5000         │
│ │   - Booked: Hotel Fabric" │
│ ├─ Tool Calls: [...]        │
│ └─ Recent (41-50): [...]    │
│                             │
│ Total: 60K tokens           │
└─────────────────────────────┘
```

## Error Recovery Flow

```
Normal Flow:                   Error Flow:
─────────────                 ────────────

chat()                        chat()
  │                             │
  ├─► LLM call                  ├─► LLM call
  │   ├─ Success                │   └─ ERROR (rate limit)
  │   └─► Tool execution        │
  │       ├─ Success            ├─► Return TripDesignerError {
  │       └─► Return response   │     type: 'rate_limit_exceeded',
  │                             │     retryAfter: 60
                               │   }
                               │
                               ▼
                            UI shows:
                            "Rate limit reached.
                             Retry in 60 seconds."

                               ▼
                            User waits

                               ▼
                            Retry chat()
                            ├─► Load session (preserved)
                            └─► Continue from last message
```

## Performance Optimization Points

1. **Session Caching**: Active sessions in memory, idle → disk
2. **Tool Call Batching**: Execute multiple tools in parallel
3. **Response Streaming**: Stream tokens as they arrive (not yet implemented)
4. **Context Compaction**: Auto-trigger at 80% to avoid hitting limit
5. **Tool Result Caching**: Cache search results for 5 minutes

## Future: Multi-Session Support

```
User has multiple trips:

┌─────────────────────────────────────────┐
│ User's Sessions                         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Session 1: Paris Trip               │ │
│ │ - Itinerary: itin_paris_123         │ │
│ │ - Status: Active                    │ │
│ │ - Last active: 5 min ago            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Session 2: Tokyo Trip               │ │
│ │ - Itinerary: itin_tokyo_456         │ │
│ │ - Status: Idle                      │ │
│ │ - Last active: 2 hours ago          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Session 3: NYC Trip                 │ │
│ │ - Itinerary: itin_nyc_789           │ │
│ │ - Status: Archived                  │ │
│ │ - Last active: 3 days ago           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

User can resume any session by ID.

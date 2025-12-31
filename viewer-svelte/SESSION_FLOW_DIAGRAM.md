# Session Management Flow Diagrams

## 1. Itinerary Switch Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action                               │
│  Click different itinerary in sidebar OR                     │
│  Click "Edit With AI Trip Designer" button                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            selectItinerary(newId) called                     │
│  Updates: $selectedItinerary store                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         ChatPanel $effect() Detects Change                   │
│  if (itineraryId !== previousItineraryId)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  resetChat()                                 │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Clear ALL state:                                │        │
│  │ • chatSessionId = null                          │        │
│  │ • chatMessages = []                             │        │
│  │ • structuredQuestions = null                    │        │
│  │ • streamingContent = ''                         │        │
│  │ • sessionTokens = { input: 0, output: 0 }       │        │
│  │ • sessionCost = { input: 0, output: 0 }         │        │
│  │ • pendingPrompt = null                          │        │
│  │ • chatError = null                              │        │
│  └─────────────────────────────────────────────────┘        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│       createChatSession(itineraryId, 'trip-designer')        │
│  POST /api/v1/designer/sessions                             │
│  → Returns: { sessionId: "uuid-xyz" }                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Update previousItineraryId                        │
│  previousItineraryId = itineraryId                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                sendInitialContext()                          │
│  Build context string from:                                  │
│  • Current date                                              │
│  • User preferences (name, home airport)                     │
│  • Itinerary details (title, dates, duration, segments)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│     sendContextMessage("Context: ...")                       │
│  • User message NOT added to visible chat                    │
│  • AI processes context in background                        │
│  • Only AI response shown to user                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Fresh Session Ready                            │
│  ✅ Clean chat UI (no old messages)                         │
│  ✅ AI has context about current itinerary                  │
│  ✅ Token/cost tracking reset to 0                          │
│  ✅ Ready for new conversation                              │
└─────────────────────────────────────────────────────────────┘
```

## 2. Initial Context Building

```
┌─────────────────────────────────────────────────────────────┐
│              sendInitialContext() Function                   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│  User Settings   │    │  Selected Itinerary  │
│  (from store)    │    │  (from store)        │
└────────┬─────────┘    └──────────┬───────────┘
         │                         │
         │                         │
         ▼                         ▼
┌────────────────────────────────────────────┐
│        Build Context Parts Array           │
│  contextParts = [                          │
│    "Today's date is Dec 22, 2024",         │
│    "My name is Sarah",                     │
│    "My home airport is SFO",               │
│    'Working on itinerary: "Japan Trip"',   │
│    "Trip dates: Mar 15 to Mar 30 (15d)",   │
│    "Description: Cherry blossoms",         │
│    "Trip type: leisure",                   │
│    "Current itinerary has 12 segments"     │
│  ]                                         │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│      Join and Send to AI                   │
│  contextMessage = contextParts.join(' ')   │
│  sendContextMessage(`Context: ${...}`)     │
└────────────────────────────────────────────┘
```

## 3. Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        UI Layer                               │
│  ┌────────────────┐         ┌──────────────────┐            │
│  │ Itineraries    │         │   ChatPanel      │            │
│  │   Sidebar      │────────▶│   Component      │            │
│  │                │  Click  │                  │            │
│  └────────────────┘         └────────┬─────────┘            │
└────────────────────────────────────────┼─────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────┐
│                      Store Layer                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ itineraries  │    │     chat     │    │   settings   │   │
│  │    store     │    │    store     │    │    store     │   │
│  │              │    │              │    │              │   │
│  │ • selected   │    │ • sessionId  │    │ • name       │   │
│  │ • list       │    │ • messages   │    │ • homeAir..  │   │
│  │ • loading    │    │ • tokens     │    │ • apiKey     │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
└────────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                      API Layer                                │
│  ┌──────────────────────────────────────────────────┐        │
│  │            apiClient.createChatSession()          │        │
│  │  POST /api/v1/designer/sessions                  │        │
│  │  Body: { itineraryId, mode: 'trip-designer' }    │        │
│  │  Headers: { X-OpenRouter-API-Key }               │        │
│  └──────────────────────────────────────────────────┘        │
└────────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                    Backend Layer                              │
│  ┌────────────────────────────────────────────────┐          │
│  │  Trip Designer Service                         │          │
│  │  • Creates session with itineraryId            │          │
│  │  • Loads itinerary data from storage           │          │
│  │  • Returns sessionId                           │          │
│  └────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

## 4. State Transitions

```
┌─────────────┐
│   Initial   │  No itinerary selected
│    State    │  sessionId = null
└──────┬──────┘  messages = []
       │
       │ User selects itinerary A
       ▼
┌─────────────┐
│  Session A  │  sessionId = "abc-123"
│   Active    │  messages = [msg1, msg2, ...]
└──────┬──────┘  tokens = 1500
       │
       │ User switches to itinerary B
       ▼
┌─────────────┐
│  Resetting  │  resetChat() called
│    State    │  All stores clearing...
└──────┬──────┘  (transition state)
       │
       │ New session created
       ▼
┌─────────────┐
│  Session B  │  sessionId = "def-456"
│   Active    │  messages = [] (fresh)
└──────┬──────┘  tokens = 0 (reset)
       │
       │ sendInitialContext()
       ▼
┌─────────────┐
│  Session B  │  sessionId = "def-456"
│  with       │  messages = [AI greeting]
│  Context    │  (AI knows about itinerary B)
└─────────────┘
```

## 5. Session Isolation

```
Itinerary A              Itinerary B              Itinerary C
┌──────────┐            ┌──────────┐            ┌──────────┐
│ Session  │            │ Session  │            │ Session  │
│ abc-123  │            │ def-456  │            │ ghi-789  │
│          │            │          │            │          │
│ Messages:│            │ Messages:│            │ Messages:│
│ • User 1 │            │ • User 1 │            │ • User 1 │
│ • AI 1   │            │ • AI 1   │            │ • AI 1   │
│ • User 2 │            │ • User 2 │            │          │
│ • AI 2   │            │          │            │          │
│          │            │          │            │          │
│ Tokens:  │            │ Tokens:  │            │ Tokens:  │
│ 3,500    │            │ 1,200    │            │ 800      │
│          │            │          │            │          │
│ Context: │            │ Context: │            │ Context: │
│ "Tokyo"  │            │ "Paris"  │            │ "NYC"    │
└──────────┘            └──────────┘            └──────────┘
     ▲                       ▲                       ▲
     │                       │                       │
     └───────────────────────┴───────────────────────┘
              Completely Isolated Sessions
              No cross-contamination of:
              • Messages
              • Context
              • Token counts
              • Session state
```

## Key Points

1. **Automatic**: Session reset happens automatically on itinerary change
2. **Complete**: All state is cleared (messages, tokens, questions, etc.)
3. **Fresh Context**: Each itinerary gets its own context message
4. **Isolated**: Sessions don't interfere with each other
5. **Traceable**: Console logs show exactly what's happening

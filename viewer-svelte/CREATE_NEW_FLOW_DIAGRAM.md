# Create New Itinerary - Session Flow

## BEFORE (Bug)

```
User clicks "Create New"
        ↓
handleBuildClick() executes
        ↓
Create new itinerary
        ↓
Select new itinerary ← ⚠️ Old chat session STILL ACTIVE
        ↓
Switch to chat view
        ↓
ChatPanel displays
        ↓
❌ USER SEES OLD MESSAGES from previous itinerary
```

## AFTER (Fixed)

```
User clicks "Create New"
        ↓
handleBuildClick() executes
        ↓
Create new itinerary
        ↓
✨ resetChat() ← Clears all session state
   - chatSessionId = null
   - chatMessages = []
   - pendingPrompt = null
   - structuredQuestions = null
   - All streaming state reset
        ↓
Select new itinerary
        ↓
Switch to chat view
        ↓
ChatPanel.onMount() executes
        ↓
Creates NEW session for new itinerary
        ↓
Sends fresh initial context
        ↓
✅ USER SEES EMPTY CHAT (fresh start)
```

## Key Improvement

The `resetChat()` call ensures that:
1. No session ID is retained
2. No messages are visible from previous trip
3. No pending prompts or questions linger
4. Fresh context is sent for the new itinerary

This creates a clean separation between different trip planning sessions.

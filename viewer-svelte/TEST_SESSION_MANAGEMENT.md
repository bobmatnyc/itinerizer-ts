# Test Plan: Itinerary Session Management

## Overview
Testing the implementation of automatic session reset when switching itineraries and proper context passing to the AI.

## Prerequisites
- OpenRouter API key configured in Profile settings
- At least 2 different itineraries in the system
- Browser console open to view debug logs

## Test Cases

### Test 1: Switch Between Itineraries with Active Chat

**Steps**:
1. Open app and navigate to an itinerary
2. Click "Edit With AI Trip Designer" button
3. Send a message (e.g., "What's in this itinerary?")
4. Wait for AI response
5. Click on a DIFFERENT itinerary in the sidebar
6. Check the chat panel

**Expected Results**:
- ✅ Chat panel clears completely (no messages visible)
- ✅ Console shows: `[ChatPanel] Itinerary changed - resetting session`
- ✅ Console shows: `[ChatPanel] New session created for itinerary: [id]`
- ✅ Console shows: `[ChatPanel] Sending initial context: [context details]`
- ✅ Token/cost stats reset to 0
- ✅ No structured questions from previous itinerary

**Console Log Example**:
```
[ChatPanel] Itinerary changed - resetting session: {
  hasKey: true,
  oldItinerary: "abc-123",
  newItinerary: "def-456"
}
[ChatPanel] New session created for itinerary: def-456
[ChatPanel] Sending initial context: Today's date is Sunday, December 22, 2024. My name is John...
```

---

### Test 2: Click "Edit With AI" Button

**Steps**:
1. View an itinerary in detail view
2. Click "Edit With AI Trip Designer" button
3. Verify chat panel activates

**Expected Results**:
- ✅ Chat panel becomes active
- ✅ If switching itineraries, session resets
- ✅ Initial context sent with itinerary details
- ✅ Console shows context includes: title, dates, duration, segment count

---

### Test 3: Create New Blank Itinerary

**Steps**:
1. Click "Create New" button
2. New itinerary created and selected
3. Switch to Chat tab

**Expected Results**:
- ✅ Session created for new itinerary
- ✅ Context message includes: "Itinerary is currently empty and ready to be planned"
- ✅ AI responds appropriately to empty itinerary state

---

### Test 4: Context Includes Proper Details

**Steps**:
1. Create/select an itinerary with:
   - Title: "Summer Vacation"
   - Description: "Beach trip"
   - Dates: July 1-15, 2025
   - Trip type: "leisure"
   - 5 segments added
2. Click "Edit With AI"
3. Check console for context message

**Expected Context Content**:
```
Today's date is [current date].
Working on itinerary: "Summer Vacation".
Trip dates: July 1, 2025 to July 15, 2025 (14 days).
Description: Beach trip
Trip type: leisure.
Current itinerary has 5 segments planned.
```

**Verify**:
- ✅ All fields present
- ✅ Duration calculated correctly
- ✅ Segment count accurate
- ✅ If user profile has name/home airport, included

---

### Test 5: Rapid Itinerary Switching

**Steps**:
1. Click itinerary A → wait 1 second
2. Click itinerary B → wait 1 second
3. Click itinerary C → wait 1 second
4. Click back to itinerary A

**Expected Results**:
- ✅ Each switch triggers session reset
- ✅ No error messages
- ✅ Final itinerary (A) has correct context
- ✅ No messages from previous itineraries visible

---

### Test 6: Session Persistence Within Same Itinerary

**Steps**:
1. Select an itinerary
2. Send message 1 to AI
3. Get response
4. Send message 2 to AI
5. Get response
6. Switch to "Detail" tab
7. Switch back to "Chat" tab

**Expected Results**:
- ✅ All messages remain visible
- ✅ Session NOT reset (same itinerary)
- ✅ Context NOT re-sent
- ✅ Can continue conversation

---

### Test 7: Past Dates Detection

**Steps**:
1. Create/edit itinerary with past dates (e.g., Jan 1-10, 2024)
2. Click "Edit With AI"

**Expected Results**:
- ✅ Modal appears asking about past dates
- ✅ Three options shown:
  - Update to next year
  - Choose different dates
  - Cancel planning
- ✅ Session waits until user chooses

---

### Test 8: Empty vs Populated Itinerary Context

**Steps**:
1. Create blank itinerary → Check context
2. Add 1 segment → Switch away and back → Check context
3. Add 4 more segments → Switch away and back → Check context

**Expected Context Evolution**:
- Blank: "Itinerary is currently empty and ready to be planned"
- 1 segment: "Current itinerary has 1 segment planned"
- 5 segments: "Current itinerary has 5 segments planned"

---

### Test 9: No API Key Handling

**Steps**:
1. Clear API key from Profile settings
2. Select an itinerary
3. Click "Edit With AI"

**Expected Results**:
- ✅ Error message shown: "No OpenRouter API key configured..."
- ✅ Chat input disabled
- ✅ No session created

---

### Test 10: Token/Cost Reset Between Itineraries

**Steps**:
1. Select itinerary A
2. Have conversation (multiple messages)
3. Note token count and cost at bottom
4. Switch to itinerary B

**Expected Results**:
- ✅ Token count resets to 0
- ✅ Cost resets to $0.0000
- ✅ Stats bar may disappear until new messages sent

---

## Debugging Tips

### Console Logs to Watch For

**Successful Flow**:
```
[ChatPanel] Itinerary changed - resetting session
[ChatPanel] New session created for itinerary: [id]
[ChatPanel] Sending initial context: [full context]
```

**Error Flow**:
```
Failed to reset chat for new itinerary: [error]
```

### What to Check If Tests Fail

1. **Session not resetting**:
   - Check `previousItineraryId` is being tracked
   - Verify `itineraryId` prop is changing
   - Check console for error messages

2. **Context not sent**:
   - Verify `$chatMessages.length === 0` after reset
   - Check `$selectedItinerary` is populated
   - Look for "Skipping context" message

3. **Wrong context details**:
   - Check `ItineraryListItem` has expected fields
   - Verify data types match (string vs number)
   - Check for undefined/null values

## Success Criteria

All tests pass with:
- ✅ Clean session resets
- ✅ Proper context sent
- ✅ No stale data
- ✅ Appropriate console logging
- ✅ Good user experience (smooth transitions)

## Manual Verification

After automated tests, verify:
1. AI responds with knowledge of current itinerary
2. AI doesn't reference previous itinerary details
3. Token counts are accurate per session
4. No memory leaks or performance issues

# Quick Responses - Testing Guide

## Manual Testing Checklist

### Setup
1. Start the dev server: `npm run dev`
2. Navigate to http://localhost:5176
3. Log in or use demo mode
4. Create or open an itinerary
5. Open Trip Designer chat

### Test Cases

#### ✅ Test 1: Basic Question Detection
**Steps:**
1. Send a message that triggers the AI to ask a follow-up question
2. Example: "I want to visit Croatia"
3. Wait for AI response ending with "?"

**Expected:**
- Quick response buttons appear below the AI message
- Buttons match the question context
- Text input remains available

**Screenshot location:** `qa-screenshots/quick-responses-basic.png`

---

#### ✅ Test 2: Action Extraction
**Steps:**
1. Trigger a message like: "Would you like me to elaborate on these suggestions or help you book hotels?"

**Expected:**
- Specific action buttons: "Elaborate on suggestions", "Help book hotels"
- Generic buttons: "Yes, please", "No thanks"
- All buttons styled correctly by category

**Screenshot location:** `qa-screenshots/quick-responses-actions.png`

---

#### ✅ Test 3: Click Response
**Steps:**
1. See quick responses
2. Click one of the buttons (e.g., "Yes, please")

**Expected:**
- Message input fills with selected text
- Message sends automatically
- Quick responses disappear
- AI processes the response

**Screenshot location:** `qa-screenshots/quick-responses-click.png`

---

#### ✅ Test 4: Disabled State
**Steps:**
1. Click a quick response button
2. While AI is processing (loading state)
3. Try to click another quick response

**Expected:**
- Buttons are visually disabled during loading
- Clicks are ignored during loading
- Buttons re-enable after response completes

**Screenshot location:** `qa-screenshots/quick-responses-disabled.png`

---

#### ✅ Test 5: No Responses for Statements
**Steps:**
1. Trigger AI to make a statement (not a question)
2. Example: AI completes an action and says "I've updated your itinerary."

**Expected:**
- No quick responses shown
- Only regular message and input visible

**Screenshot location:** `qa-screenshots/quick-responses-none.png`

---

#### ✅ Test 6: Structured Questions Take Priority
**Steps:**
1. Trigger structured questions (e.g., date picker, city selection)

**Expected:**
- Structured question UI shows
- NO quick responses buttons (they should be hidden)
- User interacts with structured UI instead

**Screenshot location:** `qa-screenshots/quick-responses-vs-structured.png`

---

#### ✅ Test 7: Custom Text Input Still Works
**Steps:**
1. See quick responses
2. Ignore them and type custom response in text field
3. Press Enter to send

**Expected:**
- Custom text is sent
- Quick responses don't interfere
- AI processes custom response normally

**Screenshot location:** `qa-screenshots/quick-responses-custom-text.png`

---

#### ✅ Test 8: Multiple Messages
**Steps:**
1. Have a conversation with multiple AI responses
2. Check which messages show quick responses

**Expected:**
- Only the LAST AI message shows quick responses
- Previous messages don't show quick responses
- Quick responses update as new messages arrive

**Screenshot location:** `qa-screenshots/quick-responses-multiple.png`

---

#### ✅ Test 9: Mobile Responsive
**Steps:**
1. Open DevTools
2. Switch to mobile viewport (375px width)
3. Trigger quick responses

**Expected:**
- Buttons wrap properly on small screens
- Touch targets are adequate (min 44px)
- Text doesn't overflow
- Still usable on mobile

**Screenshot location:** `qa-screenshots/quick-responses-mobile.png`

---

#### ✅ Test 10: Accessibility
**Steps:**
1. Use keyboard only (Tab, Enter)
2. Navigate to quick response buttons
3. Press Enter to select

**Expected:**
- Buttons are keyboard accessible
- Focus styles are visible
- Enter key activates button
- Screen reader announces button text

**Screenshot location:** `qa-screenshots/quick-responses-a11y.png`

---

## Edge Cases

### Edge Case 1: Empty Response Array
**Scenario:** AI sends a question that doesn't match any pattern

**Expected:** Show default responses (Yes/No/Tell me more)

### Edge Case 2: Very Long Button Text
**Scenario:** Action extraction creates a very long button label

**Expected:** Text wraps or truncates gracefully, button remains clickable

### Edge Case 3: Rapid Clicking
**Scenario:** User rapidly clicks multiple quick response buttons

**Expected:** Only first click registers, subsequent clicks ignored during loading

### Edge Case 4: Network Interruption
**Scenario:** Click quick response, but network fails

**Expected:** Error message shown, quick responses remain (can retry)

---

## Regression Tests

After making changes, verify:
- [ ] Structured questions still work as before
- [ ] Regular text input still works
- [ ] Chat scrolling behavior unchanged
- [ ] Token/cost tracking still accurate
- [ ] Tool calls display correctly
- [ ] Streaming responses work
- [ ] Clear chat button works

---

## Performance Checks

- [ ] No noticeable lag when generating quick responses
- [ ] Pattern matching doesn't block UI
- [ ] Button clicks are instant
- [ ] No memory leaks after many messages

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Known Issues

None currently.

---

## Future Test Scenarios

1. **Multi-language support**: Test with non-English AI responses
2. **Contextual responses**: Test if responses change based on conversation history
3. **AI-suggested responses**: Test when AI explicitly sends response options

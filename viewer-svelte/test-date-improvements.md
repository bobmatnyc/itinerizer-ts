# Visual Test Guide for Chat Input Improvements

## Test Scenario 1: Dynamic Placeholder

**Steps:**
1. Start a chat conversation
2. Trigger a structured question (any type)
3. Observe the input placeholder change

**Expected Results:**
- When no structured questions: "Type a message... (Shift+Enter for new line)"
- When structured questions visible: "Type here or select an option above..."

---

## Test Scenario 2: Date Range Validation

**Steps:**
1. Trigger a date_range type question
2. Try to select a past date for start date
3. Select a valid start date (today or future)
4. Try to select an end date before the start date
5. Select a valid end date (after start date)

**Expected Results:**
- Cannot select dates before today for start date
- Cannot select dates before start date for end date
- Submit button disabled until both dates selected
- Submit button shows "Confirm Dates" (not just "Confirm")

---

## Test Scenario 3: Date Formatting

**Steps:**
1. Select date range: Start = 2026-01-15, End = 2026-01-22
2. Click "Confirm Dates"
3. Observe the user message in chat

**Expected Results:**
- User message shows: "Jan 15 - Jan 22, 2026"
- NOT: "From 2026-01-15 to 2026-01-22"

---

## Test Scenario 4: Simultaneous Input Methods

**Steps:**
1. Trigger structured questions with options
2. Without clicking an option, type text in the input box
3. Press Enter or click Send

**Expected Results:**
- Text input remains functional while options are visible
- Sending text clears structured questions and sends typed message
- No interference between option selection and text input

---

## Visual Expectations

### Date Picker Container
- Light gray background (#f9fafb)
- Subtle border (#e5e7eb)
- Rounded corners
- Adequate padding (1rem)

### Date Inputs
- Clean white background
- Clear borders (#d1d5db)
- Hover effect (darker border)
- Focus ring (blue glow) without outline
- Larger font size (1rem) for readability

### Submit Button
- Primary blue background
- "Confirm Dates" label
- Disabled (gray) when dates incomplete
- Enabled (blue) when both dates selected

---

## Edge Cases to Verify

1. **Same Day Trip**: Start and end date are the same (should be allowed)
   - Expected output: "Jan 15, 2026" or similar

2. **Cross-Year Trip**: Start in Dec 2025, end in Jan 2026
   - Expected output: "Dec 28, 2025 - Jan 5, 2026"

3. **Long Trip**: 30+ day range
   - Should work without issues

4. **Rapid Switching**: Quickly change dates multiple times
   - Should update min constraints correctly

---

## Browser Compatibility Notes

Date inputs are standard HTML5 and should work in:
- Chrome/Edge (Chromium)
- Safari
- Firefox

Mobile browsers have native date pickers that may look different but use the same validation.


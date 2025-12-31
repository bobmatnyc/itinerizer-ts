# Testing New Trip UX Improvements

## Overview
This document provides testing steps for the two new UX improvements:
1. Business Trip traveler option
2. NewTripHelperView component with auto-switching

## Prerequisites
```bash
# Start the dev server
cd viewer-svelte
npm run dev

# Navigate to http://localhost:5176
```

## Test Suite

### Test 1: Business Traveler Option

**Objective**: Verify Business option appears in traveler selection

**Steps**:
1. Navigate to home page
2. Click "Create New" button or quick prompt
3. Chat panel opens with Trip Designer
4. AI asks "Who's traveling?"
5. Verify structured question shows these options:
   - Solo - Just me
   - Couple - Traveling with partner
   - Family - With kids
   - Friends - Group of adults
   - **Business - Work travel** 💼 (NEW)
   - Other - I'll describe my group

**Expected Result**:
- ✅ Business option visible with briefcase icon
- ✅ Business option selectable
- ✅ AI responds appropriately to business travel selection

**Test Variations**:
- Test with different starting prompts:
  - "I need to plan a business trip to NYC"
  - "5-day conference trip to Austin"
  - "Work travel next month"

---

### Test 2: Helper View on New Trip Creation

**Objective**: Verify NewTripHelperView appears when creating empty itinerary

**Steps**:
1. From home page, click "Create New"
2. Observe view transitions

**Expected Result**:
- ✅ Chat panel opens (left pane)
- ✅ NewTripHelperView displays (right pane)
- ✅ Helper view shows:
  - Header: "Let's Plan Your Trip! ✈️"
  - Subheader about asking questions
  - Checklist of info to collect (5 items)
  - Tip section with lightbulb icon
  - CTA section pointing to chat
- ✅ Animations working (float, pulse, point)

---

### Test 3: Helper View with Quick Prompts

**Objective**: Verify helper view appears with quick prompts

**Steps**:
1. From home page, click "Plan a weekend getaway"
2. Observe view transitions

**Expected Result**:
- ✅ New itinerary created
- ✅ Chat panel opens with prompt pre-filled
- ✅ NewTripHelperView displays
- ✅ AI starts asking questions

---

### Test 4: Auto-Switch to Detail View

**Objective**: Verify automatic transition when segments are added

**Steps**:
1. Create new trip (helper view shows)
2. Answer AI questions in chat:
   - Destination: "Portugal"
   - Who's traveling: Click "Couple"
   - Travel style: Click "Moderate"
   - (Continue answering questions)
3. Wait for AI to add first segment (flight/hotel/activity)
4. Observe view transition

**Expected Result**:
- ✅ Helper view remains during Q&A
- ✅ View automatically switches to itinerary-detail when segment added
- ✅ New segment visible in detail view
- ✅ Can continue chatting in left pane
- ✅ Transition is smooth (no flash/flicker)

---

### Test 5: Helper View Returns on Empty

**Objective**: Verify helper view returns if all segments deleted

**Steps**:
1. Create trip with segments (detail view showing)
2. Delete all segments one by one
3. Observe view behavior

**Expected Result**:
- ✅ View switches back to NewTripHelperView when last segment deleted
- ✅ Helper content displays correctly
- ✅ Can continue planning from helper view

---

### Test 6: Existing Itinerary Selection

**Objective**: Verify correct view for existing itineraries

**Steps**:
1. From itineraries tab, select existing itinerary with segments
2. Observe main pane

**Expected Result**:
- ✅ Itinerary detail view shows (NOT helper view)
- ✅ All segments visible
- ✅ Can edit or chat normally

**Steps** (Empty Itinerary):
1. Create new itinerary
2. Don't add any segments
3. Switch to another itinerary
4. Switch back to empty itinerary

**Expected Result**:
- ✅ Helper view displays for empty itinerary
- ✅ Can start planning again

---

### Test 7: Mobile Responsive

**Objective**: Verify layout works on mobile

**Steps**:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone/Android device
4. Create new trip

**Expected Result**:
- ✅ Helper view adapts to mobile screen
- ✅ Text sizes adjust appropriately
- ✅ Icons remain visible
- ✅ Checklist items stack vertically
- ✅ Animations still work

---

### Test 8: State Persistence

**Objective**: Verify view state persists correctly

**Steps**:
1. Create new trip (helper view)
2. Start answering questions
3. Switch to "Itineraries" tab
4. Switch back to "Chat" tab

**Expected Result**:
- ✅ Helper view still showing (if no segments)
- ✅ Chat messages preserved
- ✅ Can continue conversation

---

## Edge Cases

### Edge Case 1: Rapid Itinerary Switching
1. Create new trip A (helper view)
2. Immediately create new trip B (helper view)
3. Switch back to trip A
4. Add segment to trip A
5. Switch to trip B

**Expected**:
- ✅ Each itinerary maintains correct view state
- ✅ No view state leakage between itineraries

### Edge Case 2: Concurrent Segment Addition
1. Start in helper view
2. AI adds multiple segments rapidly
3. Observe view transitions

**Expected**:
- ✅ View switches on first segment add
- ✅ No multiple transitions or flashing
- ✅ All segments visible after transition

### Edge Case 3: API Key Not Set
1. Remove OpenRouter API key
2. Try to create new trip

**Expected**:
- ✅ Helper view still shows
- ✅ Chat shows API key error message
- ✅ Can still view helper content

---

## Performance Checks

### Load Time
- ✅ Helper view loads instantly (<100ms)
- ✅ Animations smooth (60fps)
- ✅ No layout shift during view transitions

### Memory
- ✅ No memory leaks when switching views
- ✅ Cleanup of reactive effects when unmounting

---

## Accessibility

### Keyboard Navigation
- ✅ Can navigate with Tab key
- ✅ Focus indicators visible
- ✅ Can trigger actions with Enter/Space

### Screen Reader
- ✅ Helper content announced correctly
- ✅ Checklist items have proper labels
- ✅ Icons have aria-labels or are decorative

### Color Contrast
- ✅ Text meets WCAG AA standards
- ✅ Icons distinguishable from background

---

## Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

---

## Regression Tests

Ensure existing functionality still works:
- ✅ Import PDF flow
- ✅ Edit itinerary manually
- ✅ Delete itinerary
- ✅ Calendar view
- ✅ Map view
- ✅ Help view
- ✅ Profile settings

---

## Bug Reporting Template

If issues found, report with:

```markdown
## Issue: [Brief description]

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Environment**:
- Browser: [Chrome/Firefox/Safari/Edge]
- Version: [Browser version]
- Device: [Desktop/Mobile]
- Screen size: [1920x1080/iPhone 12/etc]

**Screenshots**:
[Attach screenshots if applicable]

**Console Errors**:
[Paste any console errors]
```

---

## Success Criteria

All tests pass with:
- ✅ No console errors
- ✅ No visual glitches
- ✅ Smooth transitions
- ✅ Correct view state at all times
- ✅ Responsive design works
- ✅ Accessibility requirements met
- ✅ Cross-browser compatibility

---

## Sign-Off

After completing all tests:

- [ ] All core tests passed
- [ ] Edge cases handled correctly
- [ ] Performance acceptable
- [ ] Accessibility verified
- [ ] Browser compatibility confirmed
- [ ] No regressions introduced

**Tested by**: _________________
**Date**: _________________
**Build version**: _________________
**Notes**: _________________

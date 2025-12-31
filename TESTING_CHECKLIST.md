# UX Improvements Testing Checklist

## Task 1: Thinking Indicator

### Test Scenarios

#### Happy Path
- [ ] Start dev server: `cd viewer-svelte && npm run dev`
- [ ] Open app and create/open an itinerary
- [ ] Type a message in Trip Designer chat
- [ ] Press Send
- [ ] **VERIFY**: "Thinking..." indicator appears with animated dots
- [ ] **VERIFY**: Indicator disappears when streaming response begins
- [ ] **VERIFY**: Smooth transition from thinking → streaming text

#### Network Latency Simulation
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Slow 3G"
- [ ] Send a message
- [ ] **VERIFY**: Thinking indicator visible for several seconds
- [ ] **VERIFY**: User can see system is working during delay

#### Error Handling
- [ ] Disconnect network (or stop backend)
- [ ] Try sending a message
- [ ] **VERIFY**: Thinking indicator clears when error occurs
- [ ] **VERIFY**: Error message displays properly

#### Multiple Messages
- [ ] Send several messages in quick succession
- [ ] **VERIFY**: Each message shows thinking indicator
- [ ] **VERIFY**: No overlapping or stuck indicators

---

## Task 2: Past Dates Warning

### Test Scenarios

#### Past Dates Detection
- [ ] Create a test itinerary with past dates:
  - Start: 2023-06-01
  - End: 2023-06-07
- [ ] Navigate to itinerary detail view
- [ ] **VERIFY**: Warning banner appears with yellow/amber gradient
- [ ] **VERIFY**: Warning shows: "Trip dates are in the past"
- [ ] **VERIFY**: Correct date range displayed in warning
- [ ] **VERIFY**: Slide-in animation is smooth

#### Current/Future Dates (No Warning)
- [ ] Create itinerary with future dates (next month)
- [ ] Navigate to detail view
- [ ] **VERIFY**: No warning banner appears
- [ ] Create itinerary ending today
- [ ] **VERIFY**: No warning (today is not "past")

#### Edge Cases
- [ ] Itinerary with no end date
- [ ] **VERIFY**: No warning (graceful handling)
- [ ] Itinerary with malformed dates
- [ ] **VERIFY**: No crashes, graceful fallback

#### Visual Design
- [ ] Check warning placement (after date, before description)
- [ ] **VERIFY**: Warning doesn't overlap other elements
- [ ] **VERIFY**: Warning is readable and prominent
- [ ] **VERIFY**: Icon (⚠️) displays correctly

---

## Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS)

### Mobile Browsers (Responsive)
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Verify thinking indicator and warning are mobile-friendly

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through chat interface
- [ ] **VERIFY**: Can send messages with keyboard
- [ ] **VERIFY**: Thinking indicator doesn't break tab order

### Screen Reader
- [ ] Enable VoiceOver (macOS) or NVDA (Windows)
- [ ] Navigate through itinerary with past dates
- [ ] **VERIFY**: Warning text is read aloud
- [ ] **NOTE**: Thinking indicator could be enhanced with aria-live

---

## Performance Testing

### Thinking Indicator
- [ ] Check DevTools Performance tab
- [ ] Send a message
- [ ] **VERIFY**: No performance degradation
- [ ] **VERIFY**: Animation is smooth (60fps)

### Past Dates Check
- [ ] Open itinerary with 100+ segments
- [ ] **VERIFY**: Warning check doesn't slow page load
- [ ] **VERIFY**: Derived state computation is instant

---

## Regression Testing

### Existing Chat Features
- [ ] Structured questions still work
- [ ] Tool call indicators still display
- [ ] Streaming text still works
- [ ] Error messages still show

### Existing Itinerary Features
- [ ] Can edit itinerary details
- [ ] Can add/edit/delete segments
- [ ] Can delete itinerary
- [ ] Date range formatting still correct

---

## Quick Smoke Test (5 minutes)

1. [ ] `cd viewer-svelte && npm run dev`
2. [ ] Create new itinerary (future dates)
3. [ ] Open Trip Designer, send message
4. [ ] Verify thinking indicator appears briefly
5. [ ] Navigate back to list, open itinerary
6. [ ] No warning (future dates)
7. [ ] Edit itinerary, change dates to past (2023-01-01 to 2023-01-07)
8. [ ] Navigate to detail view
9. [ ] Verify warning appears
10. [ ] All features working? ✅

---

## Known Limitations

### Thinking Indicator
- No screen reader announcement (enhancement opportunity)
- No retry logic shown during network errors
- Shows same indicator for all message types

### Past Dates Warning
- Warning is informational only (no auto-update action)
- Only checks end date (not start date edge cases)
- No "dismiss" option (could be future enhancement)

---

## Rollback Plan

If issues are found:

### Revert Thinking Indicator
```bash
git checkout HEAD -- viewer-svelte/src/lib/stores/chat.ts
git checkout HEAD -- viewer-svelte/src/lib/components/ChatPanel.svelte
```

### Revert Past Dates Warning
```bash
git checkout HEAD -- viewer-svelte/src/lib/components/ItineraryDetail.svelte
```

### Clean State
```bash
# Clear browser cache and localStorage
# Restart dev server
cd viewer-svelte && npm run dev
```

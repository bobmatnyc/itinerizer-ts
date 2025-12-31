# Testing Destination Background Images

## Quick Test Guide

### Prerequisites
```bash
cd viewer-svelte
npm run dev
```

### Test Scenarios

#### Scenario 1: New Itinerary - No Destination Yet
**Steps:**
1. Click "Create New" button
2. New itinerary created with default title "New Itinerary"
3. NewTripHelperView shows

**Expected:**
- ✅ Original blue gradient background (no destination image)
- ✅ All text is readable
- ✅ Checklist items are clickable

#### Scenario 2: Destination from Chat
**Steps:**
1. In chat panel, type: "I want to plan a trip to Paris"
2. Wait for AI response
3. Observe NewTripHelperView

**Expected:**
- ✅ Parisian background image fades in smoothly (1 second)
- ✅ White gradient overlay ensures text readability
- ✅ Header has subtle text shadow for contrast
- ✅ All interactive elements still work

#### Scenario 3: Different Destinations
**Test multiple destinations:**
```
Test Cases:
1. "I want to visit Tokyo"
   → Japanese cityscape/landmarks

2. "I'm planning a trip to New York"
   → NYC skyline/landmarks

3. "I want to explore Croatia"
   → Croatian coastal scenes

4. "I'm going to Santorini, Greece"
   → Greek island views

5. "I want to visit the Swiss Alps"
   → Mountain scenery
```

**Expected for each:**
- ✅ Background image relevant to destination
- ✅ Smooth fade-in transition
- ✅ Text remains readable
- ✅ No layout shifts or jumps

#### Scenario 4: Destination with Segments
**Steps:**
1. Continue planning from Scenario 2
2. Add segments via chat: "Add a hotel for 3 nights"
3. Observe view switch from helper to detail view

**Expected:**
- ✅ View switches to itinerary detail (no background image there)
- ✅ Background only shows in NewTripHelperView
- ✅ Smooth transition between views

#### Scenario 5: Multiple Destinations
**Steps:**
1. Create itinerary with multiple destinations
2. In data, check `destinations` array has multiple items

**Expected:**
- ✅ Shows background for FIRST destination only
- ✅ Falls back to title if destinations array is empty
- ✅ No errors in console

#### Scenario 6: Special Characters in Destination
**Test URL encoding:**
```
Test Cases:
1. "São Paulo, Brazil"
2. "Côte d'Azur"
3. "Queenstown, New Zealand"
```

**Expected:**
- ✅ URL encoding handles special characters correctly
- ✅ Images load successfully
- ✅ No console errors

## Visual Inspection Checklist

### Layout
- [ ] Background covers entire viewport
- [ ] Content is centered vertically and horizontally
- [ ] Cards and text are properly layered above background
- [ ] No overlapping or z-index issues

### Colors & Contrast
- [ ] White gradient overlay is visible
- [ ] Text has sufficient contrast to read
- [ ] Header title has subtle shadow
- [ ] Button states (hover, active) work correctly

### Animations
- [ ] Background fades in smoothly (1 second)
- [ ] No jarring appearance of image
- [ ] Transition is smooth, not abrupt
- [ ] No layout shift during image load

### Responsiveness
- [ ] Works on desktop (1920x1080)
- [ ] Works on tablet (768px width)
- [ ] Works on mobile (375px width)
- [ ] Background scales appropriately

## Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Performance Testing

### Network Tab
1. Open DevTools → Network tab
2. Filter by "Img"
3. Create new itinerary with destination
4. Observe image loading

**Expected:**
- ✅ Single image request to `source.unsplash.com`
- ✅ Image size: ~200-500KB
- ✅ Load time: < 2 seconds on good connection
- ✅ Cached on subsequent visits

### Console
- [ ] No console errors
- [ ] No console warnings
- [ ] No failed image loads

## Edge Cases

### Error Handling
**Test invalid destinations:**
1. "I want to go to Xyzabc123" (nonsense destination)

**Expected:**
- ✅ Unsplash returns a random travel image (graceful fallback)
- ✅ No errors thrown
- ✅ Application continues to function

### Loading States
**Test slow network:**
1. Open DevTools → Network tab
2. Throttle to "Slow 3G"
3. Create itinerary with destination

**Expected:**
- ✅ Blue gradient background shows immediately
- ✅ Image fades in when loaded
- ✅ No blank white screen while loading
- ✅ Text readable during entire load

### No Network
**Test offline:**
1. Disconnect network
2. Try to view NewTripHelperView with destination

**Expected:**
- ✅ Blue gradient fallback shows
- ✅ No broken image icon
- ✅ Application functions normally

## Automated Testing (Future)

### Playwright E2E Test (Suggested)
```typescript
test('destination background image displays correctly', async ({ page }) => {
  await page.goto('/itineraries');

  // Create new itinerary
  await page.click('text=Create New');

  // Send message with destination
  await page.fill('[data-testid="chat-input"]', 'I want to visit Paris');
  await page.click('[data-testid="send-button"]');

  // Wait for helper view
  await page.waitForSelector('.helper-view.has-background');

  // Check background image
  const backgroundDiv = page.locator('.destination-background');
  await expect(backgroundDiv).toHaveCSS('opacity', '1');

  // Check image URL contains destination
  const styleAttr = await backgroundDiv.getAttribute('style');
  expect(styleAttr).toContain('Paris');
  expect(styleAttr).toContain('source.unsplash.com');
});
```

## Debugging

### If image doesn't appear:
1. Check browser console for errors
2. Inspect `.destination-background` element
3. Verify `background-image` style is set
4. Check Network tab for failed requests
5. Verify `destination` prop is passed correctly

### If text is unreadable:
1. Inspect `.background-overlay` element
2. Verify gradient overlay is present
3. Check z-index values (background: 0, overlay: 1, content: 2)
4. Verify text shadow on header

### If layout is broken:
1. Check `.helper-view` has `position: relative`
2. Verify `.helper-content` has `position: relative` and `z-index: 2`
3. Check that absolute positioning is correct

## Manual Testing Log

| Date | Tester | Browser | Result | Notes |
|------|--------|---------|--------|-------|
| 2025-12-23 | - | Chrome | ⏳ Pending | - |
| 2025-12-23 | - | Firefox | ⏳ Pending | - |
| 2025-12-23 | - | Safari | ⏳ Pending | - |

---

## Sign-off

- [ ] All test scenarios pass
- [ ] Visual inspection complete
- [ ] Browser testing complete
- [ ] Performance acceptable
- [ ] Edge cases handled
- [ ] Ready for production

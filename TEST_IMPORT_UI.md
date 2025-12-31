# Import UI Testing Guide

## Quick Start

### Prerequisites
- App running locally: `cd viewer-svelte && npm run dev`
- OPENROUTER_API_KEY configured in `.env`
- At least one existing itinerary in the app
- Test files ready (PDF confirmation, ICS calendar file)

## Test Scenarios

### Scenario 1: Import to Existing Trip (Pre-selected)

**Goal**: Import flight confirmation to an existing trip

**Steps**:
1. Navigate to an existing itinerary
2. Switch to "Manual" edit mode
3. Click "📥 Import" button
4. Verify ImportDialog opens with this trip pre-selected
5. Drag a PDF flight confirmation onto the drop zone
6. Verify file appears in "File Selected" state
7. Click "Upload & Process"
8. Verify processing spinner appears
9. Wait for extraction to complete
10. Verify extracted flight segment appears in SegmentPreview
11. Verify confidence badge shows (High/Medium/Low)
12. Verify current trip is pre-selected (no trip matching UI)
13. Click "Import Segments"
14. Verify success toast appears
15. Verify dialog closes
16. Verify new segment appears in itinerary

**Expected Results**:
- ✅ Dialog opens with pre-selected trip
- ✅ File upload shows file name and size
- ✅ Processing shows spinner
- ✅ Segments extracted with details
- ✅ Import adds segments to trip
- ✅ No trip matching shown (pre-selected)

### Scenario 2: Import with Trip Matching

**Goal**: Import hotel confirmation and match to existing trip

**Steps**:
1. Create a test trip: "Tokyo Trip" with dates March 1-7, 2025
2. From the itinerary list, click global import (future feature)
   - *For now*: Test via ImportDialog without pre-selection
3. Upload a hotel confirmation for Tokyo, March 2-5
4. Verify SegmentPreview shows hotel details
5. Verify TripMatchCard shows "Tokyo Trip" with high match score
6. Verify match reasons include date overlap
7. Select the Tokyo Trip match
8. Click "Import Segments"
9. Verify segments added to Tokyo Trip

**Expected Results**:
- ✅ Trip matches based on dates and location
- ✅ Match score shows percentage and reasons
- ✅ Correct trip suggested with high confidence
- ✅ Segments added to selected trip

### Scenario 3: Create New Trip from Import

**Goal**: Import segments that don't match existing trips

**Steps**:
1. Upload a confirmation for a destination you don't have trips for
2. Verify no high-confidence matches appear (or low scores)
3. Scroll to bottom and select "Create New Trip"
4. Verify text input appears
5. Enter trip name: "Paris Weekend"
6. Verify "Import Segments" button becomes enabled
7. Click "Import Segments"
8. Verify new trip created with segments

**Expected Results**:
- ✅ Create New Trip option available
- ✅ Text input appears when selected
- ✅ Button disabled until name entered
- ✅ New trip created successfully
- ✅ Segments added to new trip

### Scenario 4: Multiple Segments in One File

**Goal**: Import PDF with flight + hotel

**Steps**:
1. Upload a PDF with multiple bookings (e.g., flight + hotel package)
2. Verify SegmentPreview shows count: "Extracted Segments (2)"
3. Verify both segments listed with details
4. Verify each has confidence badge
5. Import to existing trip
6. Verify both segments added

**Expected Results**:
- ✅ All segments extracted
- ✅ Segment count accurate
- ✅ Each segment shows details
- ✅ All segments imported together

### Scenario 5: Low Confidence Extraction

**Goal**: Test handling of unclear/partial data

**Steps**:
1. Upload a PDF with minimal booking details (e.g., incomplete confirmation)
2. Verify extraction completes
3. Verify segments show "Low" confidence badges
4. Verify warning/summary mentions missing data
5. Verify can still import segments
6. Check imported segments for missing fields

**Expected Results**:
- ✅ Low confidence clearly indicated
- ✅ User can still proceed
- ✅ Summary explains limitations
- ✅ Segments imported with available data

### Scenario 6: Error Handling

**Goal**: Test error states and recovery

**Test 6a: No File Selected**
1. Open ImportDialog
2. Click "Upload & Process" without selecting file
3. Verify button is disabled (can't click)

**Test 6b: Invalid File Type**
1. Try to upload a `.txt` or `.docx` file
2. Verify file picker filters to allowed types
3. If bypassed, verify server error handled gracefully

**Test 6c: No Trip Selected**
1. Upload file successfully
2. Don't select any trip or create new
3. Verify "Import Segments" button disabled
4. Select a trip
5. Verify button becomes enabled

**Test 6d: Network Error**
1. Stop backend server
2. Try to upload file
3. Verify error toast appears with helpful message
4. Verify can close dialog and retry

**Expected Results**:
- ✅ Validation prevents invalid actions
- ✅ Errors show helpful messages
- ✅ User can recover from errors
- ✅ UI doesn't break on errors

### Scenario 7: ICS Calendar Import

**Goal**: Import from calendar file

**Steps**:
1. Export event from Google Calendar as `.ics`
2. Upload to ImportDialog
3. Verify event extracted as segment
4. Verify dates/times parsed correctly
5. Verify location extracted (if available)
6. Import to trip

**Expected Results**:
- ✅ ICS file processed
- ✅ Event becomes segment
- ✅ All dates correct
- ✅ Location parsed

### Scenario 8: Mobile Responsive

**Goal**: Test mobile layout

**Steps**:
1. Resize browser to mobile width (375px)
2. Open ImportDialog
3. Verify modal fills screen
4. Verify buttons stack vertically
5. Verify text readable at mobile size
6. Upload file on mobile
7. Verify scrolling works
8. Complete import flow

**Expected Results**:
- ✅ Modal fits mobile screen
- ✅ Touch targets adequate size
- ✅ Text and buttons readable
- ✅ Full flow works on mobile

## Visual Testing Checklist

### SegmentPreview Component
- [ ] Segment icons render correctly (✈️ 🏨 🎯 🚗 📝)
- [ ] Confidence badges color-coded (green/yellow/red)
- [ ] Segment details truncate with ellipsis
- [ ] Dates formatted clearly
- [ ] Confirmation numbers highlighted
- [ ] Scrollbar appears for >4 segments
- [ ] Hover states work on segment cards

### TripMatchCard Component
- [ ] Radio button aligned properly
- [ ] Trip name truncates if too long
- [ ] Match score bar animates smoothly
- [ ] Score percentage color-coded
- [ ] Match reason tags wrap properly
- [ ] Selected state shows blue highlight
- [ ] Hover state provides feedback

### ImportDialog Component
- [ ] Modal centered on screen
- [ ] Backdrop blur visible
- [ ] Close button (×) aligned top-right
- [ ] Drop zone border dashed gray
- [ ] Drop zone turns blue when dragging
- [ ] Processing spinner centered
- [ ] Success icon green checkmark
- [ ] Footer buttons right-aligned
- [ ] Mobile: modal full-screen
- [ ] Mobile: buttons stack vertically

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through dialog controls
- [ ] Escape closes dialog
- [ ] Enter submits form
- [ ] Radio buttons keyboard selectable
- [ ] Focus visible on all interactive elements

### Screen Reader Testing
- [ ] Dialog announces title
- [ ] Step changes announced
- [ ] Button labels descriptive
- [ ] Error messages read aloud
- [ ] Success messages announced
- [ ] Form labels associated with inputs

## Performance Testing

### File Upload
- [ ] Small file (<100KB): Instant
- [ ] Medium file (1-2MB): <3 seconds
- [ ] Large file (5-10MB): <10 seconds
- [ ] Progress feedback during upload

### Trip Matching
- [ ] 1-10 trips: Instant
- [ ] 10-50 trips: <1 second
- [ ] 50+ trips: <2 seconds

### UI Responsiveness
- [ ] Dialog opens smoothly
- [ ] Transitions not janky
- [ ] No layout shift during load
- [ ] Scrolling smooth with many segments

## Browser Compatibility

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] Safari iOS (latest)
- [ ] Chrome Android (latest)

## Regression Testing

After implementing import UI:
- [ ] Existing itinerary detail still works
- [ ] Manual edit mode still functional
- [ ] Add segment still works
- [ ] Other modals still work
- [ ] No console errors
- [ ] No broken styles

## Test Data

### Sample Files Needed
1. **flight-confirmation.pdf** - United Airlines LAX→JFK
2. **hotel-confirmation.pdf** - Hilton Tokyo 3 nights
3. **activity-booking.pdf** - Tour reservation
4. **multi-segment.pdf** - Flight + Hotel package
5. **calendar-event.ics** - Single event
6. **unclear-booking.pdf** - Incomplete/partial data

### Sample Trips Needed
1. **Tokyo Trip** - March 1-7, 2025
2. **NYC Business Trip** - April 10-14, 2025
3. **Paris Weekend** - May 20-22, 2025
4. **No Dates Trip** - Title only, no dates set

## Bug Reporting Template

```
**Bug**: [Short description]
**Severity**: Critical / High / Medium / Low
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected**: [What should happen]
**Actual**: [What actually happened]

**Environment**:
- Browser: [Chrome 120, Safari 17, etc.]
- Device: [Desktop/Mobile]
- Screen size: [1920x1080, 375x667, etc.]

**Screenshots**: [Attach if helpful]
**Console errors**: [Copy any errors]
```

## Success Criteria

Import UI is production-ready when:
- ✅ All test scenarios pass
- ✅ Visual testing checklist complete
- ✅ Accessibility requirements met
- ✅ Performance targets achieved
- ✅ Browser compatibility confirmed
- ✅ No regressions in existing features
- ✅ Error handling robust
- ✅ Mobile experience smooth

---

**Testing Status**: Ready for QA
**Last Updated**: 2025-12-29

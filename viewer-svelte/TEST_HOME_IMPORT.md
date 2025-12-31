# Home Screen Import Feature - Test Guide

## Feature Overview
Added a prominent "Import Itinerary" option to the home screen's "Get Started" section.

## Changes Made

### 1. HomeView Component (`src/lib/components/HomeView.svelte`)
- **Added**: Import action card to the action cards grid
- **Added**: `onImportClick` prop to handle import button clicks
- **Updated**: Action cards now include an import option with:
  - Icon: 📥
  - Text: "Import Itinerary"
  - Description: "Upload PDF, ICS, or image files"
  - Special styling: Blue gradient background to make it visually prominent

### 2. Parent Page Component (`src/routes/itineraries/+page.svelte`)
- **Added**: `ImportDialog` component import
- **Added**: `importDialogOpen` state management
- **Added**: `handleImportDialogClick()` - Opens import dialog
- **Added**: `handleImportDialogComplete()` - Handles successful imports:
  - Reloads itineraries
  - Selects the imported itinerary
  - Navigates to itinerary detail view
  - Shows success toast notification
- **Wired**: HomeView's `onImportClick` prop to `handleImportDialogClick`

## Testing Steps

### Prerequisites
- Must have API key configured (visit Profile to add one)
- Import feature requires AI access for document parsing

### Test Case 1: Import from Home Screen
1. Navigate to home screen (no itineraries selected)
2. Verify "Import Itinerary" card appears in the "Get Started" section
3. Verify it has a blue gradient background (distinct from other cards)
4. Click "Import Itinerary" button
5. Verify ImportDialog opens with file upload interface

### Test Case 2: File Upload Flow
1. Click "Import Itinerary" from home screen
2. Upload a PDF confirmation, ICS file, or image
3. Verify processing step shows spinner
4. Verify matching step shows extracted segments
5. Select or create a trip destination
6. Click "Import Segments"
7. Verify success message appears
8. Verify app navigates to the imported itinerary
9. Verify imported segments appear in the itinerary

### Test Case 3: AI Access Gating
1. Remove API key (visit Profile, clear API key)
2. Return to home screen
3. Verify "Import Itinerary" button is disabled
4. Verify lock icon 🔒 appears on the button
5. Verify hover tooltip says "API key required - visit Profile to add one"

### Test Case 4: Auto-Match Mode
1. Click "Import Itinerary" from home screen
2. Upload travel documents
3. Verify the dialog shows matching trips (if any exist)
4. Verify you can select an existing trip OR create a new one
5. Verify creating a new trip prompts for a trip name
6. Verify import adds segments to the selected/created trip

## UI Specifications

### Import Action Card Styling
```css
/* Normal state */
background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
border-color: #93c5fd;

/* Hover state */
background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
border-color: #60a5fa;
```

### Layout
- Positioned as the FIRST card in the action grid
- Uses the same card layout as other quick prompts
- Icon: 📥 (upload/import icon)
- Visually distinct with blue gradient background

## Implementation Details

### ImportDialog Props Used
```typescript
{
  open: boolean,                    // Bound to importDialogOpen state
  preselectedItineraryId: undefined, // Auto-match mode (no preselection)
  onComplete: (itineraryId: string, itineraryName: string) => void
}
```

### Success Flow
1. User clicks "Import Itinerary"
2. Dialog opens in auto-match mode
3. User uploads file
4. AI extracts segments and matches to trips
5. User selects destination trip or creates new
6. Dialog calls `onComplete` with itinerary ID and name
7. Parent reloads itineraries and navigates to imported trip
8. Success toast shows confirmation

## Files Modified
- `/viewer-svelte/src/lib/components/HomeView.svelte` (5 edits)
- `/viewer-svelte/src/routes/itineraries/+page.svelte` (5 edits)

## LOC Delta
- **Added**: ~45 lines (HomeView card definition, handlers, styling)
- **Modified**: ~15 lines (Parent component wiring)
- **Net Change**: +60 lines

## Phase Classification
**Phase 1: MVP** - Core functionality for importing from home screen

## Future Enhancements (Phase 2+)
- Add drag-and-drop support directly on home screen
- Show recent import history
- Add batch import support
- Mobile-optimized import flow

# Segment Editor - Manual Editing Feature

This document describes the segment-by-segment editor implementation for the Svelte itinerary viewer.

## Overview

The segment editor allows users to manually edit itinerary segments inline, add new segments, and delete segments. When "Edit Manually" is clicked, the detail pane enters edit mode with full CRUD operations.

## Components

### 1. SegmentEditor.svelte
**Purpose**: Type-specific form component for editing individual segments

**Props**:
- `segment: Segment | null` - Segment to edit (null for new segment)
- `onSave: (data: Partial<Segment>) => void` - Save callback
- `onCancel: () => void` - Cancel callback
- `onDelete?: () => void` - Delete callback (optional)

**Features**:
- Common fields: start/end datetime, status, notes
- Type-specific field groups for each segment type:
  - **Flight**: airline name/code, flight number, origin/destination, cabin class
  - **Hotel**: property name, address, city, country, room type
  - **Activity**: name, description, location details
  - **Transfer**: transfer type, pickup/dropoff locations
  - **Custom**: title, description
- Real-time validation with error messages
- Responsive form layout with grouped fields

**Validation**:
- Required fields enforced per segment type
- End time must be after start time
- Clear error messages displayed above form

### 2. AddSegmentModal.svelte
**Purpose**: Modal for adding new segments with type selection

**Props**:
- `open: boolean` (bindable) - Modal visibility state
- `itineraryId: string` - ID of itinerary to add segment to
- `onSegmentAdded: (segment: Partial<Segment>) => Promise<void>` - Callback after successful add

**Features**:
- Two-stage interface:
  1. Type selection with visual icons
  2. SegmentEditor form for selected type
- Segment types supported:
  - Flight (✈️)
  - Hotel (🏨)
  - Activity (🎯)
  - Transfer (🚗)
  - Custom (📝)
- Backdrop click to close
- Automatic reset on close

### 3. ItineraryDetail.svelte (Modified)
**Purpose**: Main detail view with edit mode support

**New State**:
- `editMode: boolean` - Whether edit mode is active
- `editingSegmentId: string | null` - Currently editing segment
- `showAddSegmentModal: boolean` - Add segment modal visibility

**New Features**:
- "Edit Manually" button toggles edit mode
- "Done Editing" button exits edit mode
- "Add Segment" button opens add modal
- Conditional rendering:
  - Edit mode: Shows SegmentEditor inline for editing segment
  - Display mode: Shows SegmentCard with edit/delete buttons

**Behavior**:
- Edit one segment at a time
- Save refreshes the itinerary automatically
- Delete confirms with browser confirm dialog
- Add segment refreshes itinerary list

### 4. SegmentCard.svelte (Modified)
**Purpose**: Display card with optional edit controls

**New Props**:
- `editMode?: boolean` - Whether card is in edit mode
- `onEdit?: () => void` - Edit button callback
- `onDelete?: () => void` - Delete button callback

**New Features**:
- Edit icon button (pencil icon)
- Delete icon button (trash icon)
- Icons only appear when `editMode` is true
- Hover states with color transitions
- SVG icons from Lucide design system

## API Integration

### New Endpoints Expected

```typescript
// Add segment
POST /api/itineraries/:id/segments
Body: Partial<Segment>
Response: Itinerary (with new segment)

// Update segment
PATCH /api/itineraries/:id/segments/:segmentId
Body: Partial<Segment>
Response: Itinerary (with updated segment)

// Delete segment
DELETE /api/itineraries/:id/segments/:segmentId
Response: Itinerary (without deleted segment)
```

### API Client Methods

Added to `src/lib/api.ts`:
- `addSegment(itineraryId, segmentData)`: Add new segment
- `updateSegment(itineraryId, segmentId, segmentData)`: Update existing segment
- `deleteSegment(itineraryId, segmentId)`: Delete segment

### Store Methods

Added to `src/lib/stores/itineraries.ts`:
- `addSegment(itineraryId, segmentData)`: Add segment and refresh state
- `updateSegment(itineraryId, segmentId, segmentData)`: Update segment and refresh state
- `deleteSegment(itineraryId, segmentId)`: Delete segment and refresh state

All methods:
1. Call API endpoint
2. Update `selectedItinerary` store with response
3. Reload itineraries list to update segment counts

## User Flow

### Entering Edit Mode
1. User views itinerary detail
2. Clicks "Edit Manually" button
3. Detail pane switches to edit mode
4. Edit/delete icons appear on all segments
5. "Add Segment" and "Done Editing" buttons appear

### Editing a Segment
1. User clicks edit icon on segment card
2. Card expands to show SegmentEditor form
3. User modifies fields
4. Clicks "Save" - segment updates, editor closes
5. Clicks "Cancel" - editor closes without changes

### Adding a Segment
1. User clicks "Add Segment" button
2. Modal opens with type selection
3. User selects segment type
4. SegmentEditor form appears for that type
5. User fills in required fields
6. Clicks "Save" - segment added, modal closes
7. Clicks "Cancel" - returns to type selection or closes modal

### Deleting a Segment
1. User clicks delete icon on segment card
2. Browser confirm dialog appears
3. User confirms - segment deleted immediately
4. User cancels - no action taken

### Exiting Edit Mode
1. User clicks "Done Editing" button
2. All edit controls disappear
3. Returns to normal display mode

## Segment Type Field Requirements

### Flight
**Required**: Airline name, flight number, origin name, destination name
**Optional**: Airline code, origin code, destination code, cabin class

### Hotel
**Required**: Hotel name
**Optional**: Address, city, country, room type

### Activity
**Required**: Activity name, location name
**Optional**: Description, city, country

### Transfer
**Required**: Pickup location name, dropoff location name
**Optional**: Pickup city, dropoff city, transfer type (defaults to TAXI)

### Custom
**Required**: Title
**Optional**: Description

## Styling

All components follow the existing minimal design system:
- `.minimal-button` for buttons
- `.minimal-card` for segment cards
- Consistent spacing with Tailwind-like utilities
- Blue primary color (#3b82f6)
- Red delete color (#dc2626)
- Gray neutral colors

## Error Handling

### Validation Errors
- Displayed above form in red error box
- Prevents form submission until resolved
- Clear, actionable messages

### API Errors
- Caught with try/catch
- Logged to console
- Alert dialog shown to user
- No state changes on error

## State Management

### Local Component State
- Form fields managed with `$state` (Svelte 5 Runes)
- Reactive validation with `$derived`
- Form initialization with `$effect`

### Global State
- `selectedItinerary` updated after all operations
- `itineraries` list reloaded to reflect segment counts
- Optimistic updates not implemented (server is source of truth)

## Future Enhancements

### Phase 2 Improvements
- [ ] Drag-and-drop reordering of segments
- [ ] Bulk edit multiple segments
- [ ] Duplicate segment feature
- [ ] Undo/redo for edits
- [ ] Inline validation as user types
- [ ] Auto-save draft changes
- [ ] Rich text editor for descriptions/notes

### Phase 3 Optimizations
- [ ] Optimistic updates for faster UX
- [ ] Keyboard shortcuts (e.g., Esc to cancel)
- [ ] Accessibility improvements (focus management)
- [ ] Mobile-optimized form layout
- [ ] Field autocomplete (locations, airlines)
- [ ] Time zone support
- [ ] Duration calculation helpers

## Testing Checklist

- [ ] Edit each segment type (Flight, Hotel, Activity, Transfer, Custom)
- [ ] Add new segment of each type
- [ ] Delete segments
- [ ] Validation errors display correctly
- [ ] Cancel operations work without saving
- [ ] API errors handled gracefully
- [ ] Multiple edits in same session
- [ ] Edit mode toggle works correctly
- [ ] Modal backdrop close works
- [ ] Form resets when switching segment types

## Dependencies

- Svelte 5 (Runes API)
- SvelteKit
- Existing API client and stores
- No additional npm packages required

## Files Modified

### New Files
- `src/lib/components/SegmentEditor.svelte` (545 lines)
- `src/lib/components/AddSegmentModal.svelte` (155 lines)

### Modified Files
- `src/lib/components/ItineraryDetail.svelte` (+80 lines)
- `src/lib/components/SegmentCard.svelte` (+50 lines)
- `src/lib/api.ts` (+35 lines)
- `src/lib/stores/itineraries.ts` (+45 lines)

### Total Impact
- **LOC Added**: ~910 lines
- **LOC Modified**: ~210 lines
- **Net Impact**: +910 lines (new feature, no deletions)

## Backend Requirements

The backend API must implement these three endpoints:

```typescript
// POST /api/itineraries/:id/segments
{
  type: SegmentType;
  status: SegmentStatus;
  startDatetime: string; // ISO 8601
  endDatetime: string; // ISO 8601
  notes?: string;
  // Type-specific fields based on segment type
}

// PATCH /api/itineraries/:id/segments/:segmentId
{
  // Any segment fields to update
  // Partial update supported
}

// DELETE /api/itineraries/:id/segments/:segmentId
// No body required
```

All endpoints should:
- Validate segment data
- Return updated full Itinerary object
- Handle errors with appropriate HTTP status codes
- Support CORS for frontend development

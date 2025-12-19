# Segment Editor - Quick Start Guide

## What's New

A complete segment-by-segment editor has been added to the itinerary viewer. Users can now:

- **Edit segments inline** - Click edit icon, modify fields, save changes
- **Add new segments** - Choose segment type, fill form, add to itinerary
- **Delete segments** - Remove segments with confirmation

## User Guide

### How to Edit Segments

1. Open an itinerary in the detail pane
2. Click **"Edit Manually"** button
3. Click the **pencil icon** (✏️) next to any segment
4. Modify the fields in the expanded form
5. Click **"Save"** to save changes or **"Cancel"** to discard
6. Click **"Done Editing"** when finished

### How to Add Segments

1. Enter edit mode (click "Edit Manually")
2. Click **"Add Segment"** button
3. Select segment type from the modal:
   - ✈️ Flight
   - 🏨 Hotel
   - 🎯 Activity
   - 🚗 Transfer
   - 📝 Custom
4. Fill in the form fields
5. Click **"Save"** to add the segment

### How to Delete Segments

1. Enter edit mode (click "Edit Manually")
2. Click the **trash icon** (🗑️) next to the segment
3. Confirm the deletion in the dialog
4. Segment is immediately removed

## Segment Types & Fields

### Flight ✈️
**Required**: Airline name, flight number, origin, destination
**Optional**: Airline code, airport codes, cabin class

### Hotel 🏨
**Required**: Hotel name
**Optional**: Address, city, country, room type

### Activity 🎯
**Required**: Activity name, location
**Optional**: Description, city, country

### Transfer 🚗
**Required**: Pickup location, dropoff location
**Optional**: Transfer type, city information

### Custom 📝
**Required**: Title
**Optional**: Description

### Common Fields (All Types)
- **Start datetime** - When segment begins
- **End datetime** - When segment ends
- **Status** - Tentative, Confirmed, Waitlisted, Cancelled, Completed
- **Notes** - Optional notes about the segment

## Technical Details

### New Components

- **SegmentEditor.svelte** - Type-specific form component
- **AddSegmentModal.svelte** - Modal for adding segments

### Modified Components

- **ItineraryDetail.svelte** - Added edit mode
- **SegmentCard.svelte** - Added edit/delete buttons

### New API Methods

```typescript
// Add segment
apiClient.addSegment(itineraryId, segmentData)

// Update segment
apiClient.updateSegment(itineraryId, segmentId, segmentData)

// Delete segment
apiClient.deleteSegment(itineraryId, segmentId)
```

### Store Methods

```typescript
// Add, update, or delete segments
addSegment(itineraryId, segmentData)
updateSegment(itineraryId, segmentId, segmentData)
deleteSegment(itineraryId, segmentId)
```

## Backend Integration

### Required Endpoints

The backend must implement these three endpoints:

```
POST   /api/itineraries/:id/segments
PATCH  /api/itineraries/:id/segments/:segmentId
DELETE /api/itineraries/:id/segments/:segmentId
```

All endpoints should return the updated Itinerary object.

### Request/Response Format

**Add Segment (POST)**:
```json
{
  "type": "FLIGHT",
  "status": "CONFIRMED",
  "startDatetime": "2024-12-01T10:00:00Z",
  "endDatetime": "2024-12-01T22:00:00Z",
  "airline": {
    "name": "United Airlines",
    "code": "UA"
  },
  "flightNumber": "123",
  "origin": {
    "name": "San Francisco",
    "code": "SFO"
  },
  "destination": {
    "name": "Paris",
    "code": "CDG"
  },
  "travelerIds": [],
  "source": "manual"
}
```

**Update Segment (PATCH)**:
```json
{
  "flightNumber": "456",
  "cabin": "Business"
}
```

**Response (All Endpoints)**:
```json
{
  "id": "itinerary-123",
  "title": "Trip to Europe",
  "segments": [
    // ... all segments including modified one
  ],
  // ... rest of itinerary
}
```

## Validation Rules

### Common Rules
- Start datetime is required
- End datetime is required
- End datetime must be after start datetime

### Type-Specific Rules
- **Flight**: Airline name, flight number, origin, destination required
- **Hotel**: Hotel name required
- **Activity**: Activity name, location required
- **Transfer**: Pickup and dropoff locations required
- **Custom**: Title required

### Error Handling
- Validation errors shown in red above form
- API errors shown in alert dialog
- All errors logged to console

## Files Reference

### Documentation
- `SEGMENT_EDITOR_README.md` - Complete feature documentation
- `SEGMENT_EDITOR_IMPLEMENTATION.md` - Implementation details
- `docs/segment-editor-guide.md` - Visual UI guide
- `SEGMENT_EDITOR_SUMMARY.md` - This file

### Source Code
- `src/lib/components/SegmentEditor.svelte` - Form component
- `src/lib/components/AddSegmentModal.svelte` - Add modal
- `src/lib/components/ItineraryDetail.svelte` - Detail view (modified)
- `src/lib/components/SegmentCard.svelte` - Card component (modified)
- `src/lib/api.ts` - API client (modified)
- `src/lib/stores/itineraries.ts` - Stores (modified)

## Testing

### Manual Testing Checklist
- [ ] Edit flight segment
- [ ] Edit hotel segment
- [ ] Add new activity
- [ ] Delete transfer
- [ ] Validation prevents invalid saves
- [ ] Cancel operations work correctly
- [ ] Edit mode toggle functions

### Integration Testing
Requires backend API to be implemented:
- [ ] POST /api/itineraries/:id/segments
- [ ] PATCH /api/itineraries/:id/segments/:segmentId
- [ ] DELETE /api/itineraries/:id/segments/:segmentId

## Build & Deploy

### Build
```bash
npm run build
```

### Type Check
```bash
npm run check
```

### Development
```bash
npm run dev
```

### Preview Production
```bash
npm run preview
```

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Known Issues

1. **Single Edit**: Can only edit one segment at a time (by design)
2. **No Undo**: Deleted segments cannot be recovered
3. **Native Confirm**: Uses browser confirm dialog for delete (not custom modal)

## Future Enhancements

- Drag-and-drop segment reordering
- Duplicate segment feature
- Bulk edit multiple segments
- Keyboard shortcuts
- Optimistic updates
- Undo/redo functionality

## Support

For issues or questions:
1. Check `SEGMENT_EDITOR_README.md` for detailed documentation
2. Review `docs/segment-editor-guide.md` for UI flows
3. See `SEGMENT_EDITOR_IMPLEMENTATION.md` for technical details

## Quick Reference

### Edit Mode Shortcuts
- **Enter Edit Mode**: Click "Edit Manually"
- **Exit Edit Mode**: Click "Done Editing"
- **Add Segment**: Click "Add Segment" (in edit mode)
- **Edit Segment**: Click ✏️ icon (in edit mode)
- **Delete Segment**: Click 🗑️ icon (in edit mode)
- **Save Changes**: Click "Save" button
- **Cancel Changes**: Click "Cancel" button

### Segment Status Options
- **Tentative** - Not yet confirmed
- **Confirmed** - Booking confirmed
- **Waitlisted** - On waitlist
- **Cancelled** - Cancelled booking
- **Completed** - Already happened

### Transfer Types
- **Taxi** - Traditional taxi
- **Shuttle** - Shared shuttle service
- **Private** - Private car service
- **Public** - Public transportation
- **Ride Share** - Uber/Lyft style service

## Version Info

- **Feature Version**: 1.0.0
- **Implementation Date**: 2024-12-18
- **Svelte Version**: 5.x
- **Lines of Code**: ~910 (new) + ~210 (modified)
- **Components**: 2 new, 2 modified

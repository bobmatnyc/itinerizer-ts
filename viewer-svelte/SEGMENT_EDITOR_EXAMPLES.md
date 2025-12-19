# Segment Editor - Usage Examples

This document provides concrete examples of how to use the segment editor components.

## Example 1: Basic Flight Edit

### User Action
1. User clicks "Edit Manually" on itinerary
2. Clicks edit icon (✏️) on flight segment
3. Changes flight number from "UA123" to "UA456"
4. Changes cabin from "Economy" to "Business"
5. Clicks "Save"

### What Happens
```typescript
// SegmentEditor emits save event with:
{
  id: "segment-123",
  type: "FLIGHT",
  airline: {
    name: "United Airlines",
    code: "UA"
  },
  flightNumber: "456", // Changed
  origin: {
    name: "San Francisco",
    code: "SFO"
  },
  destination: {
    name: "Paris",
    code: "CDG"
  },
  cabin: "Business", // Changed
  status: "CONFIRMED",
  startDatetime: "2024-12-01T10:00:00Z",
  endDatetime: "2024-12-01T22:00:00Z",
  travelerIds: [],
  source: "manual"
}

// API call:
PATCH /api/itineraries/itinerary-123/segments/segment-123

// Response updates selectedItinerary store
// UI reactively updates to show new values
```

## Example 2: Add New Hotel

### User Action
1. User clicks "Edit Manually" on itinerary
2. Clicks "Add Segment" button
3. Selects "Hotel" (🏨) from type menu
4. Fills in form:
   - Hotel Name: "Grand Hotel Paris"
   - Address: "123 Rue de Rivoli"
   - City: "Paris"
   - Country: "France"
   - Room Type: "Deluxe King"
   - Check-in: 2024-12-01 15:00
   - Check-out: 2024-12-05 11:00
5. Clicks "Save"

### What Happens
```typescript
// AddSegmentModal emits save event with:
{
  type: "HOTEL",
  property: {
    name: "Grand Hotel Paris"
  },
  location: {
    name: "Grand Hotel Paris",
    address: "123 Rue de Rivoli",
    city: "Paris",
    country: "France"
  },
  roomType: "Deluxe King",
  status: "CONFIRMED",
  startDatetime: "2024-12-01T15:00:00Z",
  endDatetime: "2024-12-05T11:00:00Z",
  travelerIds: [],
  source: "manual"
}

// API call:
POST /api/itineraries/itinerary-123/segments

// Response adds new segment to itinerary
// UI shows new hotel in timeline
// Modal closes automatically
```

## Example 3: Delete Transfer

### User Action
1. User clicks "Edit Manually" on itinerary
2. Clicks delete icon (🗑️) on transfer segment
3. Confirms deletion in browser dialog

### What Happens
```typescript
// ItineraryDetail calls deleteSegment:
await deleteSegment('itinerary-123', 'segment-456');

// API call:
DELETE /api/itineraries/itinerary-123/segments/segment-456

// Response returns itinerary without deleted segment
// UI removes segment card from timeline
```

## Example 4: Validation Error

### User Action
1. User edits activity segment
2. Sets end time before start time
3. Clicks "Save"

### What Happens
```typescript
// SegmentEditor validation function catches error:
if (new Date(endDatetime) < new Date(startDatetime)) {
  validationError = 'End time must be after start time';
  return null; // Prevents save
}

// UI shows error message above form in red box
// Save button is enabled but save doesn't proceed
// User must fix the error to save
```

## Example 5: Add Custom Meeting

### User Action
1. User clicks "Add Segment"
2. Selects "Custom" (📝)
3. Fills in:
   - Title: "Client Meeting"
   - Description: "Quarterly review with ABC Corp"
   - Start: 2024-12-03 14:00
   - End: 2024-12-03 16:00
   - Status: Confirmed
   - Notes: "Bring presentation materials"
4. Clicks "Save"

### What Happens
```typescript
// Creates custom segment:
{
  type: "CUSTOM",
  title: "Client Meeting",
  description: "Quarterly review with ABC Corp",
  status: "CONFIRMED",
  startDatetime: "2024-12-03T14:00:00Z",
  endDatetime: "2024-12-03T16:00:00Z",
  notes: "Bring presentation materials",
  travelerIds: [],
  source: "manual"
}

// Posted to API
// Appears in timeline with 📝 icon
```

## Example 6: Cancel Edit

### User Action
1. User starts editing hotel segment
2. Changes hotel name and room type
3. Realizes mistake and clicks "Cancel"

### What Happens
```typescript
// SegmentEditor calls onCancel callback
// Form closes without saving
// Segment card returns to display mode
// No API call made
// editingSegmentId set back to null
```

## Example 7: Multiple Edits in Session

### User Action
1. Enter edit mode
2. Edit flight → Save
3. Add hotel → Save
4. Delete old transfer → Confirm
5. Edit activity → Save
6. Click "Done Editing"

### What Happens
```typescript
// Each operation:
// 1. Makes API call
// 2. Updates selectedItinerary
// 3. Reloads itineraries list
// 4. UI reactively updates

// After "Done Editing":
// - Edit mode disabled
// - All edit/delete icons disappear
// - Add Segment button hidden
// - Returns to normal view mode
```

## Example 8: API Error Handling

### User Action
1. User edits segment and clicks Save
2. Backend returns 500 error

### What Happens
```typescript
async function handleSaveSegment(segmentData) {
  try {
    await updateSegment(itinerary.id, segmentData.id, segmentData);
    editingSegmentId = null;
  } catch (error) {
    console.error('Failed to save segment:', error);
    alert('Failed to save segment. Please try again.');
    // Form stays open
    // User can retry or cancel
  }
}
```

## Example 9: Form State Initialization

### How Forms Initialize from Existing Segment

```typescript
$effect(() => {
  if (segment) {
    type = segment.type;
    startDatetime = formatDateTimeForInput(segment.startDatetime);
    endDatetime = formatDateTimeForInput(segment.endDatetime);
    notes = segment.notes || '';
    status = segment.status;

    switch (segment.type) {
      case 'FLIGHT':
        flightAirlineName = segment.airline.name;
        flightAirlineCode = segment.airline.code;
        flightNumber = segment.flightNumber;
        // ... etc
        break;
      // ... other types
    }
  }
});

// formatDateTimeForInput converts:
// "2024-12-01T10:00:00Z" → "2024-12-01T10:00"
// for datetime-local input compatibility
```

## Example 10: Type-Specific Validation

### Flight Validation
```typescript
case 'FLIGHT':
  if (!flightAirlineName || !flightNumber || !flightOriginName || !flightDestName) {
    validationError = 'Airline, flight number, origin, and destination are required';
    return null;
  }
  return {
    ...baseSegment,
    type: 'FLIGHT',
    airline: {
      name: flightAirlineName,
      code: flightAirlineCode || flightAirlineName.substring(0, 2).toUpperCase(),
    },
    flightNumber,
    origin: {
      name: flightOriginName,
      code: flightOriginCode || undefined,
    },
    destination: {
      name: flightDestName,
      code: flightDestCode || undefined,
    },
    cabin: flightCabin || undefined,
  };
```

### Hotel Validation
```typescript
case 'HOTEL':
  if (!hotelName) {
    validationError = 'Hotel name is required';
    return null;
  }
  return {
    ...baseSegment,
    type: 'HOTEL',
    property: {
      name: hotelName,
    },
    location: {
      name: hotelName,
      city: hotelCity || undefined,
      country: hotelCountry || undefined,
      address: hotelAddress || undefined,
    },
    roomType: roomType || undefined,
  };
```

## Component Integration Example

### How ItineraryDetail Uses Components

```svelte
<script lang="ts">
  import SegmentEditor from './SegmentEditor.svelte';
  import AddSegmentModal from './AddSegmentModal.svelte';
  import SegmentCard from './SegmentCard.svelte';

  let editMode = $state(false);
  let editingSegmentId = $state<string | null>(null);
  let showAddSegmentModal = $state(false);

  function handleEditSegment(segmentId: string) {
    editingSegmentId = segmentId;
  }

  async function handleSaveSegment(segmentData: Partial<Segment>) {
    await updateSegment(itinerary.id, segmentData.id!, segmentData);
    editingSegmentId = null;
  }
</script>

<!-- In template: -->
{#if editMode && editingSegmentId === segment.id}
  <SegmentEditor
    {segment}
    onSave={handleSaveSegment}
    onCancel={() => editingSegmentId = null}
    onDelete={() => handleDeleteSegment(segment.id)}
  />
{:else}
  <SegmentCard
    {segment}
    {editMode}
    onEdit={editMode ? () => handleEditSegment(segment.id) : undefined}
    onDelete={editMode ? () => handleDeleteSegment(segment.id) : undefined}
  />
{/if}

<AddSegmentModal
  bind:open={showAddSegmentModal}
  itineraryId={itinerary.id}
  onSegmentAdded={handleAddSegment}
/>
```

## Store Integration Example

### How Stores Coordinate Updates

```typescript
// In itineraries.ts store:

export async function updateSegment(
  itineraryId: string,
  segmentId: string,
  segmentData: Partial<Segment>
): Promise<void> {
  // 1. Call API
  const updatedItinerary = await apiClient.updateSegment(
    itineraryId,
    segmentId,
    segmentData
  );

  // 2. Update selected itinerary if it matches
  if (get(selectedItineraryId) === itineraryId) {
    selectedItinerary.set(updatedItinerary);
  }

  // 3. Reload list to update segment counts
  await loadItineraries();
}
```

## Real-World Scenario

### Complete Trip Planning Session

```
User: "I need to edit my Europe trip itinerary"

1. Opens itinerary "Trip to Europe"
2. Clicks "Edit Manually"

User: "Flight time changed"
3. Clicks ✏️ on UA123 flight
4. Changes startDatetime to 11:00 AM (was 10:00 AM)
5. Changes endDatetime to 11:00 PM (was 10:00 PM)
6. Clicks "Save"
   → API: PATCH /segments/flight-123
   → UI updates flight times

User: "Add dinner reservation"
7. Clicks "Add Segment"
8. Selects "Custom"
9. Fills in:
   - Title: "Dinner at Le Jules Verne"
   - Description: "7:30 PM reservation on Eiffel Tower"
   - Start: Dec 2, 7:30 PM
   - End: Dec 2, 10:00 PM
10. Clicks "Save"
    → API: POST /segments
    → New segment appears in Dec 2 timeline

User: "Cancel airport shuttle"
11. Clicks 🗑️ on shuttle transfer
12. Confirms deletion
    → API: DELETE /segments/shuttle-456
    → Shuttle removed from timeline

User: "Update hotel checkout"
13. Clicks ✏️ on Grand Hotel
14. Changes endDatetime to 12:00 PM (was 11:00 AM)
15. Adds note: "Late checkout requested"
16. Clicks "Save"
    → API: PATCH /segments/hotel-789
    → Hotel card updates

User: "All done!"
17. Clicks "Done Editing"
    → Edit mode disabled
    → All changes saved
    → Itinerary complete
```

## Testing Examples

### Test Case: Edit Flight Number

```typescript
// Setup
const segment = {
  id: 'flight-1',
  type: 'FLIGHT',
  flightNumber: '123',
  // ... other fields
};

// User action: Change flight number to '456'
// Expected: API receives PATCH with flightNumber: '456'
// Expected: UI shows UA456 instead of UA123
```

### Test Case: Add Hotel with Minimal Fields

```typescript
// User fills only required field: Hotel name
// Expected: Valid segment created with:
{
  type: 'HOTEL',
  property: { name: 'Test Hotel' },
  location: { name: 'Test Hotel' },
  // Optional fields are undefined
}
```

### Test Case: Validation Prevents Invalid Save

```typescript
// User sets end before start
// Expected: Error "End time must be after start time"
// Expected: Save button enabled but save doesn't proceed
// Expected: No API call made
```

## Accessibility Examples

### Keyboard Navigation

```
Tab → Focus start datetime input
Tab → Focus end datetime input
Tab → Focus status dropdown
Tab → Focus airline name input
...
Tab → Focus Save button
Enter → Submit form (save)
Esc → Cancel edit (future enhancement)
```

### Screen Reader Announcements

```
"Edit button, edit segment"
"Delete button, delete segment"
"Start Time, datetime input, 2024-12-01 at 10:00 AM"
"Airline Name, required field, text input"
"Save button"
```

## Performance Examples

### Optimized Re-rendering

```typescript
// Only edited segment re-renders
// Other segments remain unchanged
// Svelte's fine-grained reactivity prevents unnecessary updates

// Before edit: All segments static
// During edit: Only one segment shows form
// After save: Only updated segment re-renders
```

### Network Efficiency

```typescript
// Each operation makes exactly one API call
// No redundant fetches
// Optimistic updates not implemented (could be added later)

// Edit → 1 PATCH request
// Add → 1 POST request
// Delete → 1 DELETE request
```

## Advanced Usage

### Custom Segment for Meeting

```typescript
// Meeting segment example:
{
  type: "CUSTOM",
  title: "Team Standup",
  description: "Daily sync meeting",
  startDatetime: "2024-12-03T09:00:00Z",
  endDatetime: "2024-12-03T09:30:00Z",
  status: "CONFIRMED",
  notes: "Zoom link in calendar invite",
  travelerIds: [],
  source: "manual"
}
```

### Transfer with Detailed Routing

```typescript
// Transfer segment example:
{
  type: "TRANSFER",
  transferType: "PRIVATE",
  pickupLocation: {
    name: "Charles de Gaulle Airport",
    city: "Paris"
  },
  dropoffLocation: {
    name: "Grand Hotel Paris",
    city: "Paris"
  },
  startDatetime: "2024-12-01T22:30:00Z",
  endDatetime: "2024-12-01T23:30:00Z",
  status: "CONFIRMED",
  notes: "Luxury sedan, driver will hold name sign",
  travelerIds: [],
  source: "manual"
}
```

---

These examples demonstrate the full capabilities of the segment editor. For more details, see:
- `SEGMENT_EDITOR_README.md` - Complete documentation
- `SEGMENT_EDITOR_IMPLEMENTATION.md` - Technical details
- `docs/segment-editor-guide.md` - Visual guide

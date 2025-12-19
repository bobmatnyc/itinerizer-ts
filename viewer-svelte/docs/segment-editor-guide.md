# Segment Editor Visual Guide

This guide shows the UI flow and visual design of the segment editor feature.

## 1. Normal View (Display Mode)

```
┌─────────────────────────────────────────────────────┐
│ Trip to Europe                                      │
│                                                     │
│ [Edit Manually] [Edit with AI] [Delete]            │
│                                                     │
│ Dec 1, 2024 - Dec 15, 2024                         │
│ Two week trip across Europe                        │
│ Paris, London, Rome • leisure                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 5 SEGMENTS                                         │
│                                                     │
│ 📅 Monday, Dec 1                                    │
│    ┌─────────────────────────────────────────┐     │
│    │ ✈️  SFO → CDG                           │     │
│    │     United Airlines UA123               │     │
│    │     10:00 AM • 📄 Imported              │     │
│    └─────────────────────────────────────────┘     │
│    ┌─────────────────────────────────────────┐     │
│    │ 🏨  Grand Hotel Paris                   │     │
│    │     Paris                               │     │
│    │     2:00 PM • 📄 Imported               │     │
│    └─────────────────────────────────────────┘     │
│                                                     │
│ 📅 Tuesday, Dec 2                                   │
│    ┌─────────────────────────────────────────┐     │
│    │ 🎯  Eiffel Tower Tour                   │     │
│    │     Eiffel Tower                        │     │
│    │     9:00 AM • ✏️ User added             │     │
│    └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## 2. Edit Mode Enabled

```
┌─────────────────────────────────────────────────────┐
│ Trip to Europe                                      │
│                                                     │
│ [Edit Manually] [Edit with AI] [Delete]            │
│                                                     │
│ Dec 1, 2024 - Dec 15, 2024                         │
│ Two week trip across Europe                        │
│ Paris, London, Rome • leisure                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 5 SEGMENTS          [Add Segment] [Done Editing]   │
│                                                     │
│ 📅 Monday, Dec 1                                    │
│    ┌─────────────────────────────────────────┐     │
│    │ ✈️  SFO → CDG                    [✏️][🗑️]│     │
│    │     United Airlines UA123               │     │
│    │     10:00 AM • 📄 Imported              │     │
│    └─────────────────────────────────────────┘     │
│    ┌─────────────────────────────────────────┐     │
│    │ 🏨  Grand Hotel Paris            [✏️][🗑️]│     │
│    │     Paris                               │     │
│    │     2:00 PM • 📄 Imported               │     │
│    └─────────────────────────────────────────┘     │
│                                                     │
│ 📅 Tuesday, Dec 2                                   │
│    ┌─────────────────────────────────────────┐     │
│    │ 🎯  Eiffel Tower Tour            [✏️][🗑️]│     │
│    │     Eiffel Tower                        │     │
│    │     9:00 AM • ✏️ User added             │     │
│    └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## 3. Editing a Segment (Inline)

```
┌─────────────────────────────────────────────────────┐
│ 5 SEGMENTS          [Add Segment] [Done Editing]   │
│                                                     │
│ 📅 Monday, Dec 1                                    │
│    ┌─────────────────────────────────────────┐     │
│    │ Edit Segment                            │     │
│    ├─────────────────────────────────────────┤     │
│    │                                         │     │
│    │ Start Time:  [2024-12-01T10:00]        │     │
│    │ End Time:    [2024-12-01T22:00]        │     │
│    │ Status:      [Confirmed ▼]             │     │
│    │                                         │     │
│    │ Flight Details                         │     │
│    │ Airline Name:  [United Airlines    ]   │     │
│    │ Airline Code:  [UA                 ]   │     │
│    │ Flight Number: [123                ]   │     │
│    │ Origin:        [San Francisco      ]   │     │
│    │ Origin Code:   [SFO                ]   │     │
│    │ Destination:   [Paris              ]   │     │
│    │ Dest Code:     [CDG                ]   │     │
│    │ Cabin Class:   [Economy            ]   │     │
│    │                                         │     │
│    │ Notes: [Optional notes...          ]   │     │
│    │                                         │     │
│    ├─────────────────────────────────────────┤     │
│    │ [Delete]              [Cancel] [Save]   │     │
│    └─────────────────────────────────────────┘     │
│    ┌─────────────────────────────────────────┐     │
│    │ 🏨  Grand Hotel Paris            [✏️][🗑️]│     │
│    └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## 4. Add Segment Modal - Type Selection

```
┌─────────────────────────────────────────────────────┐
│                    Add Segment              [×]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Select the type of segment to add:                 │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │    ✈️     │  │    🏨     │  │    🎯     │          │
│  │  Flight  │  │  Hotel   │  │ Activity │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌──────────┐  ┌──────────┐                        │
│  │    🚗     │  │    📝     │                        │
│  │ Transfer │  │  Custom  │                        │
│  └──────────┘  └──────────┘                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 5. Add Segment Modal - Flight Form

```
┌─────────────────────────────────────────────────────┐
│                    New Segment                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Start Time:  [2024-12-03T09:00]                    │
│ End Time:    [2024-12-03T21:00]                    │
│ Status:      [Confirmed ▼]                         │
│                                                     │
│ Flight Details                                     │
│ Airline Name:  [                           ]       │
│ Airline Code:  [                           ]       │
│ Flight Number: [                           ]       │
│ Origin:        [                           ]       │
│ Origin Code:   [                           ]       │
│ Destination:   [                           ]       │
│ Dest Code:     [                           ]       │
│ Cabin Class:   [                           ]       │
│                                                     │
│ Notes: [                                   ]       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                               [Cancel] [Save]       │
└─────────────────────────────────────────────────────┘
```

## 6. Validation Error Example

```
┌─────────────────────────────────────────────────────┐
│                    Edit Segment                     │
├─────────────────────────────────────────────────────┤
│ ⚠️ End time must be after start time               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Start Time:  [2024-12-01T22:00]                    │
│ End Time:    [2024-12-01T10:00]  ← Error!          │
│ Status:      [Confirmed ▼]                         │
│                                                     │
│ ...rest of form...                                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [Delete]              [Cancel] [Save]               │
└─────────────────────────────────────────────────────┘
```

## UI Design Principles

### Colors
- **Primary Action**: Blue (#3b82f6) - Save buttons
- **Destructive Action**: Red (#dc2626) - Delete buttons
- **Neutral**: Gray (#6b7280) - Cancel, secondary text
- **Error**: Red background (#fef2f2) with dark red text (#991b1b)

### Icons
- ✏️ Edit (pencil icon)
- 🗑️ Delete (trash icon)
- ✈️ Flight
- 🏨 Hotel
- 🎯 Activity
- 🚗 Transfer
- 📝 Custom
- 📄 Imported source
- 🤖 AI-generated source
- ✏️ User-added source

### Spacing
- Card padding: 1rem (16px)
- Form group margin: 1rem
- Button gap: 0.5rem (8px)
- Section spacing: 1.5rem (24px)

### Typography
- Title: 1.125rem (18px), semibold
- Labels: 0.875rem (14px), medium weight
- Body text: 0.875rem (14px)
- Small text: 0.75rem (12px)

### Interactive States
- **Hover**: Background lightens, border color changes
- **Focus**: Blue outline ring (ring-offset)
- **Disabled**: Reduced opacity (0.5), cursor not-allowed
- **Error**: Red border, red background tint

## Responsive Behavior

### Desktop (>768px)
- Two-column layout for paired fields (e.g., start/end time)
- Full-width modal (max 600px)
- Hover states visible

### Mobile (<768px)
- Single-column form layout
- Full-width modal with padding
- Touch-optimized button sizes
- Simplified icons and spacing

## Keyboard Shortcuts (Future)

- `Escape`: Cancel editing / Close modal
- `Cmd+S`: Save (when form is focused)
- `Cmd+Enter`: Save and close
- `Tab`: Navigate between form fields

## Accessibility Features

- Semantic HTML (`<label>`, `<input>`, `<button>`)
- ARIA labels for icon buttons
- Focus management (trap focus in modal)
- Keyboard navigation support
- Screen reader announcements
- Error messages associated with fields

## Form Field Validation

### Required Fields by Type

**Flight**:
- ✅ Airline name
- ✅ Flight number
- ✅ Origin name
- ✅ Destination name
- ⚪ Airline code (optional)
- ⚪ Origin code (optional)
- ⚪ Destination code (optional)
- ⚪ Cabin class (optional)

**Hotel**:
- ✅ Hotel name
- ⚪ Address (optional)
- ⚪ City (optional)
- ⚪ Country (optional)
- ⚪ Room type (optional)

**Activity**:
- ✅ Activity name
- ✅ Location name
- ⚪ Description (optional)
- ⚪ City (optional)
- ⚪ Country (optional)

**Transfer**:
- ✅ Pickup location
- ✅ Dropoff location
- ⚪ Pickup city (optional)
- ⚪ Dropoff city (optional)
- ⚪ Transfer type (defaults to TAXI)

**Custom**:
- ✅ Title
- ⚪ Description (optional)

### Common Validation Rules

- Start time < End time (always enforced)
- All text fields: Max 500 characters
- Notes field: Max 2000 characters
- Dates: Must be valid ISO 8601 format

## Animation & Transitions

- Modal fade-in: 200ms ease
- Button hover: 200ms transition
- Form expansion: 300ms ease-out
- Error shake: 500ms (future enhancement)

## Error Messages

### Validation Errors
- "Start and end times are required"
- "End time must be after start time"
- "[Field] is required" (specific to field)
- "Airline, flight number, origin, and destination are required"

### API Errors
- "Failed to save segment. Please try again."
- "Failed to delete segment. Please try again."
- "Failed to add segment. Please try again."
- Generic: Alert dialog with error message

## Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Store Function (addSegment, updateSegment, deleteSegment)
    ↓
API Client Method (apiClient.addSegment, etc.)
    ↓
Backend API Endpoint
    ↓
Response (Updated Itinerary)
    ↓
Update Store (selectedItinerary)
    ↓
Reload Itineraries List
    ↓
UI Updates (reactive Svelte)
```

## Performance Considerations

- **Single segment edit**: Only one segment in edit mode at a time
- **Optimistic updates**: Not implemented (server is source of truth)
- **Debouncing**: Not needed (explicit save action)
- **Lazy loading**: Forms load on demand (modal)
- **Re-rendering**: Svelte's fine-grained reactivity minimizes re-renders

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Touch-optimized, full support
- IE11: Not supported (Svelte 5 requirement)

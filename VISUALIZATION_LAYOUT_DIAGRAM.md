# Visualization Pane Layout Diagram

## Desktop Layout (> 768px)

### Before (Visualization Hidden)
```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
├──────────────┬───┬──────────────────────────────────────────┤
│              │ R │                                           │
│  Left Pane   │ e │         Main Content (100%)              │
│  (350px)     │ s │         (right-pane-content)             │
│              │ i │                                           │
│  - Chat      │ z │  - Home View                             │
│  - Itinerary │ e │  - Import View                           │
│    List      │   │  - Help View                             │
│              │ H │  - Itinerary Detail                      │
│              │ a │                                           │
│              │ n │                                           │
│              │ d │                                           │
│              │ l │                                           │
│              │ e │                                           │
│              │   │                                           │
└──────────────┴───┴──────────────────────────────────────────┘
```

### After (Visualization Visible)
```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
├──────────────┬───┬─────────────────────┬────────────────────┤
│              │ R │                     │                    │
│  Left Pane   │ e │   Main Content      │  Visualization     │
│  (350px)     │ s │   (60%)             │  Pane (40%)        │
│              │ i │                     │  min-width: 400px  │
│  - Chat      │ z │  - Home View        │                    │
│  - Itinerary │ e │  - Import View      │  ┌──────────────┐  │
│    List      │   │  - Help View        │  │ Header       │  │
│              │ H │  - Itinerary Detail │  │ - Title      │  │
│              │ a │                     │  │ - Collapse   │  │
│              │ n │                     │  │ - Close      │  │
│              │ d │                     │  ├──────────────┤  │
│              │ l │                     │  │              │  │
│              │ e │                     │  │ Map/Calendar │  │
│              │   │                     │  │ Visualization│  │
│              │   │                     │  │              │  │
│              │   │                     │  ├──────────────┤  │
│              │   │                     │  │  Timeline    │  │
│              │   │                     │  │  [●] [●] [●] │  │
└──────────────┴───┴─────────────────────┴──┴──────────────┴──┘
```

## Mobile Layout (< 768px)

### Visualization Visible
```
┌────────────────────────────┐
│ Header                     │
├────────────────────────────┤
│                            │
│  Left Pane (100%)          │
│  Max Height: 50vh          │
│                            │
│  - Chat Tab                │
│  - Itineraries Tab         │
│                            │
├────────────────────────────┤
│                            │
│  Main Content (100%)       │
│                            │
│  - Current View            │
│                            │
├────────────────────────────┤
│  Visualization Pane        │
│  Max Height: 40vh          │
│                            │
│  ┌──────────────────────┐  │
│  │ Header + Controls    │  │
│  ├──────────────────────┤  │
│  │ Visualization        │  │
│  ├──────────────────────┤  │
│  │ Timeline             │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

## Component Hierarchy

```
itineraries/+page.svelte
│
├── Header
│
├── Modals (ImportModal, TextImportModal, EditItineraryModal)
│
├── .main-content
│   │
│   ├── .left-pane (350px, resizable)
│   │   ├── Chat Tab → ChatPanel
│   │   └── Itineraries Tab → ItineraryListItem[]
│   │
│   ├── .resize-handle
│   │
│   └── .right-pane-wrapper (flex: 1)
│       │
│       ├── .right-pane-content (flex: 1, or 0.6 when viz visible)
│       │   ├── HomeView
│       │   ├── ImportView
│       │   ├── HelpView
│       │   └── MainPane (Itinerary Detail)
│       │       ├── ItineraryDetail
│       │       ├── CalendarView
│       │       ├── MapView
│       │       └── TravelersView
│       │
│       └── .visualization-pane-container (flex: 0.4, conditional)
│           ├── VisualizationPane
│           └── VisualizationTimeline (conditional, when history.length > 0)
```

## CSS Flexbox Layout

```css
.main-content {
  display: flex;           /* Horizontal layout */
  flex: 1;                 /* Fill available space */
  overflow: hidden;        /* Prevent overflow */
}

.left-pane {
  flex-shrink: 0;          /* Don't shrink */
  width: 350px;            /* Fixed width (resizable) */
}

.right-pane-wrapper {
  flex: 1;                 /* Take remaining space */
  display: flex;           /* Horizontal layout */
  flex-direction: row;     /* Side-by-side */
}

.right-pane-content {
  flex: 1;                 /* Full width by default */
  transition: flex 0.3s;   /* Smooth resize */
}

.right-pane-content.with-viz {
  flex: 0.6;               /* 60% when viz visible */
}

.visualization-pane-container {
  flex: 0.4;               /* 40% of width */
  min-width: 400px;        /* Minimum width */
  display: flex;
  flex-direction: column;  /* Timeline at bottom */
}
```

## State Management

```typescript
// Reactive state from visualization store
let isPaneVisible = $derived(visualizationStore.isPaneVisible);
let historyLength = $derived(visualizationStore.history.length);

// Conditional rendering
{#if isPaneVisible}
  <div class="visualization-pane-container">
    <VisualizationPane />

    {#if historyLength > 0}
      <VisualizationTimeline />
    {/if}
  </div>
{/if}

// Conditional CSS class
<div class:with-viz={isPaneVisible}>
```

## Transitions

- **Pane visibility**: Instant show/hide (no transition on container)
- **Content width**: 0.3s smooth transition when pane appears
- **Timeline**: Appears/disappears based on history length

## Responsive Breakpoints

- **Desktop**: > 768px → Side-by-side layout (60/40 split)
- **Mobile**: ≤ 768px → Vertical stack (main content on top)

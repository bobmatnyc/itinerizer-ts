# Svelte Viewer Changelog

## 2025-12-18 - UI Enhancements

### 1. Segment Source Indicators

Added visual indicators to show the origin of each segment:

**Source Types:**
- **import** (📄 Imported) - Blue left border - Segments imported from PDF or other documents
- **agent** (🤖 Auto-generated) - Purple left border - AI-generated segments via gap filling
- **manual** (✏️ User added) - Green left border - User-created segments

**Visual Elements:**
- 4px colored left border on each segment card
- Source icon and label displayed next to time
- For agent-generated segments: displays model name and confidence score

**Example:**
```
┌─ 🤖 Auto-generated segment
│ ✈️ Flight: JFK → SLC
│ 7:00 AM · 🤖 Auto-generated
│ anthropic/claude-3-haiku · Confidence: 85%
└─────────────────────────
```

### 2. Day-Based Grouping

Segments are now organized hierarchically by date:

**Structure:**
```
📅 Tuesday, Mar 23
  [Segment 1 - 7:00 AM]
  [Segment 2 - 1:08 PM]
  [Segment 3 - 5:45 PM]

📅 Wednesday, Mar 24
  [Segment 4 - 9:00 AM]
  [Segment 5 - 2:30 PM]
```

**Features:**
- Full weekday and date display (e.g., "Friday, Sep 12")
- Calendar emoji (📅) for visual consistency
- Segments sorted chronologically within each day
- Days sorted in chronological order
- Time-only display for segments (full date in header)

### Files Modified

1. **src/lib/components/SegmentCard.svelte**
   - Added source indicator functions
   - Added colored left border based on source
   - Changed time format to show only time (not date)
   - Added source label with icon
   - Added sourceDetails display for agent-generated segments

2. **src/lib/components/ItineraryDetail.svelte**
   - Added day grouping logic with $derived.by()
   - Created SegmentsByDay interface
   - Added day header component
   - Segments now indented under day headers

### Design Principles

- **Minimal & Clean**: Subtle visual indicators, not overwhelming
- **Consistent**: Uses existing minimal design system
- **Informative**: Shows origin and confidence without clutter
- **Hierarchical**: Clear visual hierarchy (day → segments)

### Testing

Run dev server:
```bash
npm run dev
```

Type checking:
```bash
npm run check
```

View at: http://localhost:5176

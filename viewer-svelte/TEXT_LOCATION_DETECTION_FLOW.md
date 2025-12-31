# Text-Based Location Detection - Flow Diagram

## Overview
```
User Message → AI Response → Text Detection → Map Visualization
```

## Detailed Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User sends message: "I want to fly from JFK to Tokyo"      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Stream starts: sendMessageStreaming()                       │
│ - Add user message to chat                                  │
│ - Reset streaming state                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Stream events received from API:                            │
│                                                              │
│ [text] → Accumulate: "Great choice! JFK to Tokyo is..."    │
│ [text] → Accumulate: "...approximately 13 hours..."        │
│ [tool_call] → Display: "Searching flights..."              │
│ [tool_result] → Trigger visualization (existing)            │
│ [done] → Finalize message                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Message finalization (case 'done'):                         │
│                                                              │
│ 1. Clean content (remove JSON blocks)                       │
│    cleanedContent = "Great choice! JFK to Tokyo is..."      │
│                                                              │
│ 2. Add to chat messages                                     │
│    chatMessages.update([...messages, assistantMsg])         │
│                                                              │
│ 3. ⭐ NEW: Detect locations in text                         │
│    detectedMarkers = detectLocationsInText(cleanedContent)  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ detectLocationsInText(text):                                │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Airport Detection:                                      │ │
│ │ - Regex: /\b([A-Z]{3})\b/g                             │ │
│ │ - Finds: ["JFK"]                                       │ │
│ │ - Lookup: KNOWN_AIRPORTS["JFK"]                        │ │
│ │ - Result: { lat: 40.6413, lng: -73.7781, ... }         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ City Detection:                                         │ │
│ │ - Check: text.includes("Tokyo")                        │ │
│ │ - Lookup: KNOWN_CITIES["Tokyo"]                        │ │
│ │ - Result: { lat: 35.6762, lng: 139.6503 }             │ │
│ │ - Dedupe: Not within 0.5° of existing markers          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ markers = [                                                  │
│   { lat: 40.6413, lng: -73.7781, label: "JFK (...)" },     │
│   { lat: 35.6762, lng: 139.6503, label: "Tokyo" }          │
│ ]                                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Check marker count:                                          │
│                                                              │
│ if (detectedMarkers.length >= 2) {                          │
│   // Trigger visualization ✅                               │
│ } else {                                                     │
│   // Skip (need 2+ locations for route) ❌                  │
│ }                                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ (2+ markers found)
┌─────────────────────────────────────────────────────────────┐
│ visualizationStore.addVisualization('map', {                │
│   markers: [                                                 │
│     { lat: 40.6413, lng: -73.7781, ... },                  │
│     { lat: 35.6762, lng: 139.6503, ... }                   │
│   ],                                                         │
│   polylines: [{                                             │
│     points: [                                               │
│       { lat: 40.6413, lng: -73.7781 },                     │
│       { lat: 35.6762, lng: 139.6503 }                      │
│     ],                                                       │
│     color: '#3b82f6'                                        │
│   }]                                                         │
│ }, "Route: JFK (New York JFK) → Tokyo")                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Map Pane Updates:                                            │
│                                                              │
│ - visualizationStore.current = new Visualization            │
│ - visualizationStore.history.push(visualization)            │
│ - visualizationStore.isPaneVisible = true                   │
│                                                              │
│ UI renders:                                                  │
│ - Map component receives markers and polylines              │
│ - Map auto-zooms to fit all markers                         │
│ - Blue polyline connects JFK → Tokyo                        │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│ detectLocationsInText() throws error                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ try-catch in stream handler:                                 │
│                                                              │
│ catch (locationError) {                                      │
│   console.warn('Failed to detect locations:', error);       │
│   // Continue normally, don't crash chat                    │
│ }                                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Chat continues without map visualization                     │
│ - Message still displays correctly                          │
│ - No user-visible error                                     │
│ - Logged to console for debugging                           │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Comparison

### Before (Tool Result Only)
```
AI uses tool → tool_result event → extractVisualizationFromToolResult()
                                  → Map visualization
```

### After (Dual Triggers)
```
Path 1 (Existing):
AI uses tool → tool_result event → extractVisualizationFromToolResult()
                                  → Map visualization

Path 2 (NEW):
AI mentions locations → message finalized → detectLocationsInText()
                                          → Map visualization

Both paths are independent and can trigger in the same conversation!
```

## Example Timeline

```
0ms   │ User: "Fly from JFK to Tokyo"
      │
50ms  │ [connected] Stream starts
      │
200ms │ [text] "Great choice! "
      │
400ms │ [text] "JFK to Tokyo is..."
      │
600ms │ [tool_call] "search_flights"
      │
1200ms│ [tool_result] {...flight data...}
      │ ↓
      │ ✅ Map #1 (from tool result)
      │
1500ms│ [text] "I found some flights..."
      │
2000ms│ [done] Message complete
      │ ↓
      │ detectLocationsInText("Great choice! JFK to Tokyo is...")
      │ → Found: [JFK, Tokyo]
      │ ↓
      │ ✅ Map #2 (from text detection)
      │
      │ Both maps now in visualization history!
```

## Detection Algorithm Detail

```
detectLocationsInText(text: string): MapMarker[]
│
├─ Initialize
│  ├─ markers: MapMarker[] = []
│  └─ seen: Set<string> = new Set()
│
├─ Step 1: Airport Code Detection
│  ├─ Pattern: /\b([A-Z]{3})\b/g
│  ├─ For each match:
│  │  ├─ If in KNOWN_AIRPORTS
│  │  ├─ And NOT in seen Set
│  │  ├─ → Create marker
│  │  └─ → Add to seen Set
│  └─ Continue
│
├─ Step 2: City Name Detection
│  ├─ For each city in KNOWN_CITIES:
│  │  ├─ If text.includes(city)
│  │  ├─ And NOT in seen Set
│  │  ├─ And NOT within 0.5° of existing marker
│  │  ├─ → Create marker
│  │  └─ → Add to seen Set
│  └─ Continue
│
└─ Return markers
```

## Integration Points

### File: `chat.ts`

**Line 5:** Import MapMarker type
```typescript
import { visualizationStore, extractVisualizationFromToolResult, type MapMarker } from './visualization.svelte';
```

**Lines 27-81:** Location databases (KNOWN_AIRPORTS, KNOWN_CITIES)

**Lines 83-130:** Detection function (detectLocationsInText)

**Lines 384-399:** Integration in sendMessageStreaming
```typescript
case 'done':
  // ... finalize message ...

  // NEW: Detect locations
  const detectedMarkers = detectLocationsInText(cleanedContent);
  if (detectedMarkers.length >= 2) {
    visualizationStore.addVisualization(...);
  }
```

**Lines 537-552:** Integration in sendContextMessage (same logic)

## Performance Characteristics

- **Time Complexity:** O(n + m)
  - n = text length for regex scan
  - m = number of known cities (25)

- **Space Complexity:** O(k)
  - k = number of detected locations (typically 2-5)

- **Execution Time:** < 10ms for typical message (< 1000 chars)

- **No Blocking:** Runs synchronously but fast enough to not impact UX

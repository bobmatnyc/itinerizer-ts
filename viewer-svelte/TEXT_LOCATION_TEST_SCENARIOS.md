# Text-Based Location Detection - Test Scenarios

## Manual Testing Guide

### Prerequisites
1. Start the dev server: `npm run dev`
2. Navigate to Trip Designer
3. Ensure OpenRouter API key is configured in Profile

### Test Scenarios

#### ✅ Scenario 1: Simple Airport Route
**User Input:**
```
I want to fly from JFK to NRT
```

**Expected Behavior:**
- AI responds with flight information
- Map visualization automatically appears
- Shows 2 markers: "JFK (New York JFK)" and "NRT (Tokyo Narita)"
- Blue polyline connects the two airports

**Verification:**
- [ ] Map pane opens automatically
- [ ] 2 markers visible on map
- [ ] Polyline visible between markers
- [ ] Label shows "Route: JFK (New York JFK) → NRT (Tokyo Narita)"

---

#### ✅ Scenario 2: Multi-City Tour
**User Input:**
```
Plan a trip to Tokyo, Kyoto, and Osaka
```

**Expected Behavior:**
- AI responds with trip suggestions
- Map visualization shows 3 cities
- All markers labeled with city names
- Polyline connects all three cities in order

**Verification:**
- [ ] Map pane opens
- [ ] 3 city markers visible
- [ ] Polyline connects all cities
- [ ] Label shows "Route: Tokyo → Kyoto → Osaka"

---

#### ✅ Scenario 3: Mixed Airports and Cities
**User Input:**
```
Fly from LAX to London, then visit Paris
```

**Expected Behavior:**
- AI responds with travel plan
- Map shows 3 markers: LAX (airport), London (city), Paris (city)
- Polyline connects all three locations

**Verification:**
- [ ] 3 markers visible (1 airport, 2 cities)
- [ ] LAX marker labeled as "LAX (Los Angeles)"
- [ ] London and Paris city markers visible
- [ ] Continuous polyline through all points

---

#### ✅ Scenario 4: Single Location (No Map)
**User Input:**
```
Tell me about New York
```

**Expected Behavior:**
- AI responds with information about New York
- **NO** map visualization triggered (only 1 location)
- Chat continues normally

**Verification:**
- [ ] No map pane opens
- [ ] Response displays normally
- [ ] No console errors

---

#### ✅ Scenario 5: Europe Tour
**User Input:**
```
I want to visit London, Paris, Rome, and Barcelona
```

**Expected Behavior:**
- AI responds with European tour suggestions
- Map shows 4 European cities
- Polyline creates a tour route

**Verification:**
- [ ] 4 city markers visible
- [ ] All cities in Europe region
- [ ] Map auto-zooms to fit all markers
- [ ] Label shows full route

---

#### ✅ Scenario 6: Asia Hub Route
**User Input:**
```
Connect flights from SFO to HND to SIN to BKK
```

**Expected Behavior:**
- AI responds with flight routing info
- Map shows 4 airports across Asia-Pacific
- Blue polylines connect all airports

**Verification:**
- [ ] 4 airport markers: SFO, HND, SIN, BKK
- [ ] All labeled with airport codes and city names
- [ ] Polyline creates full route
- [ ] Map pans to show entire route

---

#### ✅ Scenario 7: Duplicate Detection
**User Input:**
```
Fly from JFK to New York then visit New York City
```

**Expected Behavior:**
- Only shows JFK marker (New York is too close, filtered as duplicate)
- No map triggered if only 1 unique location

**Verification:**
- [ ] No duplicate markers within 0.5° radius
- [ ] Console shows no errors
- [ ] Behavior is graceful

---

#### ✅ Scenario 8: Combo with Tool Result
**User Input:**
```
Search for flights from LAX to Tokyo and book a hotel in Shibuya
```

**Expected Behavior:**
- AI uses tools (flight search, hotel search)
- Tool results trigger visualization (existing behavior)
- Text detection also triggers (if cities mentioned in response)
- Both visualizations appear in history

**Verification:**
- [ ] Multiple visualizations in history
- [ ] Both tool-based and text-based maps work
- [ ] No conflicts or errors
- [ ] Can switch between visualizations

---

#### ✅ Scenario 9: Unknown Location (No Match)
**User Input:**
```
I want to visit Zanzibar and Reykjavik
```

**Expected Behavior:**
- AI responds normally
- No map triggered (cities not in database)
- No console errors

**Verification:**
- [ ] No map visualization
- [ ] Response displays normally
- [ ] No JavaScript errors

---

#### ✅ Scenario 10: Case Sensitivity
**User Input:**
```
I'm planning a trip to tokyo and PARIS
```

**Expected Behavior:**
- "tokyo" (lowercase) should NOT match
- "PARIS" (uppercase) should NOT match
- No map triggered (case-sensitive matching prevents false positives)

**Verification:**
- [ ] No map visualization
- [ ] Case-sensitive matching working correctly

---

## Console Debugging

### Enable Debug Logging
Open browser console and look for:
```
Stream connected: <sessionId>
```

When message completes, you should see:
```javascript
// If locations detected:
{
  type: 'map',
  data: {
    markers: [...],
    polylines: [...]
  },
  label: 'Route: ...'
}
```

### Error Scenarios
If you see:
```
Failed to detect locations in message: <error>
```
This is caught and logged, chat continues normally.

---

## Performance Verification

### Timing
- Location detection should be **instant** (< 10ms)
- No noticeable delay in message finalization
- Map rendering happens asynchronously

### Memory
- Check browser DevTools > Performance tab
- Location detection uses Set for deduplication (O(n) space)
- Regex matching is efficient for small text content

---

## Regression Testing

Ensure existing features still work:

### Tool Result Visualizations
- [ ] `tool_result` events still trigger maps
- [ ] Flight segment visualizations work
- [ ] Hotel location markers work
- [ ] Transfer route polylines work

### Message Streaming
- [ ] Text streams character by character
- [ ] Tool calls show indicators
- [ ] Structured questions appear
- [ ] Token/cost tracking updates

### Error Handling
- [ ] Invalid sessions handled gracefully
- [ ] API errors show user-friendly messages
- [ ] Network failures recoverable

---

## Expected Console Output

### Success Case
```
Stream connected: abc-123
[Location detection] Found markers: JFK, NRT
[Visualization] Added map: Route: JFK (New York JFK) → NRT (Tokyo Narita)
```

### Filtered Case (< 2 locations)
```
Stream connected: abc-123
[Location detection] Found markers: New York
[Location detection] Skipped: only 1 location (need 2+)
```

### Error Case
```
Stream connected: abc-123
Failed to detect locations in message: <error details>
```

---

## Coverage Matrix

| Airport Codes | Cities | Expected Map | Actual | Status |
|--------------|--------|--------------|--------|--------|
| 2+ airports | 0 cities | ✅ Yes | | |
| 1 airport | 1 city | ✅ Yes | | |
| 0 airports | 2+ cities | ✅ Yes | | |
| 1 location | Any | ❌ No | | |
| Unknown locations | Any | ❌ No | | |
| Mixed known/unknown | 2+ known | ✅ Yes | | |

---

## Extensibility Test

### Add Custom Airport
1. Edit `chat.ts` line 28-52
2. Add: `'DCA': { lat: 38.8521, lng: -77.0377, city: 'Washington Reagan' }`
3. Test: "Fly from DCA to JFK"
4. Expected: Map shows both airports

### Add Custom City
1. Edit `chat.ts` line 54-81
2. Add: `'Berlin': { lat: 52.5200, lng: 13.4050 }`
3. Test: "Visit Berlin and Paris"
4. Expected: Map shows both cities

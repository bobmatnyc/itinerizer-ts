# Destination Background Images Extension

## Summary

Extended destination background images to show in `ItineraryDetail.svelte` when viewing an itinerary with destinations set.

## Changes Made

### 1. ItineraryDetail.svelte - Added Destination Background

**File**: `/viewer-svelte/src/lib/components/ItineraryDetail.svelte`

#### Script Section (lines 116-127)
Added reactive variables to extract destination name and generate background URL:

```svelte
// Get first destination for background
let destinationName = $derived(
  itinerary?.destinations?.[0]?.name ||
  itinerary?.destinations?.[0]?.city ||
  null
);

let backgroundUrl = $derived(
  destinationName
    ? `https://source.unsplash.com/1600x900/?${encodeURIComponent(destinationName)},travel,city`
    : null
);
```

#### Template Section (lines 180-189)
Added background image and overlay elements:

```svelte
<div class="itinerary-detail" class:has-background={backgroundUrl}>
  {#if backgroundUrl}
    <div
      class="destination-background"
      style="background-image: url({backgroundUrl})"
    ></div>
    <div class="background-overlay"></div>
  {/if}

  <div class="detail-content h-full overflow-y-auto">
    <!-- Existing content -->
  </div>
</div>
```

#### CSS Section (lines 327-372)
Added styles for subtle background effect:

```css
.itinerary-detail {
  position: relative;
  height: 100%;
}

/* Destination background image - subtle, fixed at top */
.destination-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
  opacity: 0.15;  /* Very subtle */
  transition: opacity 1s ease-in-out;
}

/* Gradient overlay for smooth transition */
.background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(250, 250, 250, 0.5) 50%,
    rgba(250, 250, 250, 1) 100%
  );
  z-index: 1;
}

/* Content appears above background */
.detail-content {
  position: relative;
  z-index: 2;
}

/* Enhance text contrast when background is present */
.has-background .bg-minimal-card {
  background-color: rgba(255, 255, 255, 0.95);
}
```

### 2. Verified NewTripHelperView Integration

**File**: `/viewer-svelte/src/routes/itineraries/+page.svelte` (line 459)

Confirmed that `NewTripHelperView` already receives destination correctly:

```svelte
<NewTripHelperView
  onPromptSelect={handleQuickPrompt}
  destination={$selectedItinerary?.destinations?.[0]?.name || $selectedItinerary?.title}
/>
```

## Design Decisions

### 1. Subtle Background (15% opacity)
- Very subtle to avoid interfering with content readability
- Creates ambiance without distraction

### 2. Fixed Position at Top
- Background stays at top during scroll
- Only covers top 300px of viewport
- Doesn't follow content or create visual clutter

### 3. Gradient Overlay
- Smooth transition from transparent to page background color (#fafafa)
- Ensures text remains readable even over busy images
- Three-step gradient: transparent → semi-transparent → opaque

### 4. Multiple Fallback Fields
- Checks `destinations[0].name` first
- Falls back to `destinations[0].city`
- Shows no background if no destination data available

### 5. Enhanced Card Contrast
- When background is present, cards get slightly more opaque background
- `rgba(255, 255, 255, 0.95)` ensures readability

## Views with Background Images

| View | Background Source | Opacity | Position |
|------|------------------|---------|----------|
| **NewTripHelperView** | destination prop (from first destination or title) | Full with overlay | Full viewport |
| **ItineraryDetail** | First destination name/city | 15% (very subtle) | Fixed at top 300px |

## User Experience

### Before
- ItineraryDetail had plain white/gray background
- No visual connection to destination

### After
- Subtle destination-themed background at top
- Creates visual interest without distraction
- Reinforces destination context
- Maintains excellent readability
- Professional, polished look

## Technical Notes

### Unsplash Source API
- Uses same API as NewTripHelperView: `https://source.unsplash.com/1600x900/?{destination},travel,city`
- Free, no API key required
- Returns random travel/city image matching search term
- High-quality, professional travel photography

### Performance
- Single image load (1600x900 optimized for web)
- CSS transitions for smooth appearance
- Fixed positioning for optimal scroll performance
- No JavaScript reflows or repaints

### Accessibility
- Background is purely decorative
- Text contrast maintained with overlay and semi-transparent cards
- No reliance on background for information

## Testing Recommendations

1. **With Destination**: Create itinerary with destination set
   - Background should appear at top with subtle opacity
   - Content should remain fully readable
   - Gradient should smoothly transition to page background

2. **Without Destination**: View itinerary without destination
   - No background should appear
   - Layout should work identically

3. **Multiple Views**: Switch between NewTripHelperView and ItineraryDetail
   - Both should show backgrounds when destination available
   - Different opacity levels should be apparent

4. **Scroll Behavior**: Scroll itinerary detail content
   - Background should stay fixed at top
   - No jank or performance issues

## Future Enhancements

Consider adding destination backgrounds to:
- Calendar view (when calendar has destination context)
- Map view (as subtle overlay behind map)
- Travelers view (as subtle background)

---

**LOC Delta:**
- Added: ~50 lines (script variables, HTML structure, CSS)
- Removed: 0 lines
- Net Change: +50 lines
- Phase: Enhancement (Phase 2)

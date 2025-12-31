# Testing Destination Background Slideshow

## Quick Test Guide

### Prerequisites
```bash
cd viewer-svelte
npm run dev
```

Open browser to: http://localhost:5176

## Test Scenarios

### Scenario 1: Static Background (No API Key)
**Steps:**
1. Ensure `VITE_UNSPLASH_ACCESS_KEY` is NOT set in `.env`
2. Open an existing itinerary with a destination (e.g., "Croatia Business Trip")
3. Observe background images

**Expected:**
- ✅ Shows 5 rotating background images from Unsplash Source API
- ✅ Images rotate every 8 seconds
- ✅ Smooth fade transition (2 seconds)
- ✅ Subtle opacity (15%)
- ✅ Gradient overlay maintains text readability
- ✅ Small indicators at bottom show current image

### Scenario 2: API-Driven Slideshow (With API Key)
**Steps:**
1. Get free Unsplash API key from https://unsplash.com/developers
2. Add to `.env`: `VITE_UNSPLASH_ACCESS_KEY=your_key_here`
3. Restart dev server
4. Open itinerary with destination

**Expected:**
- ✅ Fetches high-quality curated images from Unsplash API
- ✅ Images specifically match destination query
- ✅ Slideshow rotates through all 5 images
- ✅ Indicators show 5 dots at bottom
- ✅ Click indicators to jump to specific image

### Scenario 3: Destination Inference from Title
**Steps:**
1. Create itinerary with title "Tokyo Adventure" (no explicit destinations)
2. View itinerary detail

**Expected:**
- ✅ Infers "Tokyo" from title
- ✅ Shows Tokyo-related travel images
- ✅ Slideshow works correctly

### Scenario 4: Multiple Destinations
**Steps:**
1. Create itinerary with multiple destinations:
   - destinations: [{ name: "Paris" }, { name: "London" }]
2. View itinerary

**Expected:**
- ✅ Shows images for FIRST destination only (Paris)
- ✅ Slideshow displays Parisian scenes

### Scenario 5: No Destination
**Steps:**
1. Create new itinerary with title "New Itinerary"
2. No destinations set
3. View itinerary

**Expected:**
- ✅ No background images shown
- ✅ Clean white background
- ✅ No errors in console

### Scenario 6: Slideshow Interaction
**Steps:**
1. Open itinerary with destination
2. Wait for slideshow to start
3. Click on indicator dots

**Expected:**
- ✅ Clicking dot 1 shows image 1
- ✅ Clicking dot 3 shows image 3
- ✅ Smooth fade transition
- ✅ Auto-rotation continues from selected image

## Visual Checklist

### Layout
- [ ] Background covers top 300px of viewport
- [ ] Images centered and cover full width
- [ ] No image distortion or stretching
- [ ] Content layered above background (z-index correct)

### Slideshow Animation
- [ ] Fade transition is smooth (2 seconds)
- [ ] No flickering or jumps
- [ ] Current image fully visible before next starts fading
- [ ] Loading state shows subtle gradient while fetching

### Indicators
- [ ] Positioned at bottom center
- [ ] White dots with subtle shadow
- [ ] Active indicator is longer (pill shape)
- [ ] Hover state scales up slightly
- [ ] Clicking changes image immediately

### Performance
- [ ] Images load progressively
- [ ] No blocking of UI during image fetch
- [ ] Smooth scrolling with background in view
- [ ] No memory leaks (check DevTools Memory)

## Browser Testing

Test in:
- [ ] Chrome/Edge (Chromium) - Latest
- [ ] Firefox - Latest
- [ ] Safari - Latest
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Network Testing

### Fast Connection
1. Normal WiFi/Ethernet
2. Images should load within 1-2 seconds
3. Smooth transitions

### Slow Connection (Throttled)
1. DevTools → Network → Throttle to "Slow 3G"
2. Images load progressively
3. Loading gradient shows while fetching
4. No blank screens or errors

### Offline
1. Disconnect network
2. View itinerary with destination
3. Should show loading state or fallback gracefully
4. No crashes or console errors

## Debugging

### Images Not Appearing
**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Verify `destinationName` is set (inspect component)
4. Check Unsplash Source API is accessible

### Slideshow Not Rotating
**Check:**
1. Verify `images` array has multiple items (DevTools Vue/Svelte panel)
2. Check `interval` prop is set (default 8000ms)
3. Ensure `$effect` cleanup isn't called prematurely
4. Console log `currentIndex` changes

### Poor Performance
**Check:**
1. DevTools Performance panel
2. Too many images? Reduce `imageCount` prop
3. Image size too large? API should return optimized sizes
4. Memory leaks? Check `$effect` cleanup

### Indicators Not Working
**Check:**
1. `images.length > 1` condition
2. Click handler on indicator buttons
3. Z-index of indicators (should be 2)
4. Pointer events not blocked

## Code Quality Checks

### TypeScript
```bash
npm run check
```
Expected: No type errors

### Linting
```bash
npm run lint
```
Expected: No ESLint errors

### Build
```bash
npm run build
```
Expected: Successful build, no warnings

## Manual Testing Results

| Scenario | Status | Notes |
|----------|--------|-------|
| Static Background (No API Key) | ⏳ Pending | - |
| API-Driven Slideshow | ⏳ Pending | - |
| Destination Inference | ⏳ Pending | - |
| Multiple Destinations | ⏳ Pending | - |
| No Destination | ⏳ Pending | - |
| Slideshow Interaction | ⏳ Pending | - |

## Known Issues

### Unsplash Source API Limitations
- Random images may repeat across refreshes
- Limited control over image selection
- No metadata (alt text is generic)

**Workaround:** Use official Unsplash API with access key for better control

### CORS Issues
- Some CDNs may block cross-origin image requests
- Unsplash Source and API are CORS-enabled

### Cache Invalidation
- Browser may cache images aggressively
- Use `&sig=${index}` param to force different images

## Production Checklist

Before deploying:
- [ ] All test scenarios pass
- [ ] Browser compatibility verified
- [ ] Performance acceptable on slow networks
- [ ] No console errors or warnings
- [ ] Accessibility verified (screen readers)
- [ ] Environment variable documented
- [ ] Fallback behavior tested

## Environment Variables

Add to `.env` (optional for better images):
```bash
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

Get free API key: https://unsplash.com/developers

**Without API key:** Falls back to Unsplash Source (random images, no auth)
**With API key:** Curated, searchable images with metadata

---

## Summary

The destination background slideshow enhances the visual experience by:
- Rotating through multiple destination images
- Smooth fade transitions
- Subtle opacity for readability
- Interactive indicators for user control
- Fallback to static images without API key
- Graceful degradation when offline

Test thoroughly before deploying to production.

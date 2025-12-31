# Quick Start - Destination Slideshow Testing

## 🚀 Quick Test (30 seconds)

### Option 1: Standalone Test Page
```bash
cd viewer-svelte
npm run dev
```

**Open in browser:**
```
http://localhost:5176/static/test-slideshow.html
```

**What you'll see:**
- Dropdown to select different destinations
- Live slideshow with rotating images
- Interactive indicators at bottom
- Sample content showing text readability

**Try this:**
1. Select "Paris" → See Parisian images
2. Select "Tokyo" → See Japanese cityscape
3. Click indicator dots → Jump between images
4. Wait 8 seconds → See auto-rotation

---

### Option 2: Full App Integration
```bash
cd viewer-svelte
npm run dev
```

**Open in browser:**
```
http://localhost:5176
```

**Steps:**
1. Click "Create New" button
2. View an existing itinerary with a destination (e.g., "Croatia Business Trip")
3. Observe slideshow in background
4. Click indicator dots to navigate
5. Verify text is readable over all images

---

## 🎨 What to Look For

### ✅ Visual Checklist
- [ ] 5 images rotate automatically
- [ ] Smooth 2-second fade transitions
- [ ] White indicator dots at bottom
- [ ] Active indicator is pill-shaped (longer)
- [ ] Background opacity is subtle (~15%)
- [ ] Text is clearly readable
- [ ] Gradient overlay visible at bottom

### ✅ Interaction Checklist
- [ ] Clicking dots changes image instantly
- [ ] Hovering over dots shows scale effect
- [ ] Auto-rotation continues after manual click
- [ ] No flickering or jumps
- [ ] Smooth, professional appearance

---

## 🔧 Test Different Destinations

Edit the test or create itineraries with these titles:

| Destination | Expected Images |
|-------------|----------------|
| Paris | Eiffel Tower, cafes, architecture |
| Tokyo | Shibuya, temples, neon lights |
| New York | Skyline, Central Park, streets |
| Iceland | Waterfalls, northern lights, glaciers |
| Bali | Beaches, temples, rice terraces |
| Swiss Alps | Mountains, lakes, villages |

---

## 🛠️ Optional: Add Unsplash API Key

For better image quality and selection:

1. **Get free API key:**
   - Visit: https://unsplash.com/developers
   - Sign up (free)
   - Create app
   - Copy "Access Key"

2. **Add to environment:**
   ```bash
   # viewer-svelte/.env
   VITE_UNSPLASH_ACCESS_KEY=your_access_key_here
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

**Difference:**
- **Without key:** Random images from Unsplash Source
- **With key:** Curated, searchable images with better relevance

---

## 🐛 Troubleshooting

### Images not showing?
**Check:**
1. Network tab in DevTools - Are Unsplash requests succeeding?
2. Console - Any errors?
3. Try standalone test page first to isolate issue

### Slideshow not rotating?
**Check:**
1. Wait 8 seconds (default interval)
2. Check console for errors
3. Verify multiple images loaded (DevTools → Network → Img filter)

### Text hard to read?
**This shouldn't happen, but if it does:**
1. Check gradient overlay is present
2. Verify opacity is 0.15 (not 1.0)
3. Cards should have white background with 95% opacity

---

## 📊 Performance Check

### DevTools → Network Tab
**Expected:**
- 5 image requests to `source.unsplash.com` or `images.unsplash.com`
- Each ~200-500KB
- Total: ~1-2MB (cached after first load)
- Load time: < 3 seconds on normal connection

### DevTools → Performance Panel
**Expected:**
- Smooth 60fps during transitions
- No frame drops
- Low CPU usage (CSS transitions)

---

## ✨ Success Criteria

### Ready for Production When:
- [x] Images load and display correctly
- [x] Slideshow rotates automatically
- [x] Fade transitions are smooth
- [x] Indicators work (click + hover)
- [x] Text is readable over all images
- [x] No console errors
- [x] Works in Chrome, Firefox, Safari
- [x] Mobile responsive (test on phone)

---

## 📝 Quick Commands Reference

```bash
# Start dev server
cd viewer-svelte && npm run dev

# Type check (optional)
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎯 Next Steps

After successful testing:

1. **Test on real itineraries:** Create trips to various destinations
2. **Mobile testing:** Open on phone/tablet
3. **Browser testing:** Try Chrome, Firefox, Safari
4. **Production deploy:** `vercel --prod` (if ready)

---

## 💡 Tips

- **Best destinations:** Cities work better than vague terms
- **Pattern matching:** Titles like "Paris Adventure" auto-detect "Paris"
- **Fallback:** No destination = clean white background (by design)
- **Performance:** Images are cached, so repeated visits are instant

---

**Need help?** Check:
- Full documentation: `DESTINATION_SLIDESHOW_IMPLEMENTATION.md`
- Test guide: `test-destination-slideshow.md`
- Component: `viewer-svelte/src/lib/components/DestinationBackgroundSlideshow.svelte`

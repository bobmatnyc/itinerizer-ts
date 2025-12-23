# Deployment Checklist for Vercel

## Pre-Deployment Verification

### 1. Build Verification
- [x] SvelteKit build succeeds (`npm run build`)
- [x] All API routes compiled
- [x] No critical TypeScript errors in routes
- [x] Adapter configured for Vercel

### 2. Environment Variables

Configure in Vercel dashboard:

**Required for full functionality:**
- `OPENROUTER_API_KEY` - Enable LLM features (import, chat, analysis)

**Optional:**
- `SERPAPI_API_KEY` - Enable travel agent web search

### 3. Directory Structure

Ensure data directories exist in project root (Vercel will create on first request):
```
data/
├── itineraries/     # JSON itinerary storage
├── uploads/         # PDF uploads
└── vectors/         # Knowledge graph embeddings
```

### 4. API Route Verification

Test these endpoints after deployment:

**Health Check:**
- GET `/api/v1/agent/models` - Should return available models

**Itineraries (no API key needed):**
- GET `/api/v1/itineraries` - List itineraries
- POST `/api/v1/itineraries` - Create itinerary

**LLM Features (requires OPENROUTER_API_KEY):**
- POST `/api/v1/agent/import/pdf` - PDF import
- POST `/api/v1/designer/sessions` - Create chat session

### 5. Vercel Configuration

**Build Settings:**
- Framework Preset: SvelteKit
- Build Command: `npm run build`
- Output Directory: `.svelte-kit/output`
- Install Command: `npm install`
- Node Version: 20.x

**Root Directory:**
- Set to `viewer-svelte` (if deploying just the viewer)
- Or leave as root (if deploying entire monorepo)

### 6. Common Issues

**Issue: "Cannot find module" errors**
- Solution: Ensure `alias` config in `svelte.config.js` points to correct paths
- Current config:
  ```javascript
  alias: {
    $services: '../src/services',
    $domain: '../src/domain'
  }
  ```

**Issue: 500 errors on API routes**
- Solution: Check Vercel function logs for stack traces
- Verify environment variables are set
- Check that storage directories have write permissions

**Issue: File uploads fail**
- Solution: Check file size limits (50MB max)
- Verify uploads directory exists and is writable
- Check Vercel function payload limits (4.5MB for Hobby, 100MB for Pro)

**Issue: Streaming responses timeout**
- Solution: Vercel has 10s timeout for Hobby, 60s for Pro
- Ensure streaming responses send data within timeout window
- Consider chunking long responses

### 7. Post-Deployment Testing

**Test with curl:**

```bash
# List itineraries
curl https://your-app.vercel.app/api/v1/itineraries

# Get models
curl https://your-app.vercel.app/api/v1/agent/models

# Create itinerary
curl -X POST https://your-app.vercel.app/api/v1/itineraries \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Trip","startDate":"2025-01-01","endDate":"2025-01-07"}'
```

**Test with frontend:**

1. Open deployed app in browser
2. Navigate through main pages (should load without errors)
3. Try creating a new itinerary
4. Test import functionality (if OPENROUTER_API_KEY configured)
5. Test chat feature (if OPENROUTER_API_KEY configured)

### 8. Monitoring

**Vercel Dashboard:**
- Monitor function invocations
- Check error rates
- Review function logs
- Monitor bandwidth usage

**Key Metrics:**
- API response times (should be <500ms for non-LLM routes)
- LLM routes (can be 5-30s depending on model)
- Error rate (should be <1%)
- Function cold start time (typically 300-800ms)

### 9. Rollback Plan

If deployment fails:
1. Revert to previous deployment in Vercel dashboard
2. Check function logs for errors
3. Test locally with `npm run preview`
4. Fix issues and redeploy

### 10. Production Optimizations

**Future improvements:**
- [ ] Add caching headers for static responses
- [ ] Implement rate limiting for API routes
- [ ] Add request logging/monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Optimize cold start time (reduce bundle size)
- [ ] Add API route authentication/authorization

## Deployment Commands

```bash
# Install Vercel CLI (if needed)
npm i -g vercel

# Deploy to preview
cd viewer-svelte
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]
```

## Success Criteria

- [x] Build completes without errors
- [ ] All API routes return expected responses
- [ ] Frontend can fetch data from API
- [ ] File uploads work correctly
- [ ] Streaming chat works (if OPENROUTER_API_KEY set)
- [ ] No 500 errors in function logs
- [ ] Response times are acceptable

## Notes

- SvelteKit handles both frontend and API routes on a single server
- All traffic goes through SvelteKit routes at `/api/v1/*`
- Services are initialized once per serverless function cold start
- File storage is ephemeral in Vercel (consider Vercel Blob for production)
- No separate Express server needed for deployment

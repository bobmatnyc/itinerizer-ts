# AI Feature Gating Implementation

Implementation of demo/localhost API key auto-fill and AI feature gating for Itinerizer.

## Overview

This implementation provides:
1. **Demo API Key Auto-Fill**: Automatically provides OpenRouter API key for localhost/authenticated users
2. **AI Feature Gating**: Disables AI-dependent features when no API key is configured
3. **User-Friendly UX**: Clear visual indicators and helpful messaging when features are disabled

## Components Modified

### 1. Demo Key API Endpoint
**File**: `/viewer-svelte/src/routes/api/auth/demo-key/+server.ts`

**Purpose**: Provides server's `OPENROUTER_API_KEY` to eligible users.

**Eligibility**:
- Request from localhost (`localhost` or `127.0.0.1` in host header)
- OR user is authenticated (has valid session cookie)

**Response**:
```json
{ "key": "sk-or-..." }  // If eligible and key exists
{ "key": null }          // If not eligible or no server key
```

**Security**: Only returns key for localhost dev or authenticated users, never in production to unauthenticated users.

---

### 2. Settings Store Enhancement
**File**: `/viewer-svelte/src/lib/stores/settings.svelte.ts`

**Added**: `hasAIAccess()` function

```typescript
export function hasAIAccess(): boolean {
  return !!settingsStore.openRouterKey?.trim();
}
```

**Purpose**: Centralized check for whether AI features should be enabled.

---

### 3. Profile Page Auto-Fill
**File**: `/viewer-svelte/src/routes/profile/+page.svelte`

**Changes**:
- Auto-fetches demo key on mount if user has no API key
- Auto-saves demo key to localStorage
- Displays "Demo key provided" badge when using demo key
- User can override with their own key at any time

**Flow**:
1. Page loads
2. Checks if user has existing API key
3. If not, calls `/api/auth/demo-key`
4. If demo key returned, auto-fills and saves it
5. Shows blue badge indicating demo key

---

### 4. ChatPanel Feature Gating
**File**: `/viewer-svelte/src/lib/components/ChatPanel.svelte`

**Changes**:
- Added `aiAccessAvailable` derived state
- Shows prominent warning banner when no AI access
- Disables textarea and send button when no access
- Links to Profile page to add API key

**Visual Design**:
- Yellow gradient banner with key icon
- Clear messaging: "AI features require an API key"
- Direct link to Profile settings
- Input disabled with clear visual feedback

---

### 5. Quick Prompts Feature Gating
**File**: `/viewer-svelte/src/lib/components/HomeView.svelte`

**Changes**:
- Added `aiAccessAvailable` check
- Quick prompt buttons disabled when no access
- Shows lock icon (🔒) on disabled buttons
- Tooltip explains "API key required"
- Greyed out appearance with reduced opacity

**Visual Design**:
- 50% opacity when disabled
- Lock icon in top-right corner
- Helpful tooltip on hover
- Prevents click when disabled

---

### 6. Import Buttons Feature Gating
**File**: `/viewer-svelte/src/routes/itineraries/+page.svelte`

**Changes**:
- Import PDF and Import Text buttons disabled without access
- Lock icon (🔒) indicator
- Tooltip with clear message
- "Create New" button remains enabled (no AI required)

**Visual Design**:
- `.ai-disabled` class applied
- Lock icon via CSS pseudo-element
- 50% opacity and greyed background
- Helpful tooltip

---

## User Experience Flow

### First-Time User (Localhost)
1. User logs in
2. Redirected to Profile page (onboarding)
3. **Demo key auto-fills automatically**
4. User sees "Demo key provided" badge
5. All AI features immediately available
6. User can optionally add their own key

### First-Time User (Production)
1. User logs in
2. Profile page shows empty API key field
3. **No demo key available** (production security)
4. AI features show disabled state
5. User must add their own OpenRouter key
6. After adding key, features unlock immediately

### User Without API Key
1. Chat panel shows yellow warning banner
2. Quick prompts show lock icons and are disabled
3. Import buttons show lock icons and are disabled
4. Tooltips explain: "API key required - visit Profile to add one"
5. All non-AI features work normally (Create New, manual editing)

### User With API Key
1. All features enabled
2. No warnings or disabled states
3. Full AI functionality available
4. Seamless experience

---

## Technical Implementation Details

### Svelte 5 Patterns Used
- **Runes**: `$state`, `$derived`, `$bindable`
- **Reactive derivation**: `let aiAccessAvailable = $derived(hasAIAccess())`
- **SSR-safe**: All checks use Svelte 5 reactive patterns

### Security Considerations
- Demo key only provided on localhost or to authenticated users
- Server `OPENROUTER_API_KEY` never exposed to unauthenticated production users
- Client-side storage (localStorage) for user convenience
- API key validation remains server-side

### Accessibility
- Clear visual indicators (icons, opacity, colors)
- Helpful tooltips with keyboard navigation support
- Links to Profile page for easy remediation
- Disabled state properly communicated to screen readers

---

## Testing Checklist

### Localhost Development
- [ ] Open app on `localhost:5176`
- [ ] Log in with demo password
- [ ] Visit Profile - should see demo key auto-filled
- [ ] Verify "Demo key provided" badge appears
- [ ] All AI features should be enabled

### Production Simulation
- [ ] Clear localStorage
- [ ] Remove `OPENROUTER_API_KEY` from `.env.local`
- [ ] Restart dev server
- [ ] All AI features should be disabled
- [ ] Chat shows yellow warning banner
- [ ] Quick prompts show lock icons
- [ ] Import buttons show lock icons
- [ ] Tooltips show helpful messages

### Manual Key Addition
- [ ] Clear demo key from Profile
- [ ] Add custom API key
- [ ] Verify all features unlock
- [ ] Verify key persists across page reloads

---

## File Changes Summary

| File | Lines Added | Lines Removed | Purpose |
|------|-------------|---------------|---------|
| `demo-key/+server.ts` | 74 | 0 | New API endpoint |
| `settings.svelte.ts` | 6 | 0 | Added hasAIAccess() |
| `profile/+page.svelte` | 18 | 4 | Auto-fill demo key |
| `ChatPanel.svelte` | 40 | 5 | Feature gating UI |
| `HomeView.svelte` | 25 | 8 | Disable quick prompts |
| `itineraries/+page.svelte` | 30 | 6 | Disable import buttons |
| **Total** | **193** | **23** | **Net: +170 lines** |

---

## Environment Variables

### Development (.env.local)
```bash
OPENROUTER_API_KEY=sk-or-v1-...  # Required for demo key feature
AUTH_PASSWORD=demo123             # Required for authentication
```

### Production (Vercel)
```bash
OPENROUTER_API_KEY=sk-or-v1-...  # Optional (server fallback)
AUTH_PASSWORD=<secure-password>   # Required
```

---

## Future Enhancements

1. **Multi-tier Access**: Different features for different API key tiers
2. **Usage Tracking**: Show API usage/costs to user
3. **Key Validation**: Verify key works before saving
4. **Team Keys**: Support for shared team API keys
5. **Rate Limiting**: Visual indicator of rate limit status

---

## Related Documentation

- Project: `/CLAUDE.md` - Overall architecture
- Auth: `/viewer-svelte/src/routes/api/auth/login/+server.ts`
- Settings: `/viewer-svelte/src/lib/stores/settings.svelte.ts`

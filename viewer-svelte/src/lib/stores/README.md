# Stores Documentation

This directory contains Svelte 5 runes-based stores for state management.

## Available Stores

### Auth Store (`auth.ts`)

Authentication state management with password verification and localStorage persistence.

**Usage:**

```svelte
<script lang="ts">
  import { authStore } from '$lib/stores/auth';

  let password = $state('');
  let errorMessage = $state('');

  async function handleLogin() {
    const success = await authStore.login(password);
    if (success) {
      // Redirect or update UI
      console.log('Login successful');
    } else {
      errorMessage = 'Invalid password';
    }
  }

  function handleLogout() {
    authStore.logout();
  }
</script>

{#if authStore.isAuthenticated}
  <p>Welcome! You are logged in.</p>
  <button onclick={handleLogout}>Logout</button>
{:else}
  <input bind:value={password} type="password" placeholder="Enter password" />
  <button onclick={handleLogin}>Login</button>
  {#if errorMessage}<p>{errorMessage}</p>{/if}
{/if}
```

**API:**

- `authStore.isAuthenticated` - Reactive boolean for auth state
- `authStore.login(password: string): Promise<boolean>` - Authenticate with password
- `authStore.logout(): void` - Clear authentication
- `authStore.checkAuth(): void` - Restore auth from localStorage (called automatically)

**Password:** Stored in `.env.local`

### Settings Store (`settings.ts`)

User settings management with localStorage persistence.

**Usage:**

```svelte
<script lang="ts">
  import { settingsStore } from '$lib/stores/settings';

  let newApiKey = $state('');

  function handleSaveApiKey() {
    settingsStore.updateApiKey(newApiKey);
    newApiKey = '';
  }
</script>

<div>
  <h2>Current API Key: {settingsStore.apiKey || 'Not set'}</h2>

  <input bind:value={newApiKey} type="text" placeholder="Enter API key" />
  <button onclick={handleSaveApiKey}>Save API Key</button>
</div>
```

**API:**

- `settingsStore.apiKey` - Reactive string for API key
- `settingsStore.updateApiKey(key: string): void` - Update and persist API key
- `settingsStore.getApiKey(): string` - Get current API key
- `settingsStore.loadSettings(): void` - Restore settings from localStorage (called automatically)
- `settingsStore.clearSettings(): void` - Clear all settings

## SSR Safety

Both stores are SSR-safe and will not attempt to access `window` or `localStorage` on the server. They automatically initialize from localStorage when running in the browser.

## Migration from Svelte 4

These stores use Svelte 5 runes (`$state`) instead of Svelte 4's writable stores. The main differences:

**Svelte 4 (writable):**
```typescript
import { writable } from 'svelte/store';
const count = writable(0);

// Subscribe
count.subscribe(value => console.log(value));

// Update
count.set(5);
count.update(n => n + 1);
```

**Svelte 5 (runes):**
```typescript
class Store {
  count = $state(0);
}
const store = new Store();

// Access directly (auto-subscribes in components)
console.log(store.count);

// Update directly
store.count = 5;
store.count += 1;
```

Benefits of Svelte 5 runes:
- Simpler syntax (no subscribe/set/update)
- Fine-grained reactivity
- Better TypeScript inference
- Automatic cleanup

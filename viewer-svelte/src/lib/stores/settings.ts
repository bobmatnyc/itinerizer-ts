/**
 * Settings Store - Svelte 5 Runes
 *
 * Manages user settings with localStorage persistence
 * and SSR-safe operations.
 */

// SSR-safe localStorage access
const isBrowser = typeof window !== 'undefined';
const API_KEY_STORAGE_KEY = 'itinerizer_api_key';

/**
 * Settings state using Svelte 5 $state rune
 */
class SettingsStore {
  apiKey = $state('');

  constructor() {
    // Initialize from localStorage on client
    if (isBrowser) {
      this.loadSettings();
    }
  }

  /**
   * Update API key and persist to localStorage
   * @param key - New API key
   */
  updateApiKey(key: string): void {
    this.apiKey = key;
    if (isBrowser) {
      if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    }
  }

  /**
   * Get current API key
   * @returns Current API key value
   */
  getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Load settings from localStorage
   */
  loadSettings(): void {
    if (!isBrowser) {
      return;
    }

    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      this.apiKey = storedKey;
    }
  }

  /**
   * Clear all settings
   */
  clearSettings(): void {
    this.apiKey = '';
    if (isBrowser) {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }
}

// Export singleton instance
export const settingsStore = new SettingsStore();

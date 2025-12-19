/**
 * Storage module exports
 * @module storage
 */

export * from './storage.interface.js';
export { JsonItineraryStorage } from './json-storage.js';
export { BlobItineraryStorage } from './blob-storage.js';
export { ConfigStorage, type AppConfig } from './config-storage.js';
export type { VectorStorage } from './vector-storage.interface.js';
export { VectraStorage } from './vectra-storage.js';

import type { ItineraryStorage } from './storage.interface.js';
import { BlobItineraryStorage } from './blob-storage.js';
import { JsonItineraryStorage } from './json-storage.js';

/**
 * Creates the appropriate storage backend based on environment
 * - Uses Vercel Blob if BLOB_READ_WRITE_TOKEN is set
 * - Falls back to filesystem JSON storage otherwise
 * @param basePath - Base directory for filesystem storage (default: ./data/itineraries)
 * @returns Storage instance
 */
export function createItineraryStorage(basePath?: string): ItineraryStorage {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new BlobItineraryStorage();
  }
  return new JsonItineraryStorage(basePath);
}

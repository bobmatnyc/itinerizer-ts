/**
 * Itinerary Service - content-level operations
 * @module services/itinerary
 */

import { createStorageError } from '../core/errors.js';
import type { StorageError } from '../core/errors.js';
import { err } from '../core/result.js';
import type { Result } from '../core/result.js';
import type { ItineraryId } from '../domain/types/branded.js';
import { generateItineraryId } from '../domain/types/branded.js';
import type { Itinerary } from '../domain/types/itinerary.js';
import type { ItineraryStorage } from '../storage/storage.interface.js';

/**
 * Service for itinerary content operations
 * Handles: get full itinerary, update full itinerary, save imported itineraries
 * Does NOT handle: collection operations (see ItineraryCollectionService)
 */
export class ItineraryService {
  constructor(private readonly storage: ItineraryStorage) {}

  /**
   * Save a fully-parsed imported itinerary
   * Used for LLM imports where the full itinerary structure is already populated
   * @param itinerary - Complete itinerary from import process
   * @returns Result with saved itinerary or storage error
   */
  async saveImported(
    itinerary: Itinerary
  ): Promise<Result<Itinerary, StorageError>> {
    // Generate new ID if not present (shouldn't happen, but safety check)
    const toSave: Itinerary = {
      ...itinerary,
      id: itinerary.id || generateItineraryId(),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.storage.save(toSave);
  }

  /**
   * Get an itinerary by ID (full itinerary with segments)
   * @param id - Itinerary ID to load
   * @returns Result with itinerary or storage error
   */
  async getItinerary(id: ItineraryId): Promise<Result<Itinerary, StorageError>> {
    return this.storage.load(id);
  }

  /**
   * Alias for backward compatibility
   * @deprecated Use getItinerary() instead
   */
  async get(id: ItineraryId): Promise<Result<Itinerary, StorageError>> {
    return this.getItinerary(id);
  }

  /**
   * Update full itinerary (including segments)
   * @param id - Itinerary ID to update
   * @param updates - Partial itinerary updates
   * @returns Result with updated itinerary or error
   */
  async updateItinerary(
    id: ItineraryId,
    updates: Partial<Itinerary>
  ): Promise<Result<Itinerary, StorageError>> {
    // Load existing itinerary
    const loadResult = await this.storage.load(id);
    if (!loadResult.success) {
      return loadResult;
    }

    const existing = loadResult.value;

    // Apply updates
    const updated: Itinerary = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    // Save updated itinerary
    return this.storage.save(updated);
  }

  /**
   * Alias for backward compatibility
   * @deprecated Use updateItinerary() for full updates or ItineraryCollectionService.updateMetadata() for metadata-only updates
   */
  async update(
    id: ItineraryId,
    updates: Partial<Itinerary>
  ): Promise<Result<Itinerary, StorageError>> {
    return this.updateItinerary(id, updates);
  }
}

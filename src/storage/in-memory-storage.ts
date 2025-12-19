/**
 * In-memory storage implementation for testing
 * @module storage/in-memory-storage
 */

import { createStorageError } from '../core/errors.js';
import type { StorageError } from '../core/errors.js';
import { ok, err } from '../core/result.js';
import type { Result } from '../core/result.js';
import type { ItineraryId } from '../domain/types/branded.js';
import type { Itinerary } from '../domain/types/itinerary.js';
import type { ItineraryStorage, ItinerarySummary } from './storage.interface.js';

/**
 * In-memory implementation of ItineraryStorage
 * Useful for testing without filesystem dependencies
 */
export class InMemoryItineraryStorage implements ItineraryStorage {
  private itineraries: Map<ItineraryId, Itinerary> = new Map();

  /**
   * Initialize storage (no-op for in-memory)
   */
  async initialize(): Promise<Result<void, StorageError>> {
    return ok(undefined);
  }

  /**
   * Save an itinerary to memory
   */
  async save(itinerary: Itinerary): Promise<Result<Itinerary, StorageError>> {
    try {
      // Update timestamps
      const now = new Date();
      const savedItinerary: Itinerary = {
        ...itinerary,
        updatedAt: now,
      };

      this.itineraries.set(itinerary.id, savedItinerary);
      return ok(savedItinerary);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to save itinerary to memory', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Load an itinerary from memory
   */
  async load(id: ItineraryId): Promise<Result<Itinerary, StorageError>> {
    const itinerary = this.itineraries.get(id);

    if (!itinerary) {
      return err(createStorageError('NOT_FOUND', `Itinerary not found: ${id}`));
    }

    return ok(itinerary);
  }

  /**
   * Delete an itinerary from memory
   */
  async delete(id: ItineraryId): Promise<Result<void, StorageError>> {
    const existed = this.itineraries.delete(id);

    if (!existed) {
      return err(createStorageError('NOT_FOUND', `Itinerary not found: ${id}`));
    }

    return ok(undefined);
  }

  /**
   * List all itineraries in memory
   */
  async list(): Promise<Result<ItinerarySummary[], StorageError>> {
    try {
      const summaries: ItinerarySummary[] = Array.from(this.itineraries.values()).map(
        (itinerary) => ({
          id: itinerary.id,
          title: itinerary.title,
          status: itinerary.status,
          startDate: itinerary.startDate,
          endDate: itinerary.endDate,
          travelerCount: itinerary.travelerCount,
          segmentCount: itinerary.segments.length,
          updatedAt: itinerary.updatedAt,
        })
      );

      // Sort by updated date (most recent first)
      summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return ok(summaries);
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', 'Failed to list itineraries', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Check if an itinerary exists
   */
  async exists(id: ItineraryId): Promise<boolean> {
    return this.itineraries.has(id);
  }

  /**
   * Clear all itineraries (useful for test cleanup)
   */
  clear(): void {
    this.itineraries.clear();
  }

  /**
   * Get count of stored itineraries
   */
  count(): number {
    return this.itineraries.size;
  }
}

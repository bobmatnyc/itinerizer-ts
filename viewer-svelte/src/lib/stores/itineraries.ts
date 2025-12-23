import { writable, derived, get } from 'svelte/store';
import type { Itinerary, ItineraryListItem, ModelConfig } from '../types';
import { apiClient } from '../api';

// Store for itinerary list
export const itineraries = writable<ItineraryListItem[]>([]);
export const itinerariesLoading = writable<boolean>(true);
export const itinerariesError = writable<string | null>(null);

// Store for selected itinerary
export const selectedItineraryId = writable<string | undefined>(undefined);
export const selectedItinerary = writable<Itinerary | null>(null);
export const selectedItineraryLoading = writable<boolean>(false);

// Store for models
export const models = writable<ModelConfig[]>([]);
export const modelsLoading = writable<boolean>(false);

// Store for import state
export const importing = writable<boolean>(false);

// Functions to interact with stores
export async function loadItineraries() {
  itinerariesLoading.set(true);
  itinerariesError.set(null);
  try {
    console.log('[Store] Fetching itineraries...');
    const data = await apiClient.getItineraries();
    console.log('[Store] Received itineraries:', data.length, data);
    itineraries.set(data);
  } catch (error) {
    console.error('[Store] Failed to load itineraries:', error);
    itinerariesError.set(error instanceof Error ? error.message : 'Failed to load itineraries');
  } finally {
    itinerariesLoading.set(false);
  }
}

export async function loadItinerary(id: string) {
  selectedItineraryLoading.set(true);
  try {
    const data = await apiClient.getItinerary(id);
    selectedItinerary.set(data);
    selectedItineraryId.set(id);
  } catch (error) {
    console.error('Failed to load itinerary:', error);
    selectedItinerary.set(null);
  } finally {
    selectedItineraryLoading.set(false);
  }
}

export async function loadModels() {
  modelsLoading.set(true);
  try {
    const data = await apiClient.getModels();
    models.set(data);
  } catch (error) {
    console.error('Failed to load models:', error);
  } finally {
    modelsLoading.set(false);
  }
}

export async function importPDF(file: File, model?: string) {
  importing.set(true);
  try {
    await apiClient.importPDF(file, model);
    // Reload itineraries after successful import
    await loadItineraries();
    return true;
  } catch (error) {
    console.error('Failed to import PDF:', error);
    throw error;
  } finally {
    importing.set(false);
  }
}

export function selectItinerary(id: string) {
  loadItinerary(id);
}

export async function createItinerary(data: {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
}): Promise<Itinerary> {
  const newItinerary = await apiClient.createItinerary(data);
  // Reload the list to include the new itinerary
  await loadItineraries();
  return newItinerary;
}

export async function updateItinerary(
  id: string,
  data: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    tripType?: string;
    tags?: string[];
  }
): Promise<void> {
  await apiClient.updateItinerary(id, data);
  // Reload the list to reflect updates
  await loadItineraries();
  // Refresh selected if it was updated
  if (get(selectedItineraryId) === id) {
    await loadItinerary(id);
  }
}

export async function deleteItinerary(id: string): Promise<void> {
  await apiClient.deleteItinerary(id);
  // Clear selection if deleted was selected
  if (get(selectedItineraryId) === id) {
    selectedItinerary.set(null);
    selectedItineraryId.set(undefined);
  }
  // Reload the list
  await loadItineraries();
}

export async function addSegment(
  itineraryId: string,
  segmentData: Partial<import('../types').Segment>
): Promise<void> {
  const updatedItinerary = await apiClient.addSegment(itineraryId, segmentData);
  // Update the selected itinerary if it matches
  if (get(selectedItineraryId) === itineraryId) {
    selectedItinerary.set(updatedItinerary);
  }
  // Reload the list to update segment counts
  await loadItineraries();
}

export async function updateSegment(
  itineraryId: string,
  segmentId: string,
  segmentData: Partial<import('../types').Segment>
): Promise<void> {
  const updatedItinerary = await apiClient.updateSegment(itineraryId, segmentId, segmentData);
  // Update the selected itinerary if it matches
  if (get(selectedItineraryId) === itineraryId) {
    selectedItinerary.set(updatedItinerary);
  }
  // Reload the list to reflect updates
  await loadItineraries();
}

export async function deleteSegment(itineraryId: string, segmentId: string): Promise<void> {
  const updatedItinerary = await apiClient.deleteSegment(itineraryId, segmentId);
  // Update the selected itinerary if it matches
  if (get(selectedItineraryId) === itineraryId) {
    selectedItinerary.set(updatedItinerary);
  }
  // Reload the list to update segment counts
  await loadItineraries();
}

/**
 * Clear all itinerary data
 * Used when logging out or switching users
 */
export function clearItineraries() {
  itineraries.set([]);
  selectedItinerary.set(null);
  selectedItineraryId.set(undefined);
  itinerariesError.set(null);
}

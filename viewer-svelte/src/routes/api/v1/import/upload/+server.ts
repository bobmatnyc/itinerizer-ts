/**
 * Upload Import API Route
 * POST /api/v1/import/upload
 * Upload file (PDF, ICS, JSON, etc.) and extract booking data
 *
 * Query params:
 * - itineraryId: Add to specific itinerary (skip matching)
 * - userId: User email for trip matching
 * - autoMatch: Auto-match to existing trips (default: true)
 * - createNewIfNoMatch: Create new trip if no match (default: false)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ImportService } from '../../../../../../../src/services/import/index.js';
import { ItineraryCollectionService } from '../../../../../../../src/services/itinerary-collection.service.js';
import { SegmentService } from '../../../../../../../src/services/segment.service.js';
import { createItineraryStorage } from '../../../../../../../src/storage/index.js';
import { OPENROUTER_API_KEY } from '$env/static/private';

/**
 * POST /api/v1/import/upload
 * Upload file and extract booking data with optional trip matching
 */
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    // Check API key
    if (!OPENROUTER_API_KEY) {
      return error(500, 'OPENROUTER_API_KEY not configured');
    }

    // Parse query parameters
    const itineraryId = url.searchParams.get('itineraryId');
    const userId = url.searchParams.get('userId');
    const autoMatch = url.searchParams.get('autoMatch') !== 'false';
    const createNewIfNoMatch = url.searchParams.get('createNewIfNoMatch') === 'true';

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return error(400, 'No file provided');
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());

    // Initialize storage and services for trip matching
    const storage = createItineraryStorage();
    const itineraryCollection = new ItineraryCollectionService(storage);
    const segmentService = new SegmentService(storage);

    // Initialize import service with trip matching support
    const importService = new ImportService({
      apiKey: OPENROUTER_API_KEY,
      itineraryCollection,
      segmentService,
    });

    // If userId provided, use trip matching
    if (userId) {
      const result = await importService.importWithMatching(
        {
          source: 'upload',
          content: buffer,
          filename: file.name,
          mimeType: file.type,
        },
        {
          userId,
          itineraryId: itineraryId ?? undefined,
          autoMatch,
          createNewIfNoMatch,
        }
      );

      // Also fetch all user itineraries to show as fallback options
      const allTripsResult = await itineraryCollection.listItinerariesByUser(userId);
      const allItineraries = allTripsResult.success ? allTripsResult.value : [];

      // Convert unmatched itineraries to TripMatch format (with 0 score)
      const matchedIds = new Set((result.tripMatches || []).map(m => m.itineraryId));
      const unmatchedSummaries = allItineraries.filter(trip => !matchedIds.has(trip.id));

      // Load full data for unmatched trips to get destinations
      const unmatchedItineraries = await Promise.all(
        unmatchedSummaries.map(async (summary) => {
          // Load full itinerary from storage to get destination info
          const fullTrip = await storage.load(summary.id);
          const destination = fullTrip.success
            ? fullTrip.value.destinations?.[0]?.name || 'Not set'
            : 'Not set';

          return {
            itineraryId: summary.id,
            itineraryName: summary.title,
            destination,
            dateRange: {
              start: summary.startDate?.toISOString() || 'Not set',
              end: summary.endDate?.toISOString() || 'Not set'
            },
            matchScore: 0,
            matchReasons: []
          };
        })
      );

      // Return matches first, then all other itineraries
      return json({
        ...result,
        tripMatches: [...(result.tripMatches || []), ...unmatchedItineraries]
      });
    }

    // Otherwise, just parse without matching
    const result = await importService.importFromUpload(
      buffer,
      file.name,
      file.type
    );

    return json(result);
  } catch (err) {
    console.error('Upload import error:', err);
    return error(500, err instanceof Error ? err.message : 'Failed to process upload');
  }
};

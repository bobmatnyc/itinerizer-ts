/**
 * Individual itinerary routes
 * GET /api/v1/itineraries/:id - Get itinerary with segments
 * PATCH /api/v1/itineraries/:id - Update itinerary metadata
 * DELETE /api/v1/itineraries/:id - Delete itinerary
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId } from '$domain/types/branded.js';

/**
 * GET /api/v1/itineraries/:id
 * Get full itinerary with segments
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { itineraryService, collectionService } = locals.services;
	const id = params.id as ItineraryId;

	if (!id) {
		throw error(400, { message: 'Missing ID parameter' });
	}

	// Use itineraryService for full itinerary (with segments)
	if (itineraryService) {
		const result = await itineraryService.getItinerary(id);
		if (!result.success) {
			throw error(404, {
				message: 'Itinerary not found: ' + result.error.message
			});
		}
		return json(result.value);
	}

	// Fallback to summary (no segments)
	const result = await collectionService.getItinerarySummary(id);
	if (!result.success) {
		throw error(404, {
			message: 'Itinerary not found: ' + result.error.message
		});
	}

	return json(result.value);
};

/**
 * PATCH /api/v1/itineraries/:id
 * Update itinerary metadata (title, description, dates, status, tags)
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { collectionService } = locals.services;
	const id = params.id as ItineraryId;

	const body = await request.json();
	const { title, description, startDate, endDate, status, tripType, tags } = body;

	const updates: Parameters<typeof collectionService.updateMetadata>[1] = {};

	if (title !== undefined) updates.title = title;
	if (description !== undefined) updates.description = description;
	if (startDate !== undefined) updates.startDate = new Date(startDate);
	if (endDate !== undefined) updates.endDate = new Date(endDate);
	if (status !== undefined) updates.status = status;
	if (tripType !== undefined) updates.tripType = tripType;
	if (tags !== undefined) updates.tags = tags;

	const result = await collectionService.updateMetadata(id, updates);

	if (!result.success) {
		throw error(404, {
			message: 'Failed to update itinerary: ' + result.error.message
		});
	}

	return json(result.value);
};

/**
 * DELETE /api/v1/itineraries/:id
 * Delete itinerary
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { collectionService } = locals.services;
	const id = params.id as ItineraryId;

	const result = await collectionService.deleteItinerary(id);

	if (!result.success) {
		throw error(404, {
			message: 'Itinerary not found: ' + result.error.message
		});
	}

	return new Response(null, { status: 204 });
};

/**
 * Individual itinerary routes
 * GET /api/v1/itineraries/:id - Get itinerary with segments (ownership verified)
 * PATCH /api/v1/itineraries/:id - Update itinerary metadata (ownership verified)
 * DELETE /api/v1/itineraries/:id - Delete itinerary (ownership verified)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId } from '$domain/types/branded.js';

/**
 * Verify that the current user owns the itinerary
 * @returns true if user owns itinerary, false otherwise
 */
async function verifyOwnership(
	id: ItineraryId,
	userEmail: string | null,
	storage: any
): Promise<boolean> {
	if (!userEmail) {
		return false;
	}

	const loadResult = await storage.load(id);
	if (!loadResult.success) {
		return false;
	}

	const itinerary = loadResult.value;
	return (
		itinerary.createdBy?.toLowerCase().trim() === userEmail.toLowerCase().trim()
	);
}

/**
 * GET /api/v1/itineraries/:id
 * Get full itinerary with segments (ownership verified)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { itineraryService, storage } = locals.services;
	const { userEmail } = locals;
	const id = params.id as ItineraryId;

	if (!id) {
		throw error(400, { message: 'Missing ID parameter' });
	}

	// Verify ownership
	const isOwner = await verifyOwnership(id, userEmail, storage);
	if (!isOwner) {
		throw error(403, {
			message: 'Access denied: You do not have permission to view this itinerary'
		});
	}

	// Use itineraryService for full itinerary (with segments)
	const result = await itineraryService.getItinerary(id);
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
 * Ownership verified before update
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { collectionService, storage } = locals.services;
	const { userEmail } = locals;
	const id = params.id as ItineraryId;

	// Verify ownership
	const isOwner = await verifyOwnership(id, userEmail, storage);
	if (!isOwner) {
		throw error(403, {
			message: 'Access denied: You do not have permission to update this itinerary'
		});
	}

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
 * Delete itinerary (ownership verified)
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { collectionService, storage } = locals.services;
	const { userEmail } = locals;
	const id = params.id as ItineraryId;

	// Verify ownership
	const isOwner = await verifyOwnership(id, userEmail, storage);
	if (!isOwner) {
		throw error(403, {
			message: 'Access denied: You do not have permission to delete this itinerary'
		});
	}

	const result = await collectionService.deleteItinerary(id);

	if (!result.success) {
		throw error(404, {
			message: 'Itinerary not found: ' + result.error.message
		});
	}

	return new Response(null, { status: 204 });
};

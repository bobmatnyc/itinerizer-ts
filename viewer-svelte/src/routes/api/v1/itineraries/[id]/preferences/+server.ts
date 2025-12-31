/**
 * Trip preferences routes
 * PATCH /api/v1/itineraries/:id/preferences - Update trip preferences
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId } from '$domain/types/branded.js';

/**
 * Verify that the current user owns the itinerary
 */
async function verifyOwnership(
	id: ItineraryId,
	userEmail: string | null,
	storage: any
): Promise<boolean> {
	if (!userEmail) return false;

	const loadResult = await storage.load(id);
	if (!loadResult.success) return false;

	const itinerary = loadResult.value;
	const createdBy = itinerary.createdBy?.toLowerCase().trim();
	const reqUser = userEmail.toLowerCase().trim();

	return createdBy === reqUser;
}

/**
 * PATCH /api/v1/itineraries/:id/preferences
 * Update trip preferences
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

	const result = await collectionService.updateTripPreferences(id, body);

	if (!result.success) {
		throw error(400, {
			message: 'Failed to update preferences: ' + result.error.message
		});
	}

	return json(result.value);
};

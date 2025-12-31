/**
 * Traveler management routes
 * POST /api/v1/itineraries/:id/travelers - Add traveler
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId, TravelerId } from '$domain/types/branded.js';
import { generateTravelerId } from '$domain/types/branded.js';
import type { Traveler } from '$domain/types/traveler.js';

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
 * POST /api/v1/itineraries/:id/travelers
 * Add a new traveler to the itinerary
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
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
	const { firstName, lastName, type, email, phone } = body;

	// Create traveler object
	const traveler: Traveler = {
		id: generateTravelerId(),
		type: type || 'ADULT',
		firstName,
		lastName,
		email,
		phone,
		loyaltyPrograms: [],
		specialRequests: [],
		metadata: {}
	};

	const result = await collectionService.addTraveler(id, traveler);

	if (!result.success) {
		throw error(400, {
			message: 'Failed to add traveler: ' + result.error.message
		});
	}

	return json(result.value);
};

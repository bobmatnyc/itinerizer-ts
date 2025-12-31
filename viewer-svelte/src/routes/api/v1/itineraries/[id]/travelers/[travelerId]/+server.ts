/**
 * Individual traveler routes
 * PATCH /api/v1/itineraries/:id/travelers/:travelerId - Update traveler
 * DELETE /api/v1/itineraries/:id/travelers/:travelerId - Remove traveler
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId, TravelerId } from '$domain/types/branded.js';

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
 * PATCH /api/v1/itineraries/:id/travelers/:travelerId
 * Update a traveler
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { collectionService, storage } = locals.services;
	const { userEmail } = locals;
	const id = params.id as ItineraryId;
	const travelerId = params.travelerId as TravelerId;

	// Verify ownership
	const isOwner = await verifyOwnership(id, userEmail, storage);
	if (!isOwner) {
		throw error(403, {
			message: 'Access denied: You do not have permission to update this itinerary'
		});
	}

	const body = await request.json();
	const { firstName, lastName, type, email, phone } = body;

	const updates: any = {};
	if (firstName !== undefined) updates.firstName = firstName;
	if (lastName !== undefined) updates.lastName = lastName;
	if (type !== undefined) updates.type = type;
	if (email !== undefined) updates.email = email;
	if (phone !== undefined) updates.phone = phone;

	const result = await collectionService.updateTraveler(id, travelerId, updates);

	if (!result.success) {
		throw error(400, {
			message: 'Failed to update traveler: ' + result.error.message
		});
	}

	return json(result.value);
};

/**
 * DELETE /api/v1/itineraries/:id/travelers/:travelerId
 * Remove a traveler
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { collectionService, storage } = locals.services;
	const { userEmail } = locals;
	const id = params.id as ItineraryId;
	const travelerId = params.travelerId as TravelerId;

	// Verify ownership
	const isOwner = await verifyOwnership(id, userEmail, storage);
	if (!isOwner) {
		throw error(403, {
			message: 'Access denied: You do not have permission to update this itinerary'
		});
	}

	const result = await collectionService.removeTraveler(id, travelerId);

	if (!result.success) {
		throw error(400, {
			message: 'Failed to remove traveler: ' + result.error.message
		});
	}

	return json(result.value);
};

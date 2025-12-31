/**
 * Itinerary collection routes
 * GET /api/v1/itineraries - List all itineraries (filtered by user)
 * POST /api/v1/itineraries - Create new itinerary (with user ownership)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { itineraryCreateSchema } from '$domain/schemas/itinerary.schema.js';

/**
 * GET /api/v1/itineraries
 * List itineraries for the current user (filtered by createdBy)
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { storage } = locals.services;
	const { userEmail } = locals;

	console.log('[GET /itineraries] userEmail:', userEmail);

	// If user is not logged in, return empty array
	if (!userEmail) {
		console.log('[GET /itineraries] No userEmail, returning empty array');
		return json([]);
	}

	// Use the storage layer's listByUser method for efficient filtering
	console.log('[GET /itineraries] Calling listByUser with:', userEmail);
	const result = await storage.listByUser(userEmail);

	if (!result.success) {
		throw error(500, {
			message: 'Failed to list itineraries: ' + result.error.message
		});
	}

	console.log('[GET /itineraries] Returning', result.value.length, 'itineraries');
	return json(result.value);
};

/**
 * POST /api/v1/itineraries
 * Create blank itinerary with user ownership
 * Body: { title, description?, startDate?, endDate?, tripType?, origin?, destinations?, tags? }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { collectionService } = locals.services;
	const { userEmail } = locals;

	// Require user to be logged in to create itineraries
	if (!userEmail) {
		throw error(401, {
			message: 'User must be logged in to create itineraries'
		});
	}

	const body = await request.json();

	// Validate using Zod schema
	const validation = itineraryCreateSchema.safeParse(body);
	if (!validation.success) {
		const errorMessages = validation.error.errors
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, {
			message: `Invalid itinerary data: ${errorMessages}`
		});
	}

	// Use validated data
	const { title, description, startDate, endDate, draft, ...rest } = body;

	// Dates are optional for new trips - trip designer will ask about them
	const result = await collectionService.createItinerary({
		...validation.data,
		description: description || '',
		startDate: startDate ? new Date(startDate) : undefined,
		endDate: endDate ? new Date(endDate) : undefined,
		draft: draft === true,
		createdBy: userEmail
	});

	if (!result.success) {
		throw error(500, {
			message: 'Failed to create itinerary: ' + result.error.message
		});
	}

	return json(
		{
			...result.value,
			isDraft: draft === true
		},
		{ status: 201 }
	);
};

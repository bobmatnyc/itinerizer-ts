/**
 * Itinerary collection routes
 * GET /api/v1/itineraries - List all itineraries
 * POST /api/v1/itineraries - Create new itinerary
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/v1/itineraries
 * List all itineraries (summaries)
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { collectionService } = locals.services;

	const result = await collectionService.listItineraries();

	if (!result.success) {
		throw error(500, {
			message: 'Failed to list itineraries: ' + result.error.message
		});
	}

	return json(result.value);
};

/**
 * POST /api/v1/itineraries
 * Create blank itinerary
 * Body: { title, description?, startDate, endDate, draft? }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { collectionService } = locals.services;

	const body = await request.json();
	const { title, description, startDate, endDate, draft } = body;

	if (!title || !startDate || !endDate) {
		throw error(400, {
			message: 'Missing required fields: title, startDate, and endDate are required'
		});
	}

	const result = await collectionService.createItinerary({
		title,
		description: description || '',
		startDate: new Date(startDate),
		endDate: new Date(endDate),
		draft: draft === true
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

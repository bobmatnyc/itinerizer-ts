/**
 * Trip Designer - Sessions routes
 * POST /api/v1/designer/sessions - Create new chat session
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId } from '$domain/types/branded.js';

/**
 * POST /api/v1/designer/sessions
 * Create a new chat session for an itinerary
 * Body: { itineraryId: string }
 * Response: { sessionId: string }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { tripDesignerService, itineraryService } = locals.services;

	if (!tripDesignerService) {
		throw error(503, {
			message: 'Trip Designer disabled: OPENROUTER_API_KEY not configured - chat functionality is disabled'
		});
	}

	const body = await request.json();
	const { itineraryId } = body;

	if (!itineraryId) {
		throw error(400, {
			message: 'Missing itineraryId: itineraryId is required in request body'
		});
	}

	// Verify itinerary exists
	const itineraryResult = await itineraryService.get(itineraryId as ItineraryId);
	if (!itineraryResult.success) {
		throw error(404, {
			message: `Itinerary not found: No itinerary found with id: ${itineraryId}`
		});
	}

	// Create session
	const sessionResult = await tripDesignerService.createSession(itineraryId as ItineraryId);

	if (!sessionResult.success) {
		throw error(500, {
			message: 'Failed to create session: ' + sessionResult.error.message
		});
	}

	return json(
		{
			sessionId: sessionResult.value
		},
		{ status: 201 }
	);
};

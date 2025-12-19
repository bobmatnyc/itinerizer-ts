/**
 * Travel Agent - Summarize route
 * POST /api/v1/agent/summarize
 * Body: { itineraryId: string }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/v1/agent/summarize
 * Generate human-readable summary of an itinerary
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { travelAgentFacade } = locals.services;

	if (!travelAgentFacade) {
		throw error(503, {
			message: 'Service unavailable: Travel agent service not configured'
		});
	}

	const body = await request.json();
	const { itineraryId } = body;

	if (!itineraryId || typeof itineraryId !== 'string') {
		throw error(400, {
			message: 'Invalid request: itineraryId is required and must be a string'
		});
	}

	const result = await travelAgentFacade.summarize(itineraryId);

	if (!result.success) {
		throw error(404, {
			message: 'Itinerary not found: ' + result.error.message
		});
	}

	return json(result.value);
};

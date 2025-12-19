/**
 * Travel Agent - Analyze route
 * POST /api/v1/agent/analyze
 * Body: { itineraryId: string }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/v1/agent/analyze
 * Analyze an itinerary for gaps, issues, and generate summary
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

	const result = await travelAgentFacade.analyze(itineraryId);

	if (!result.success) {
		throw error(404, {
			message: 'Itinerary not found: ' + result.error.message
		});
	}

	return json(result.value);
};

/**
 * Travel Agent - Fill Gaps route
 * POST /api/v1/agent/fill-gaps
 * Body: { itineraryId: string, options?: { autoApply: boolean } }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/v1/agent/fill-gaps
 * Fill geographic gaps in an itinerary intelligently
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { travelAgentFacade } = locals.services;

	if (!travelAgentFacade) {
		throw error(503, {
			message: 'Service unavailable: Travel agent service not configured'
		});
	}

	const body = await request.json();
	const { itineraryId, options } = body;

	if (!itineraryId || typeof itineraryId !== 'string') {
		throw error(400, {
			message: 'Invalid request: itineraryId is required and must be a string'
		});
	}

	const result = await travelAgentFacade.fillGaps(itineraryId, options);

	if (!result.success) {
		throw error(404, {
			message: 'Failed to fill gaps: ' + result.error.message
		});
	}

	return json(result.value);
};

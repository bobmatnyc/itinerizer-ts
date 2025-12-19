/**
 * Trip Designer - Statistics route
 * GET /api/v1/designer/stats
 * Response: { activeSessions: number }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/v1/designer/stats
 * Get Trip Designer statistics
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { tripDesignerService } = locals.services;

	if (!tripDesignerService) {
		throw error(503, {
			message: 'Trip Designer disabled: OPENROUTER_API_KEY not configured'
		});
	}

	const stats = tripDesignerService.getStats();
	return json(stats);
};

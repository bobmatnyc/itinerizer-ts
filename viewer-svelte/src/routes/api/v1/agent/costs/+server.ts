/**
 * Travel Agent - Cost tracking route
 * GET /api/v1/agent/costs
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/v1/agent/costs
 * Get cost tracking summary for LLM API usage
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { importService } = locals.services;

	if (!importService) {
		throw error(503, {
			message: 'Cost tracking disabled: OPENROUTER_API_KEY not configured'
		});
	}

	const summary = await importService.getCostSummary();
	return json(summary);
};

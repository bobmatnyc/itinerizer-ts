/**
 * Knowledge service - Statistics route
 * GET /api/v1/designer/knowledge/stats
 * Response: { totalDocuments: number, byType: object, byCategory: object }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/v1/designer/knowledge/stats
 * Get knowledge graph statistics
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { knowledgeService } = locals.services;

	if (!knowledgeService) {
		throw error(503, {
			message: 'Knowledge service disabled: OPENROUTER_API_KEY not configured - knowledge graph is disabled'
		});
	}

	const statsResult = await knowledgeService.getStats();

	if (!statsResult.success) {
		throw error(500, {
			message: 'Failed to get knowledge stats: ' + statsResult.error.message
		});
	}

	return json(statsResult.value);
};

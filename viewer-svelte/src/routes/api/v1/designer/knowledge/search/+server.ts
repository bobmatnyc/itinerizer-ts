/**
 * Knowledge service - Search route
 * POST /api/v1/designer/knowledge/search
 * Body: { query: string, topK?: number, type?: string, category?: string }
 * Response: { documents: VectorDocument[], scores: number[] }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/v1/designer/knowledge/search
 * Search knowledge graph
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { knowledgeService } = locals.services;

	if (!knowledgeService) {
		throw error(503, {
			message: 'Knowledge service disabled: OPENROUTER_API_KEY not configured - knowledge graph is disabled'
		});
	}

	const body = await request.json();
	const { query, topK, type, category } = body;

	if (!query || typeof query !== 'string') {
		throw error(400, {
			message: 'Invalid query: query must be a non-empty string'
		});
	}

	const searchResult = await knowledgeService.search(query, {
		topK,
		type,
		category
	});

	if (!searchResult.success) {
		throw error(500, {
			message: 'Search failed: ' + searchResult.error.message
		});
	}

	return json(searchResult.value);
};

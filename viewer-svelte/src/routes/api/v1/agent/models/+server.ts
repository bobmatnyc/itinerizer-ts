/**
 * Travel Agent - Available models route
 * GET /api/v1/agent/models
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AVAILABLE_MODELS } from '$services/model-selector.service.js';

/**
 * GET /api/v1/agent/models
 * Get available LLM models for import
 */
export const GET: RequestHandler = async () => {
	return json(AVAILABLE_MODELS);
};

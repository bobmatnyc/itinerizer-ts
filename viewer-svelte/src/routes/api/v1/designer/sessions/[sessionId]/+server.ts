/**
 * Trip Designer - Individual session routes
 * GET /api/v1/designer/sessions/:sessionId - Get session details
 * DELETE /api/v1/designer/sessions/:sessionId - End chat session
 * Headers: X-OpenRouter-API-Key (optional, overrides env var)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SessionId } from '$domain/types/branded.js';
import { createTripDesignerWithKey } from '$hooks/hooks.server.js';

/**
 * GET /api/v1/designer/sessions/:sessionId
 * Get session details
 * Response: TripDesignerSession
 */
export const GET: RequestHandler = async ({ params, request, locals }) => {
	// Get API key from header or use cached service
	const headerApiKey = request.headers.get('X-OpenRouter-API-Key');
	let tripDesignerService = locals.services.tripDesignerService;

	// Create on-demand service if header key provided
	if (headerApiKey) {
		tripDesignerService = await createTripDesignerWithKey(headerApiKey, locals.services);
	}

	if (!tripDesignerService) {
		throw error(503, {
			message: 'Trip Designer disabled: No API key provided. Set your OpenRouter API key in Profile settings.'
		});
	}

	const sessionId = params.sessionId as SessionId;

	const sessionResult = await tripDesignerService.getSession(sessionId);

	if (!sessionResult.success) {
		throw error(404, {
			message: `Session not found: No session found with id: ${sessionId}`
		});
	}

	return json(sessionResult.value);
};

/**
 * DELETE /api/v1/designer/sessions/:sessionId
 * Delete a chat session
 * Used to clean up sessions when switching itineraries or removing orphaned sessions
 */
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	// Get API key from header or use cached service
	const headerApiKey = request.headers.get('X-OpenRouter-API-Key');
	let tripDesignerService = locals.services.tripDesignerService;

	// Create on-demand service if header key provided
	if (headerApiKey) {
		tripDesignerService = await createTripDesignerWithKey(headerApiKey, locals.services);
	}

	if (!tripDesignerService) {
		throw error(503, {
			message: 'Trip Designer disabled: No API key provided. Set your OpenRouter API key in Profile settings.'
		});
	}

	const sessionId = params.sessionId as SessionId;

	// Delete the session
	const deleteResult = await tripDesignerService.deleteSession(sessionId);

	if (!deleteResult.success) {
		// If session not found, still return success (idempotent delete)
		if (deleteResult.error.code === 'NOT_FOUND') {
			return new Response(null, { status: 204 });
		}

		throw error(500, {
			message: `Failed to delete session: ${deleteResult.error.message}`
		});
	}

	return new Response(null, { status: 204 });
};

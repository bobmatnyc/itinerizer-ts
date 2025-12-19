/**
 * Trip Designer - Individual session routes
 * GET /api/v1/designer/sessions/:sessionId - Get session details
 * DELETE /api/v1/designer/sessions/:sessionId - End chat session
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SessionId } from '$domain/types/branded.js';

/**
 * GET /api/v1/designer/sessions/:sessionId
 * Get session details
 * Response: TripDesignerSession
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { tripDesignerService } = locals.services;

	if (!tripDesignerService) {
		throw error(503, {
			message: 'Trip Designer disabled: OPENROUTER_API_KEY not configured'
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
 * End a chat session
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { tripDesignerService } = locals.services;

	if (!tripDesignerService) {
		throw error(503, {
			message: 'Trip Designer disabled: OPENROUTER_API_KEY not configured'
		});
	}

	const sessionId = params.sessionId as SessionId;

	// Get session to verify it exists
	const sessionResult = await tripDesignerService.getSession(sessionId);

	if (!sessionResult.success) {
		throw error(404, {
			message: `Session not found: No session found with id: ${sessionId}`
		});
	}

	// TODO: Add endSession method to TripDesignerService
	// For now, just return success
	return new Response(null, { status: 204 });
};

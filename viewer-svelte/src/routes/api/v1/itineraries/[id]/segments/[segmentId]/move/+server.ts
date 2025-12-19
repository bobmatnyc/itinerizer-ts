/**
 * Segment move with cascade route
 * POST /api/v1/itineraries/:id/segments/:segmentId/move
 * Body: { newStartDatetime: string, cascadeMode?: 'auto' | 'dependencies-only' }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId, SegmentId } from '$domain/types/branded.js';

/**
 * POST /api/v1/itineraries/:id/segments/:segmentId/move
 * Move a segment with cascade adjustments
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { dependencyService } = locals.services;
	const itineraryId = params.id as ItineraryId;
	const segmentId = params.segmentId as SegmentId;

	const body = await request.json();
	const { newStartDatetime, cascadeMode } = body;

	if (!newStartDatetime) {
		throw error(400, {
			message: 'Missing required field: newStartDatetime is required'
		});
	}

	const result = await dependencyService.moveSegmentWithCascade(
		itineraryId,
		segmentId,
		new Date(newStartDatetime),
		cascadeMode || 'auto'
	);

	if (!result.success) {
		const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
		throw error(statusCode, {
			message: 'Failed to move segment: ' + result.error.message
		});
	}

	return json(result.value);
};

/**
 * Segment reorder route
 * POST /api/v1/itineraries/:id/segments/reorder
 * Body: { segmentIds: SegmentId[] }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId, SegmentId } from '$domain/types/branded.js';

/**
 * POST /api/v1/itineraries/:id/segments/reorder
 * Reorder segments by providing new order
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { segmentService } = locals.services;
	const itineraryId = params.id as ItineraryId;

	const body = await request.json();
	const { segmentIds } = body;

	if (!Array.isArray(segmentIds)) {
		throw error(400, {
			message: 'Invalid request: segmentIds must be an array'
		});
	}

	const result = await segmentService.reorder(itineraryId, segmentIds as SegmentId[]);

	if (!result.success) {
		const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
		throw error(statusCode, {
			message: 'Failed to reorder segments: ' + result.error.message
		});
	}

	return json(result.value);
};

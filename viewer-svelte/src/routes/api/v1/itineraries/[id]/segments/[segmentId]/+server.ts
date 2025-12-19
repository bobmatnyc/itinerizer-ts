/**
 * Individual segment routes
 * GET /api/v1/itineraries/:id/segments/:segmentId - Get segment
 * PATCH /api/v1/itineraries/:id/segments/:segmentId - Update segment
 * DELETE /api/v1/itineraries/:id/segments/:segmentId - Delete segment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId, SegmentId } from '$domain/types/branded.js';

/**
 * GET /api/v1/itineraries/:id/segments/:segmentId
 * Get a single segment
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { segmentService } = locals.services;
	const itineraryId = params.id as ItineraryId;
	const segmentId = params.segmentId as SegmentId;

	const result = await segmentService.get(itineraryId);

	if (!result.success) {
		throw error(404, {
			message: 'Itinerary not found: ' + result.error.message
		});
	}

	const segment = result.value.segments.find((s) => s.id === segmentId);

	if (!segment) {
		throw error(404, {
			message: `No segment found with id: ${segmentId}`
		});
	}

	return json(segment);
};

/**
 * PATCH /api/v1/itineraries/:id/segments/:segmentId
 * Update a segment
 * Body: Partial<Segment>
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { segmentService } = locals.services;
	const itineraryId = params.id as ItineraryId;
	const segmentId = params.segmentId as SegmentId;

	const updates = await request.json();

	// Convert date strings to Date objects if present
	if (updates.startDatetime) {
		updates.startDatetime = new Date(updates.startDatetime);
	}
	if (updates.endDatetime) {
		updates.endDatetime = new Date(updates.endDatetime);
	}

	const result = await segmentService.update(itineraryId, segmentId, updates);

	if (!result.success) {
		const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
		throw error(statusCode, {
			message: 'Failed to update segment: ' + result.error.message
		});
	}

	return json(result.value);
};

/**
 * DELETE /api/v1/itineraries/:id/segments/:segmentId
 * Delete a segment
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { segmentService } = locals.services;
	const itineraryId = params.id as ItineraryId;
	const segmentId = params.segmentId as SegmentId;

	const result = await segmentService.delete(itineraryId, segmentId);

	if (!result.success) {
		const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
		throw error(statusCode, {
			message: 'Failed to delete segment: ' + result.error.message
		});
	}

	return json(result.value);
};

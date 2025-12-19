/**
 * Segments collection routes
 * GET /api/v1/itineraries/:id/segments - List all segments
 * POST /api/v1/itineraries/:id/segments - Add new segment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId } from '$domain/types/branded.js';

/**
 * GET /api/v1/itineraries/:id/segments
 * List all segments in an itinerary
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { segmentService } = locals.services;
	const itineraryId = params.id as ItineraryId;

	const result = await segmentService.get(itineraryId);

	if (!result.success) {
		throw error(404, {
			message: 'Itinerary not found: ' + result.error.message
		});
	}

	return json(result.value.segments);
};

/**
 * POST /api/v1/itineraries/:id/segments
 * Add a new segment to an itinerary
 * Body: Partial<Segment> (without id, or with explicit id)
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { segmentService } = locals.services;
	const itineraryId = params.id as ItineraryId;

	const segmentData = await request.json();

	if (!segmentData.startDatetime || !segmentData.endDatetime || !segmentData.type) {
		throw error(400, {
			message: 'Missing required fields: startDatetime, endDatetime, and type are required'
		});
	}

	// Convert date strings to Date objects
	const segment = {
		...segmentData,
		startDatetime: new Date(segmentData.startDatetime),
		endDatetime: new Date(segmentData.endDatetime)
	};

	const result = await segmentService.add(itineraryId, segment);

	if (!result.success) {
		const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
		throw error(statusCode, {
			message: 'Failed to add segment: ' + result.error.message
		});
	}

	return json(result.value, { status: 201 });
};

/**
 * Segments collection routes
 * GET /api/v1/itineraries/:id/segments - List all segments
 * POST /api/v1/itineraries/:id/segments - Add new segment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ItineraryId } from '$domain/types/branded.js';
import { segmentSchema } from '$domain/schemas/segment.schema.js';

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
 * Body: Segment (validated by segmentSchema)
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { segmentService } = locals.services;
	const itineraryId = params.id as ItineraryId;

	const segmentData = await request.json();

	// Validate using Zod schema
	const validation = segmentSchema.safeParse(segmentData);
	if (!validation.success) {
		const errorMessages = validation.error.errors
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, {
			message: `Invalid segment data: ${errorMessages}`
		});
	}

	// Use validated data (already has proper types and defaults)
	const segment = {
		...validation.data,
		// Ensure dates are Date objects (Zod dateSchema handles conversion)
		startDatetime: new Date(validation.data.startDatetime),
		endDatetime: new Date(validation.data.endDatetime)
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

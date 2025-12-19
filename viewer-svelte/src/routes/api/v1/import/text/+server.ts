/**
 * Text Import API Route
 * POST /api/v1/import/text
 *
 * Import travel itineraries from plain text (emails, notes, confirmations)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Text import request body
 */
interface TextImportRequest {
	title: string;
	text: string;
	apiKey: string;
}

/**
 * POST /api/v1/import/text
 * Import an itinerary from plain text using LLM parsing
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Parse request body
		const body: TextImportRequest = await request.json();
		const { title, text, apiKey } = body;

		// Validate inputs
		if (!title || !title.trim()) {
			throw error(400, {
				message: 'Title is required'
			});
		}

		if (!text || !text.trim()) {
			throw error(400, {
				message: 'Text is required'
			});
		}

		if (!apiKey || !apiKey.trim()) {
			throw error(400, {
				message: 'API key is required'
			});
		}

		// Dynamic import of LLMService to avoid serverless issues
		const { LLMService } = await import('../../../../../../../src/services/llm.service.js');

		// Create LLM service instance with the provided API key
		const llmService = new LLMService({
			apiKey: apiKey.trim(),
			costTrackingEnabled: false, // Disable for serverless
		});

		console.log(`Parsing text import: "${title}" (${text.length} chars)`);

		// Parse the text using LLM
		// The text is already in plain format, so we use it directly
		// The LLM will extract segments from the raw text
		const llmResult = await llmService.parseItinerary(text.trim());

		if (!llmResult.success) {
			console.error('LLM parsing failed:', llmResult.error);
			throw error(500, {
				message: `Failed to parse travel text: ${llmResult.error.message}`
			});
		}

		const { itinerary: parsedItinerary } = llmResult.value;

		// Override the title with the user-provided one
		const itinerary = {
			...parsedItinerary,
			title: title.trim(),
		};

		// Save the itinerary using the itinerary service
		const { itineraryService } = locals.services;
		const saveResult = await itineraryService.saveImported(itinerary);

		if (!saveResult.success) {
			console.error('Failed to save itinerary:', saveResult.error);
			throw error(500, {
				message: `Failed to save itinerary: ${saveResult.error.message}`
			});
		}

		console.log(`Successfully imported itinerary: ${itinerary.id}`);

		return json({
			success: true,
			itineraryId: itinerary.id,
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('Text import error:', err);
		throw error(500, {
			message: err instanceof Error ? err.message : 'Unknown error occurred'
		});
	}
};

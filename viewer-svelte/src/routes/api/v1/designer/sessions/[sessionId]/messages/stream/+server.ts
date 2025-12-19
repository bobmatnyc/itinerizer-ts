/**
 * Trip Designer - Streaming messages route
 * POST /api/v1/designer/sessions/:sessionId/messages/stream
 * Body: { message: string }
 * Response: SSE stream
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SessionId } from '$domain/types/branded.js';

/**
 * POST /api/v1/designer/sessions/:sessionId/messages/stream
 * Send a message to a chat session with SSE streaming
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { tripDesignerService } = locals.services;

	if (!tripDesignerService) {
		throw error(503, {
			message: 'Trip Designer disabled: OPENROUTER_API_KEY not configured'
		});
	}

	const sessionId = params.sessionId as SessionId;

	const body = await request.json();
	const { message } = body;

	if (!message || typeof message !== 'string') {
		throw error(400, {
			message: 'Invalid message: message must be a non-empty string'
		});
	}

	// Create a ReadableStream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			// Helper to write SSE events
			const writeEvent = (event: string, data: unknown) => {
				controller.enqueue(encoder.encode(`event: ${event}\n`));
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			try {
				// Send initial connection event
				writeEvent('connected', { status: 'connected' });

				// Stream the chat response
				for await (const event of tripDesignerService.chatStream(sessionId, message)) {
					// Map StreamEvent to SSE format
					switch (event.type) {
						case 'text':
							writeEvent('text', { content: event.content });
							break;

						case 'tool_call':
							writeEvent('tool_call', { name: event.name, arguments: event.arguments });
							break;

						case 'tool_result':
							writeEvent('tool_result', {
								name: event.name,
								result: event.result,
								success: event.success
							});
							break;

						case 'structured_questions':
							writeEvent('structured_questions', { questions: event.questions });
							break;

						case 'done':
							writeEvent('done', {
								itineraryUpdated: event.itineraryUpdated,
								segmentsModified: event.segmentsModified || [],
								tokens: event.tokens,
								cost: event.cost
							});
							break;

						case 'error':
							writeEvent('error', { message: event.message });
							break;
					}
				}

				// Close the stream
				controller.close();
			} catch (streamError) {
				// Send error event
				writeEvent('error', {
					message: streamError instanceof Error ? streamError.message : 'Stream error'
				});
				controller.close();
			}
		}
	});

	// Return SSE response
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no' // Disable nginx buffering
		}
	});
};

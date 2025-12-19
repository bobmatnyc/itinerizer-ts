/**
 * Travel Agent - PDF Import route
 * POST /api/v1/agent/import/pdf
 * Body: multipart/form-data with 'file' field and optional 'model' field
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * POST /api/v1/agent/import/pdf
 * Import a PDF document and convert to itinerary
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { importService } = locals.services;

	if (!importService) {
		throw error(503, {
			message: 'Import disabled: OPENROUTER_API_KEY not configured - import functionality is disabled'
		});
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const model = formData.get('model') as string | null;

	if (!file) {
		throw error(400, {
			message: 'No file uploaded: Please upload a PDF file'
		});
	}

	// Validate file type
	if (file.type !== 'application/pdf') {
		throw error(400, {
			message: 'Invalid file type: Only PDF files are allowed'
		});
	}

	// Validate file size (50MB limit)
	const maxSize = 50 * 1024 * 1024;
	if (file.size > maxSize) {
		throw error(400, {
			message: `File too large: Maximum file size is ${maxSize / 1024 / 1024}MB`
		});
	}

	try {
		// Save file to uploads directory
		const projectRoot = path.join(process.cwd(), '../..');
		const uploadsDir = path.join(projectRoot, 'data', 'uploads');
		await mkdir(uploadsDir, { recursive: true });

		const timestamp = Date.now();
		const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
		const filename = `${timestamp}-${sanitizedName}`;
		const filePath = path.join(uploadsDir, filename);

		// Write file to disk
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		await writeFile(filePath, buffer);

		// Import with validation
		const result = await importService.importWithValidation(filePath, {
			model: model || undefined,
			saveToStorage: true,
			validateContinuity: true,
			fillGaps: true
		});

		if (!result.success) {
			throw error(500, {
				message: 'Import failed: ' + result.error.message
			});
		}

		const importResult = result.value;

		return json({
			success: true,
			itinerary: importResult.parsedItinerary,
			usage: importResult.usage,
			continuityValidation: importResult.continuityValidation
		});
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, {
			message: 'Internal server error: ' + (err instanceof Error ? err.message : String(err))
		});
	}
};

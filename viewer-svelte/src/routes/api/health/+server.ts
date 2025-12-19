/**
 * Health check endpoint - minimal, no service dependencies
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		environment: process.env.VERCEL === '1' ? 'vercel' : 'local',
		hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN
	});
};

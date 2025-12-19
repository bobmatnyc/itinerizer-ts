/**
 * SvelteKit server hooks - Services initialization for Vercel deployment
 *
 * Initializes core services with Vercel-compatible configuration:
 * - Uses Blob storage when BLOB_READ_WRITE_TOKEN is set
 * - Skips filesystem-dependent services on Vercel
 * - Initializes optional services only when API keys are configured
 *
 * @module hooks.server
 */

import type { Handle } from '@sveltejs/kit';
import { createItineraryStorage } from '../../src/storage/index.js';
import type { ItineraryStorage } from '../../src/storage/index.js';
import { ItineraryService } from '../../src/services/itinerary.service.js';
import { ItineraryCollectionService } from '../../src/services/itinerary-collection.service.js';
import { SegmentService } from '../../src/services/segment.service.js';
import { DependencyService } from '../../src/services/dependency.service.js';
import { DocumentImportService } from '../../src/services/document-import.service.js';
import type { ImportConfig } from '../../src/domain/types/import.js';
import { TravelAgentService } from '../../src/services/travel-agent.service.js';
import type { TravelAgentConfig } from '../../src/services/travel-agent.service.js';
import { TravelAgentFacade } from '../../src/services/travel-agent-facade.service.js';
import { TripDesignerService } from '../../src/services/trip-designer/trip-designer.service.js';
import type { TripDesignerConfig } from '../../src/domain/types/trip-designer.js';
import { KnowledgeService } from '../../src/services/knowledge.service.js';
import type { KnowledgeConfig } from '../../src/services/knowledge.service.js';

/**
 * Services available to all API routes
 */
interface Services {
	storage: ItineraryStorage;
	itineraryService: ItineraryService;
	collectionService: ItineraryCollectionService;
	segmentService: SegmentService;
	dependencyService: DependencyService;
	importService: DocumentImportService | null;
	travelAgentService: TravelAgentService | null;
	travelAgentFacade: TravelAgentFacade;
	tripDesignerService: TripDesignerService | null;
	knowledgeService: KnowledgeService | null;
}

let servicesInstance: Services | null = null;

/**
 * Initialize services with Vercel compatibility
 */
async function initializeServices(): Promise<Services> {
	if (servicesInstance) {
		console.log('Using cached services instance');
		return servicesInstance;
	}

	const isVercel = process.env.VERCEL === '1';
	console.log('Initializing services...', {
		isVercel,
		hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
		nodeEnv: process.env.NODE_ENV
	});

	try {
		// CORE SERVICES - Required for all operations

		// Storage - auto-detects Blob vs JSON based on BLOB_READ_WRITE_TOKEN
		const storage = createItineraryStorage();
		const initResult = await storage.initialize();

		if (!initResult.success) {
			throw new Error('Storage initialization failed');
		}
		console.log('✅ Storage initialized');

		// Core services
		const itineraryService = new ItineraryService(storage);
		const collectionService = new ItineraryCollectionService(storage);
		const segmentService = new SegmentService(storage);
		const dependencyService = new DependencyService(storage);
		console.log('✅ Core services initialized');

		// OPTIONAL SERVICES - Only initialize if API keys are configured

		// Import service - requires OPENROUTER_API_KEY
		let importService: DocumentImportService | null = null;
		const importApiKey = process.env.OPENROUTER_API_KEY;

		if (importApiKey) {
			const importConfig: ImportConfig = {
				apiKey: importApiKey,
				costTrackingEnabled: false, // Disable for Vercel (no filesystem)
			};
			importService = new DocumentImportService(importConfig, itineraryService);
			console.log('✅ Import service initialized');
		} else {
			console.log('⚠️  Import service disabled (no OPENROUTER_API_KEY)');
		}

		// Travel Agent service - requires SERPAPI_KEY
		let travelAgentService: TravelAgentService | null = null;
		const serpApiKey = process.env.SERPAPI_KEY;

		if (serpApiKey) {
			const travelAgentConfig: TravelAgentConfig = {
				apiKey: serpApiKey,
			};
			travelAgentService = new TravelAgentService(travelAgentConfig);
			console.log('✅ Travel Agent service initialized');
		} else {
			console.log('⚠️  Travel Agent service disabled (no SERPAPI_KEY)');
		}

		// Travel Agent Facade - always available (wraps review/continuity services)
		const travelAgentFacade = new TravelAgentFacade(itineraryService, travelAgentService);
		console.log('✅ Travel Agent Facade initialized');

		// Trip Designer service - requires OPENROUTER_API_KEY
		let tripDesignerService: TripDesignerService | null = null;
		const tripDesignerApiKey = process.env.OPENROUTER_API_KEY;

		if (tripDesignerApiKey) {
			const tripDesignerConfig: TripDesignerConfig = {
				apiKey: tripDesignerApiKey,
			};
			tripDesignerService = new TripDesignerService(
				tripDesignerConfig,
				undefined, // Use default in-memory session storage
				{
					itineraryService,
					segmentService,
					dependencyService,
					travelAgentFacade,
				}
			);
			console.log('✅ Trip Designer service initialized');
		} else {
			console.log('⚠️  Trip Designer service disabled (no OPENROUTER_API_KEY)');
		}

		// Knowledge service - requires OPENROUTER_API_KEY and filesystem (skip on Vercel)
		let knowledgeService: KnowledgeService | null = null;

		if (!isVercel && process.env.OPENROUTER_API_KEY) {
			try {
				// Import filesystem-dependent services only when not on Vercel
				const { VectraStorage } = await import('../../src/storage/vectra-storage.js');
				const { EmbeddingService } = await import('../../src/services/embedding.service.js');

				const vectorStorage = new VectraStorage('./data/vectra');
				const embeddingService = new EmbeddingService({
					apiKey: process.env.OPENROUTER_API_KEY,
				});

				knowledgeService = new KnowledgeService(vectorStorage, embeddingService);
				await knowledgeService.initialize();
				console.log('✅ Knowledge service initialized');
			} catch (error) {
				console.warn('⚠️  Knowledge service initialization failed:', error);
			}
		} else {
			console.log('⚠️  Knowledge service disabled (Vercel or no API key)');
		}

		servicesInstance = {
			storage,
			itineraryService,
			collectionService,
			segmentService,
			dependencyService,
			importService,
			travelAgentService,
			travelAgentFacade,
			tripDesignerService,
			knowledgeService,
		};

		console.log('✅ All services initialized successfully');
		return servicesInstance;
	} catch (error) {
		console.error('❌ Service initialization failed:', {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});
		throw error;
	}
}

/**
 * SvelteKit handle hook
 */
export const handle: Handle = async ({ event, resolve }) => {
	console.log(`Request: ${event.request.method} ${event.url.pathname}`);

	try {
		// Initialize services on first request
		const services = await initializeServices();

		// Make services available to all API routes via locals
		event.locals.services = services;

		const response = await resolve(event);
		console.log(`Response: ${event.request.method} ${event.url.pathname} - ${response.status}`);

		return response;
	} catch (error) {
		console.error('Hook error:', {
			path: event.url.pathname,
			method: event.request.method,
			error: {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			}
		});

		// For API routes, return JSON error
		if (event.url.pathname.startsWith('/api/')) {
			return new Response(
				JSON.stringify({
					error: 'Service initialization failed',
					message: error instanceof Error ? error.message : String(error),
					path: event.url.pathname,
					timestamp: new Date().toISOString()
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// For page routes, return minimal HTML error
		return new Response(
			`<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
	<h1>Service Error</h1>
	<p>${error instanceof Error ? error.message : String(error)}</p>
</body>
</html>`,
			{
				status: 500,
				headers: { 'Content-Type': 'text/html' }
			}
		);
	}
};

// Export type for use in +server.ts files
export type { Services };

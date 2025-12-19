/**
 * SvelteKit server hooks - Service initialization for API routes
 * @module hooks.server
 */

import { createItineraryStorage } from '$services/../storage/index.js';
import type { ItineraryStorage } from '$services/../storage/storage.interface.js';
import { YamlConfigStorage } from '$services/../storage/yaml-config.js';
import { ItineraryService } from '$services/itinerary.service.js';
import { ItineraryCollectionService } from '$services/itinerary-collection.service.js';
import { SegmentService } from '$services/segment.service.js';
import { DependencyService } from '$services/dependency.service.js';
import { DocumentImportService } from '$services/document-import.service.js';
import { TripDesignerService } from '$services/trip-designer/trip-designer.service.js';
import { TravelAgentService } from '$services/travel-agent.service.js';
import { TravelAgentFacade } from '$services/travel-agent-facade.service.js';
import { KnowledgeService } from '$services/knowledge.service.js';
import { EmbeddingService } from '$services/embedding.service.js';
import { VectraStorage } from '$services/../storage/vectra-storage.js';
import type { ImportConfig } from '$domain/types/import.js';
import type { Handle } from '@sveltejs/kit';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Detect Vercel serverless environment
 * On Vercel, filesystem is read-only and certain services must be disabled
 */
const isVercel = process.env.VERCEL === '1' || !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Services singleton
 * Initialized once and reused across requests
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
	knowledgeService: KnowledgeService | undefined;
}

let servicesInstance: Services | null = null;

/**
 * Initialize services once
 */
async function initializeServices(): Promise<Services> {
	if (servicesInstance) {
		console.log('ℹ️  Using cached services instance');
		return servicesInstance;
	}

	try {
		console.log('🚀 Starting service initialization...');
		console.log('Environment:', { isVercel, hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN });

		// Step 1: Ensure directories exist
		console.log('Step 1: Setting up directories...');
		const projectRoot = path.join(__dirname, '../../..');
		const dataDir = path.join(projectRoot, 'data');
		const uploadsDir = path.join(dataDir, 'uploads');
		const itinerariesDir = path.join(dataDir, 'itineraries');

		// Only create directories if not using Vercel Blob
		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			console.log('Creating directories:', { uploadsDir, itinerariesDir });
			await fs.mkdir(uploadsDir, { recursive: true });
			await fs.mkdir(itinerariesDir, { recursive: true });
			console.log('✅ Directories created');
		} else {
			console.log('✅ Using Vercel Blob storage (skipping directory creation)');
		}

		// Step 2: Initialize storage
		console.log('Step 2: Initializing storage...');
		const storage = createItineraryStorage(itinerariesDir);
		console.log('Storage instance created, calling initialize()...');
		const initResult = await storage.initialize();

		if (!initResult.success) {
			throw new Error(`Failed to initialize storage: ${initResult.error.message}`);
		}
		console.log('✅ Storage initialized');

		// Step 3: Initialize core services
		console.log('Step 3: Creating core services...');
		const itineraryService = new ItineraryService(storage);
		const collectionService = new ItineraryCollectionService(storage);
		const segmentService = new SegmentService(storage);
		const dependencyService = new DependencyService(storage);
		console.log('✅ Core services created');

		// Step 4: Load configuration
		console.log('Step 4: Loading configuration...');
		let importConfig: ImportConfig | undefined;

		if (isVercel) {
			// On Vercel, skip yaml config file (doesn't exist) and only use environment variables
			const envApiKey = process.env.OPENROUTER_API_KEY;

			if (envApiKey) {
				importConfig = {
					apiKey: envApiKey,
					costTrackingEnabled: false // Can't write to filesystem on Vercel
				};
				console.log('✅ Using API key from OPENROUTER_API_KEY environment variable (Vercel mode)');
			} else {
				console.warn('⚠️  No API key configured - import/chat functionality disabled');
				console.warn('   Set OPENROUTER_API_KEY environment variable in Vercel');
			}
		} else {
			// Local development: try yaml config first, then env var
			const configStorage = new YamlConfigStorage();
			const configResult = await configStorage.getImportConfig();

			if (configResult.success) {
				importConfig = configResult.value;
				console.log('✅ Loaded configuration from .itinerizer/config.yaml');
			} else {
				// Fall back to environment variable
				const envApiKey = process.env.OPENROUTER_API_KEY;

				if (envApiKey) {
					importConfig = {
						apiKey: envApiKey,
						costTrackingEnabled: true,
						costLogPath: path.join(dataDir, 'imports', 'cost-log.json')
					};
					console.log('✅ Using API key from OPENROUTER_API_KEY environment variable');
				} else {
					console.warn('⚠️  No API key configured - import/chat functionality disabled');
					console.warn('   Add your key to .itinerizer/config.yaml or set OPENROUTER_API_KEY');
				}
			}
		}

		// Step 5: Initialize import service
		console.log('Step 5: Initializing import service...');
		const importService = importConfig
			? new DocumentImportService(importConfig, itineraryService)
			: null;
		console.log(importService ? '✅ Import service created' : 'ℹ️  Import service disabled (no API key)');

		// Step 6: Initialize knowledge service (skip on Vercel - requires filesystem)
		console.log('Step 6: Initializing knowledge service...');
		let knowledgeService: KnowledgeService | undefined;
		if (importConfig?.apiKey && !isVercel) {
			try {
				const vectorStorage = new VectraStorage(path.join(dataDir, 'vectors'));
				const embeddingService = new EmbeddingService({
					apiKey: importConfig.apiKey
				});
				knowledgeService = new KnowledgeService(vectorStorage, embeddingService, {
					namespace: 'travel-knowledge',
					topK: 5,
					similarityThreshold: 0.7
				});

				// Initialize asynchronously
				knowledgeService.initialize().catch((error) => {
					console.warn('Failed to initialize knowledge service:', error);
				});
				console.log('✅ Knowledge service created');
			} catch (error) {
				console.warn('Failed to create knowledge service:', error);
			}
		} else if (isVercel && importConfig?.apiKey) {
			console.log('ℹ️  Knowledge service disabled on Vercel (requires filesystem access)');
		} else {
			console.log('ℹ️  Knowledge service disabled (no API key or Vercel environment)');
		}

		// Step 7: Initialize Travel Agent service
		console.log('Step 7: Initializing Travel Agent service...');
		const travelAgentService = importConfig?.serpapi?.apiKey
			? new TravelAgentService({
					apiKey: importConfig.serpapi.apiKey,
					...(importConfig.apiKey ? { thinkingModel: 'anthropic/claude-sonnet-4-20250514' } : {})
				})
			: null;
		console.log(travelAgentService ? '✅ Travel Agent service created' : 'ℹ️  Travel Agent service disabled (no SerpAPI key)');

		console.log('Step 8: Creating Travel Agent facade...');
		const travelAgentFacade = new TravelAgentFacade(itineraryService, travelAgentService);
		console.log('✅ Travel Agent facade created');

		// Step 9: Initialize Trip Designer service
		console.log('Step 9: Initializing Trip Designer service...');
		const tripDesignerService = importConfig?.apiKey
			? new TripDesignerService(
					{ apiKey: importConfig.apiKey },
					undefined, // Use default in-memory session storage
					{
						itineraryService,
						segmentService,
						dependencyService,
						...(knowledgeService ? { knowledgeService } : {}),
						travelAgentFacade
					}
				)
			: null;
		console.log(tripDesignerService ? '✅ Trip Designer service created' : 'ℹ️  Trip Designer service disabled (no API key)');

		// Step 10: Assemble services instance
		console.log('Step 10: Assembling services instance...');
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
			knowledgeService
		};

		console.log('✅ Services initialized for SvelteKit');

		return servicesInstance;
	} catch (error) {
		console.error('❌ Service initialization failed:', {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			name: error instanceof Error ? error.name : typeof error
		});
		throw error;
	}
}

/**
 * SvelteKit handle hook
 * Initializes services and makes them available in locals
 */
export const handle: Handle = async ({ event, resolve }) => {
	try {
		console.log(`📥 Request: ${event.request.method} ${event.url.pathname}`);

		// Initialize services on first request
		const services = await initializeServices();

		// Make services available to all API routes via locals
		event.locals.services = services;

		const response = await resolve(event);
		console.log(`📤 Response: ${event.request.method} ${event.url.pathname} - ${response.status}`);

		return response;
	} catch (error) {
		console.error('❌ Hook error:', {
			path: event.url.pathname,
			method: event.request.method,
			error: {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				name: error instanceof Error ? error.name : typeof error
			}
		});

		// For API routes, return JSON error
		if (event.url.pathname.startsWith('/api/')) {
			return new Response(
				JSON.stringify({
					error: 'Service initialization failed',
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					path: event.url.pathname,
					timestamp: new Date().toISOString()
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// For page routes, return HTML error page
		return new Response(
			`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Service Initialization Error</title>
	<style>
		body {
			font-family: system-ui, -apple-system, sans-serif;
			max-width: 800px;
			margin: 50px auto;
			padding: 20px;
			background: #f5f5f5;
		}
		.error-box {
			background: white;
			border-left: 4px solid #dc2626;
			padding: 20px;
			border-radius: 4px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		h1 { color: #dc2626; margin-top: 0; }
		pre {
			background: #f9fafb;
			padding: 15px;
			border-radius: 4px;
			overflow-x: auto;
			font-size: 12px;
		}
		.meta { color: #6b7280; font-size: 14px; margin-top: 20px; }
	</style>
</head>
<body>
	<div class="error-box">
		<h1>⚠️ Service Initialization Failed</h1>
		<p><strong>Path:</strong> ${event.url.pathname}</p>
		<p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
		${error instanceof Error && error.stack ? `<pre>${error.stack}</pre>` : ''}
		<div class="meta">
			<p>Timestamp: ${new Date().toISOString()}</p>
			<p>This error occurred during service initialization. Check the server logs for more details.</p>
		</div>
	</div>
</body>
</html>`,
			{
				status: 500,
				headers: { 'Content-Type': 'text/html; charset=utf-8' }
			}
		);
	}
};

// Export type for use in +server.ts files
export type { Services };

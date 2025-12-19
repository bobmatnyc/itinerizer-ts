/**
 * Travel Agent Router
 * Smart input/output for itineraries - analysis, validation, enhancement, import
 * @module server/routers/travel-agent
 */

import { Router, type Request, type Response } from 'express';
import type { DocumentImportService } from '../../services/document-import.service.js';
import { AVAILABLE_MODELS } from '../../services/model-selector.service.js';
import type { Multer } from 'multer';
import type { TravelAgentFacade } from '../../services/travel-agent-facade.service.js';

export function createTravelAgentRouter(
  importService: DocumentImportService | null,
  upload: Multer,
  travelAgentFacade?: TravelAgentFacade
): Router {
  const router = Router();

  /**
   * POST /api/v1/agent/analyze
   * Analyze an itinerary for gaps, issues, and generate summary
   * Body: { itineraryId: string }
   */
  router.post('/analyze', async (req: Request, res: Response) => {
    try {
      if (!travelAgentFacade) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Travel agent service not configured',
        });
      }

      const { itineraryId } = req.body;

      if (!itineraryId || typeof itineraryId !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'itineraryId is required and must be a string',
        });
      }

      // Analyze itinerary using facade
      const result = await travelAgentFacade.analyze(itineraryId);

      if (!result.success) {
        return res.status(404).json({
          error: 'Itinerary not found',
          message: result.error.message,
        });
      }

      res.json(result.value);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/v1/agent/summarize
   * Generate human-readable summary of an itinerary
   * Body: { itineraryId: string }
   */
  router.post('/summarize', async (req: Request, res: Response) => {
    try {
      if (!travelAgentFacade) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Travel agent service not configured',
        });
      }

      const { itineraryId } = req.body;

      if (!itineraryId || typeof itineraryId !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'itineraryId is required and must be a string',
        });
      }

      // Summarize itinerary using facade
      const result = await travelAgentFacade.summarize(itineraryId);

      if (!result.success) {
        return res.status(404).json({
          error: 'Itinerary not found',
          message: result.error.message,
        });
      }

      res.json(result.value);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/v1/agent/fill-gaps
   * Fill geographic gaps in an itinerary intelligently
   * Body: { itineraryId: string, options?: { autoApply: boolean } }
   */
  router.post('/fill-gaps', async (req: Request, res: Response) => {
    try {
      if (!travelAgentFacade) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Travel agent service not configured',
        });
      }

      const { itineraryId, options } = req.body;

      if (!itineraryId || typeof itineraryId !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'itineraryId is required and must be a string',
        });
      }

      // Fill gaps using facade
      const result = await travelAgentFacade.fillGaps(itineraryId, options);

      if (!result.success) {
        return res.status(404).json({
          error: 'Failed to fill gaps',
          message: result.error.message,
        });
      }

      res.json(result.value);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/v1/agent/import/pdf
   * Import a PDF document and convert to itinerary
   * Body: multipart/form-data with 'file' field and optional 'model' field
   */
  router.post('/import/pdf', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!importService) {
        return res.status(503).json({
          error: 'Import disabled',
          message: 'OPENROUTER_API_KEY not configured - import functionality is disabled',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please upload a PDF file',
        });
      }

      const filePath = req.file.path;
      const model = req.body.model as string | undefined;

      // Import with validation
      const result = await importService.importWithValidation(filePath, {
        model: model || undefined,
        saveToStorage: true,
        validateContinuity: true,
        fillGaps: true,
      });

      if (!result.success) {
        return res.status(500).json({
          error: 'Import failed',
          message: result.error.message,
          details: result.error.details,
        });
      }

      const importResult = result.value;

      res.json({
        success: true,
        itinerary: importResult.parsedItinerary,
        usage: importResult.usage,
        continuityValidation: importResult.continuityValidation,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/v1/agent/costs
   * Get cost tracking summary for LLM API usage
   */
  router.get('/costs', async (_req: Request, res: Response) => {
    try {
      if (!importService) {
        return res.status(503).json({
          error: 'Cost tracking disabled',
          message: 'OPENROUTER_API_KEY not configured',
        });
      }

      const summary = await importService.getCostSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/v1/agent/models
   * Get available LLM models for import
   */
  router.get('/models', (_req: Request, res: Response) => {
    res.json(AVAILABLE_MODELS);
  });

  return router;
}

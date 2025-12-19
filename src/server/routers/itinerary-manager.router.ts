/**
 * Itinerary Manager Router
 * Manages segments and dependencies within a single itinerary
 * @module server/routers/itinerary-manager
 */

import { Router, type Request, type Response } from 'express';
import type { SegmentService } from '../../services/segment.service.js';
import type { DependencyService } from '../../services/dependency.service.js';
import type { ItineraryId, SegmentId } from '../../domain/types/branded.js';
import type { Segment } from '../../domain/types/segment.js';

export function createItineraryManagerRouter(
  segmentService: SegmentService,
  dependencyService: DependencyService
): Router {
  const router = Router();

  /**
   * GET /api/v1/itineraries/:id/segments
   * List all segments in an itinerary
   * Note: Currently requires loading full itinerary. Consider dedicated endpoint in future.
   */
  router.get('/:id/segments', async (req: Request, res: Response) => {
    try {
      const itineraryId = req.params.id as ItineraryId;

      // Use SegmentService to get all segments
      const result = await segmentService.get(itineraryId);

      if (!result.success) {
        return res.status(404).json({
          error: 'Itinerary not found',
          message: result.error.message,
        });
      }

      res.json(result.value.segments);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/v1/itineraries/:id/segments
   * Add a new segment to an itinerary
   * Body: Partial<Segment> (without id, or with explicit id)
   */
  router.post('/:id/segments', async (req: Request, res: Response) => {
    try {
      const itineraryId = req.params.id as ItineraryId;
      const segmentData = req.body;

      if (!segmentData.startDatetime || !segmentData.endDatetime || !segmentData.type) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'startDatetime, endDatetime, and type are required',
        });
      }

      // Convert date strings to Date objects
      const segment = {
        ...segmentData,
        startDatetime: new Date(segmentData.startDatetime),
        endDatetime: new Date(segmentData.endDatetime),
      };

      const result = await segmentService.add(itineraryId, segment);

      if (!result.success) {
        const error = result.error;
        const statusCode = error.type === 'NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          error: 'Failed to add segment',
          message: error.message,
        });
      }

      res.status(201).json(result.value);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/v1/itineraries/:id/segments/:segmentId
   * Get a single segment
   */
  router.get('/:id/segments/:segmentId', async (req: Request, res: Response) => {
    try {
      const itineraryId = req.params.id as ItineraryId;
      const segmentId = req.params.segmentId as SegmentId;

      const result = await segmentService.get(itineraryId);

      if (!result.success) {
        return res.status(404).json({
          error: 'Itinerary not found',
          message: result.error.message,
        });
      }

      const segment = result.value.segments.find((s) => s.id === segmentId);

      if (!segment) {
        return res.status(404).json({
          error: 'Segment not found',
          message: `No segment found with id: ${segmentId}`,
        });
      }

      res.json(segment);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * PATCH /api/v1/itineraries/:id/segments/:segmentId
   * Update a segment
   * Body: Partial<Segment>
   */
  router.patch('/:id/segments/:segmentId', async (req: Request, res: Response) => {
    try {
      const itineraryId = req.params.id as ItineraryId;
      const segmentId = req.params.segmentId as SegmentId;
      const updates = req.body;

      // Convert date strings to Date objects if present
      if (updates.startDatetime) {
        updates.startDatetime = new Date(updates.startDatetime);
      }
      if (updates.endDatetime) {
        updates.endDatetime = new Date(updates.endDatetime);
      }

      const result = await segmentService.update(itineraryId, segmentId, updates);

      if (!result.success) {
        const error = result.error;
        const statusCode = error.type === 'NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          error: 'Failed to update segment',
          message: error.message,
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
   * DELETE /api/v1/itineraries/:id/segments/:segmentId
   * Delete a segment
   */
  router.delete('/:id/segments/:segmentId', async (req: Request, res: Response) => {
    try {
      const itineraryId = req.params.id as ItineraryId;
      const segmentId = req.params.segmentId as SegmentId;

      const result = await segmentService.delete(itineraryId, segmentId);

      if (!result.success) {
        const error = result.error;
        const statusCode = error.type === 'NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          error: 'Failed to delete segment',
          message: error.message,
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
   * POST /api/v1/itineraries/:id/segments/reorder
   * Reorder segments by providing new order
   * Body: { segmentIds: SegmentId[] }
   */
  router.post('/:id/segments/reorder', async (req: Request, res: Response) => {
    try {
      const itineraryId = req.params.id as ItineraryId;
      const { segmentIds } = req.body;

      if (!Array.isArray(segmentIds)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'segmentIds must be an array',
        });
      }

      const result = await segmentService.reorder(itineraryId, segmentIds as SegmentId[]);

      if (!result.success) {
        const error = result.error;
        const statusCode = error.type === 'NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          error: 'Failed to reorder segments',
          message: error.message,
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
   * POST /api/v1/itineraries/:id/segments/:segmentId/move
   * Move a segment with cascade adjustments
   * Body: { newStartDatetime: string, cascadeMode?: 'auto' | 'dependencies-only' }
   */
  router.post('/:id/segments/:segmentId/move', async (req: Request, res: Response) => {
    try {
      const itineraryId = req.params.id as ItineraryId;
      const segmentId = req.params.segmentId as SegmentId;
      const { newStartDatetime, cascadeMode } = req.body;

      if (!newStartDatetime) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'newStartDatetime is required',
        });
      }

      const result = await dependencyService.moveSegmentWithCascade(
        itineraryId,
        segmentId,
        new Date(newStartDatetime),
        cascadeMode || 'auto'
      );

      if (!result.success) {
        const error = result.error;
        const statusCode = error.type === 'NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          error: 'Failed to move segment',
          message: error.message,
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

  return router;
}

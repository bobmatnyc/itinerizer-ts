/**
 * Tests for LLM Evaluator Service
 * @module tests/services/llm-evaluator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LLMEvaluatorService } from '../../src/services/llm-evaluator.service.js';
import type { TestCase, ModelTestResult } from '../../src/services/llm-evaluator.service.js';
import type { Itinerary } from '../../src/domain/types/itinerary.js';
import { generateItineraryId, generateSegmentId, generateTravelerId } from '../../src/domain/types/branded.js';
import { ok } from '../../src/core/result.js';
import type { AgentMode } from '../../src/domain/types/agent.js';

describe('LLMEvaluatorService', () => {
  let evaluator: LLMEvaluatorService;

  beforeEach(() => {
    evaluator = new LLMEvaluatorService();
  });

  describe('evaluateModel', () => {
    it('should evaluate a successful model execution', async () => {
      const testCase: TestCase = {
        id: 'test-1',
        name: 'Simple flight itinerary',
        input: 'Flight from JFK to LAX on 2025-01-15',
        expectedSegmentCount: 1,
      };

      const mockItinerary: Itinerary = {
        id: generateItineraryId(),
        version: 1,
        title: 'Test Trip',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        status: 'DRAFT',
        tripType: 'BUSINESS',
        destinations: [],
        travelers: [],
        segments: [
          {
            id: generateSegmentId(),
            type: 'FLIGHT',
            status: 'CONFIRMED',
            startDatetime: new Date('2025-01-15T10:00:00Z'),
            endDatetime: new Date('2025-01-15T14:00:00Z'),
            travelerIds: [],
            source: 'import',
            airline: { name: 'Test Airlines', code: 'TA' },
            flightNumber: 'TA123',
            origin: { name: 'JFK', code: 'JFK' },
            destination: { name: 'LAX', code: 'LAX' },
            metadata: {},
          },
        ],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecutor = async () => ok({
        itinerary: mockItinerary,
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        durationMs: 1000,
      });

      const result = await evaluator.evaluateModel(
        'test-model',
        testCase,
        'dream',
        mockExecutor
      );

      expect(result.model).toBe('test-model');
      expect(result.mode).toBe('dream');
      expect(result.evaluation.quantitative.cost).toBe(0.001);
      expect(result.evaluation.quantitative.latency).toBe(1000);
      expect(result.evaluation.scores.overall).toBeGreaterThan(0);
    });

    it('should handle failed model execution', async () => {
      const testCase: TestCase = {
        id: 'test-2',
        name: 'Failed test',
        input: 'Invalid input',
      };

      const mockExecutor = async () => ({
        success: false,
        error: { type: 'READ_ERROR', message: 'Model failed', code: 'READ_ERROR' },
      } as any);

      const result = await evaluator.evaluateModel(
        'test-model',
        testCase,
        'plan',
        mockExecutor
      );

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.evaluation.scores.overall).toBe(0);
    });
  });

  describe('compareModels', () => {
    it('should compare multiple models', async () => {
      const testCases: TestCase[] = [
        {
          id: 'test-1',
          name: 'Simple test',
          input: 'Test input',
        },
      ];

      const mockItinerary: Itinerary = {
        id: generateItineraryId(),
        version: 1,
        title: 'Test Trip',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        status: 'DRAFT',
        tripType: 'BUSINESS',
        destinations: [],
        travelers: [],
        segments: [],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecutor = async () => ok({
        itinerary: mockItinerary,
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        durationMs: 1000,
      });

      const reports = await evaluator.compareModels(
        ['model-1', 'model-2'],
        testCases,
        ['dream', 'plan'],
        mockExecutor
      );

      expect(reports).toHaveLength(1);
      expect(reports[0]?.results).toHaveLength(4); // 2 models × 2 modes
      expect(reports[0]?.bestModel).toBeDefined();
      expect(reports[0]?.summary).toBeDefined();
    });
  });

  describe('findBestModel', () => {
    it('should find best model for quality optimization', async () => {
      const tripProfile = {
        primaryType: 'business' as const,
        travelers: { adults: 1 },
      };

      const testCases: TestCase[] = [
        {
          id: 'test-1',
          name: 'Test',
          input: 'Test input',
        },
      ];

      const mockItinerary: Itinerary = {
        id: generateItineraryId(),
        version: 1,
        title: 'Test Trip',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        status: 'DRAFT',
        tripType: 'BUSINESS',
        destinations: [],
        travelers: [],
        segments: [],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecutor = async () => ok({
        itinerary: mockItinerary,
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        durationMs: 1000,
      });

      const bestModel = await evaluator.findBestModel(
        tripProfile,
        'dream',
        'quality',
        ['model-1', 'model-2'],
        testCases,
        mockExecutor
      );

      expect(bestModel).toBeDefined();
      expect(['model-1', 'model-2']).toContain(bestModel);
    });

    it('should find best model for cost optimization', async () => {
      const tripProfile = {
        primaryType: 'budget' as const,
        travelers: { adults: 2 },
      };

      const testCases: TestCase[] = [
        {
          id: 'test-1',
          name: 'Test',
          input: 'Test input',
        },
      ];

      const mockItinerary: Itinerary = {
        id: generateItineraryId(),
        version: 1,
        title: 'Test Trip',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        status: 'DRAFT',
        tripType: 'LEISURE',
        destinations: [],
        travelers: [],
        segments: [],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let callCount = 0;
      const mockExecutor = async () => {
        callCount++;
        return ok({
          itinerary: mockItinerary,
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            costUSD: callCount === 1 ? 0.001 : 0.002, // First model cheaper
          },
          durationMs: 1000,
        });
      };

      const bestModel = await evaluator.findBestModel(
        tripProfile,
        'plan',
        'cost',
        ['model-1', 'model-2'],
        testCases,
        mockExecutor
      );

      expect(bestModel).toBeDefined();
    });
  });

  describe('evaluation metrics', () => {
    it('should calculate coherence correctly', async () => {
      const testCase: TestCase = {
        id: 'test-coherence',
        name: 'Coherence test',
        input: 'Test',
      };

      // Create overlapping segments (should reduce coherence)
      const mockItinerary: Itinerary = {
        id: generateItineraryId(),
        version: 1,
        title: 'Test Trip',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-16'),
        status: 'DRAFT',
        tripType: 'BUSINESS',
        destinations: [],
        travelers: [],
        segments: [
          {
            id: generateSegmentId(),
            type: 'FLIGHT',
            status: 'CONFIRMED',
            startDatetime: new Date('2025-01-15T10:00:00Z'),
            endDatetime: new Date('2025-01-15T14:00:00Z'),
            travelerIds: [],
            source: 'import',
            airline: { name: 'Test', code: 'TA' },
            flightNumber: 'TA123',
            origin: { name: 'JFK', code: 'JFK' },
            destination: { name: 'LAX', code: 'LAX' },
            metadata: {},
          },
          {
            id: generateSegmentId(),
            type: 'HOTEL',
            status: 'CONFIRMED',
            startDatetime: new Date('2025-01-15T13:00:00Z'), // Overlaps with flight!
            endDatetime: new Date('2025-01-16T11:00:00Z'),
            travelerIds: [],
            source: 'import',
            property: { name: 'Test Hotel' },
            location: { name: 'Test Hotel' },
            checkInDate: new Date('2025-01-15'),
            checkOutDate: new Date('2025-01-16'),
            roomCount: 1,
            amenities: [],
            metadata: {},
          },
        ],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecutor = async () => ok({
        itinerary: mockItinerary,
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        durationMs: 1000,
      });

      const result = await evaluator.evaluateModel(
        'test-model',
        testCase,
        'dream',
        mockExecutor
      );

      // Coherence should be less than perfect due to overlap
      expect(result.evaluation.qualitative.coherence).toBeLessThan(1.0);
    });

    it('should calculate completeness correctly', async () => {
      const testCase: TestCase = {
        id: 'test-completeness',
        name: 'Completeness test',
        input: 'Test',
        expectedSegmentCount: 3,
      };

      // Create itinerary with only 2 segments (incomplete)
      const mockItinerary: Itinerary = {
        id: generateItineraryId(),
        version: 1,
        title: 'Test Trip',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        status: 'DRAFT',
        tripType: 'BUSINESS',
        destinations: [],
        travelers: [],
        segments: [
          {
            id: generateSegmentId(),
            type: 'FLIGHT',
            status: 'CONFIRMED',
            startDatetime: new Date('2025-01-15T10:00:00Z'),
            endDatetime: new Date('2025-01-15T14:00:00Z'),
            travelerIds: [],
            source: 'import',
            airline: { name: 'Test', code: 'TA' },
            flightNumber: 'TA123',
            origin: { name: 'JFK', code: 'JFK' },
            destination: { name: 'LAX', code: 'LAX' },
            metadata: {},
          },
          {
            id: generateSegmentId(),
            type: 'HOTEL',
            status: 'CONFIRMED',
            startDatetime: new Date('2025-01-15T15:00:00Z'),
            endDatetime: new Date('2025-01-16T11:00:00Z'),
            travelerIds: [],
            source: 'import',
            property: { name: 'Test Hotel' },
            location: { name: 'Test Hotel' },
            checkInDate: new Date('2025-01-15'),
            checkOutDate: new Date('2025-01-16'),
            roomCount: 1,
            amenities: [],
            metadata: {},
          },
        ],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecutor = async () => ok({
        itinerary: mockItinerary,
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        durationMs: 1000,
      });

      const result = await evaluator.evaluateModel(
        'test-model',
        testCase,
        'dream',
        mockExecutor
      );

      // Completeness should be less than perfect (2/3 = 0.67)
      expect(result.evaluation.qualitative.completeness).toBeLessThan(1.0);
      expect(result.evaluation.qualitative.completeness).toBeGreaterThan(0.5);
    });
  });
});

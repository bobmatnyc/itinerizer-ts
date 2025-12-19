/**
 * Tests for import metadata enhancement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentImportService } from '../../src/services/document-import.service.js';
import type { ImportConfig } from '../../src/domain/types/import.js';
import type { Itinerary } from '../../src/domain/types/itinerary.js';
import { SegmentType } from '../../src/domain/types/common.js';
import { generateItineraryId, generateSegmentId } from '../../src/domain/types/branded.js';

describe('DocumentImportService - Metadata Enhancement', () => {
  let service: DocumentImportService;
  let mockItinerary: Itinerary;

  beforeEach(() => {
    const config: ImportConfig = {
      apiKey: 'test-key',
      costTrackingEnabled: false,
    };

    service = new DocumentImportService(config);

    // Create a mock itinerary
    mockItinerary = {
      id: generateItineraryId(),
      version: 1,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      title: 'Test Trip',
      status: 'DRAFT',
      startDate: new Date('2025-06-01T00:00:00Z'),
      endDate: new Date('2025-06-10T00:00:00Z'),
      destinations: [],
      travelers: [],
      tags: [],
      metadata: {},
      segments: [
        {
          id: generateSegmentId(),
          type: SegmentType.FLIGHT,
          status: 'CONFIRMED',
          startDatetime: new Date('2025-06-01T10:00:00Z'),
          endDatetime: new Date('2025-06-01T12:00:00Z'),
          travelerIds: [],
          source: 'import',
          sourceDetails: {},
          airline: { name: 'Test Air', code: 'TA' },
          flightNumber: 'TA123',
          origin: { name: 'JFK', code: 'JFK' },
          destination: { name: 'LAX', code: 'LAX' },
          metadata: {},
        },
        {
          id: generateSegmentId(),
          type: SegmentType.HOTEL,
          status: 'CONFIRMED',
          startDatetime: new Date('2025-06-01T15:00:00Z'),
          endDatetime: new Date('2025-06-05T11:00:00Z'),
          travelerIds: [],
          source: 'import',
          sourceDetails: {},
          property: { name: 'Test Hotel', code: 'TH' },
          location: { name: 'Los Angeles', address: '123 Main St' },
          checkInDate: new Date('2025-06-01T15:00:00Z'),
          checkOutDate: new Date('2025-06-05T11:00:00Z'),
          roomCount: 1,
          amenities: [],
          metadata: {},
        },
        {
          id: generateSegmentId(),
          type: SegmentType.TRANSFER,
          status: 'TENTATIVE',
          startDatetime: new Date('2025-06-01T13:00:00Z'),
          endDatetime: new Date('2025-06-01T14:00:00Z'),
          travelerIds: [],
          source: 'agent', // Agent-generated segment
          sourceDetails: {
            mode: 'dream',
            confidence: 0.8,
          },
          transferType: 'PRIVATE',
          pickupLocation: { name: 'LAX', code: 'LAX' },
          dropoffLocation: { name: 'Test Hotel' },
          metadata: {},
        },
      ],
    };
  });

  describe('enhanceItineraryMetadata', () => {
    it('should add importSource metadata to itinerary', () => {
      const usage = {
        model: 'anthropic/claude-3-haiku',
        inputTokens: 1000,
        outputTokens: 500,
        costUSD: 0.001,
        timestamp: new Date(),
      };

      const filePath = '/path/to/test-itinerary.pdf';
      const startTime = Date.now() - 5000;
      const endTime = Date.now();

      // Access private method via type assertion
      const enhancedItinerary = (service as any).enhanceItineraryMetadata(
        mockItinerary,
        filePath,
        usage,
        startTime,
        endTime
      );

      // Check importSource metadata
      expect(enhancedItinerary.metadata.importSource).toBeDefined();
      expect(enhancedItinerary.metadata.importSource.filename).toBe('test-itinerary.pdf');
      expect(enhancedItinerary.metadata.importSource.model).toBe('anthropic/claude-3-haiku');
      expect(enhancedItinerary.metadata.importSource.processingTimeMs).toBeGreaterThan(0);
      expect(enhancedItinerary.metadata.importSource.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should add llmUsage metadata to itinerary', () => {
      const usage = {
        model: 'anthropic/claude-3-haiku',
        inputTokens: 1234,
        outputTokens: 567,
        costUSD: 0.0023,
        timestamp: new Date(),
      };

      const enhancedItinerary = (service as any).enhanceItineraryMetadata(
        mockItinerary,
        '/path/to/test.pdf',
        usage,
        Date.now() - 1000,
        Date.now()
      );

      // Check llmUsage metadata
      expect(enhancedItinerary.metadata.llmUsage).toBeDefined();
      expect(enhancedItinerary.metadata.llmUsage.promptTokens).toBe(1234);
      expect(enhancedItinerary.metadata.llmUsage.completionTokens).toBe(567);
      expect(enhancedItinerary.metadata.llmUsage.totalCost).toBe(0.0023);
    });

    it('should enhance sourceDetails for import segments only', () => {
      const usage = {
        model: 'anthropic/claude-3-haiku',
        inputTokens: 1000,
        outputTokens: 500,
        costUSD: 0.001,
        timestamp: new Date(),
      };

      const enhancedItinerary = (service as any).enhanceItineraryMetadata(
        mockItinerary,
        '/path/to/test.pdf',
        usage,
        Date.now() - 1000,
        Date.now()
      );

      // Check that import segments have enhanced sourceDetails
      const flightSegment = enhancedItinerary.segments[0];
      expect(flightSegment.source).toBe('import');
      expect(flightSegment.sourceDetails?.model).toBe('anthropic/claude-3-haiku');
      expect(flightSegment.sourceDetails?.timestamp).toBeInstanceOf(Date);

      const hotelSegment = enhancedItinerary.segments[1];
      expect(hotelSegment.source).toBe('import');
      expect(hotelSegment.sourceDetails?.model).toBe('anthropic/claude-3-haiku');
      expect(hotelSegment.sourceDetails?.timestamp).toBeInstanceOf(Date);

      // Check that agent segments are NOT modified
      const transferSegment = enhancedItinerary.segments[2];
      expect(transferSegment.source).toBe('agent');
      expect(transferSegment.sourceDetails?.model).toBeUndefined();
      expect(transferSegment.sourceDetails?.mode).toBe('dream'); // Original value preserved
      expect(transferSegment.sourceDetails?.confidence).toBe(0.8); // Original value preserved
    });

    it('should preserve existing metadata fields', () => {
      mockItinerary.metadata = {
        existingField: 'test-value',
        customData: { foo: 'bar' },
      };

      const usage = {
        model: 'anthropic/claude-3-haiku',
        inputTokens: 1000,
        outputTokens: 500,
        costUSD: 0.001,
        timestamp: new Date(),
      };

      const enhancedItinerary = (service as any).enhanceItineraryMetadata(
        mockItinerary,
        '/path/to/test.pdf',
        usage,
        Date.now() - 1000,
        Date.now()
      );

      // Check that existing metadata is preserved
      expect(enhancedItinerary.metadata.existingField).toBe('test-value');
      expect(enhancedItinerary.metadata.customData).toEqual({ foo: 'bar' });

      // Check that new metadata is added
      expect(enhancedItinerary.metadata.importSource).toBeDefined();
      expect(enhancedItinerary.metadata.llmUsage).toBeDefined();
    });

    it('should calculate processing time correctly', () => {
      const usage = {
        model: 'anthropic/claude-3-haiku',
        inputTokens: 1000,
        outputTokens: 500,
        costUSD: 0.001,
        timestamp: new Date(),
      };

      const startTime = 1000000;
      const endTime = 1003500; // 3500ms later

      const enhancedItinerary = (service as any).enhanceItineraryMetadata(
        mockItinerary,
        '/path/to/test.pdf',
        usage,
        startTime,
        endTime
      );

      expect(enhancedItinerary.metadata.importSource.processingTimeMs).toBe(3500);
    });

    it('should extract filename correctly from full path', () => {
      const usage = {
        model: 'anthropic/claude-3-haiku',
        inputTokens: 1000,
        outputTokens: 500,
        costUSD: 0.001,
        timestamp: new Date(),
      };

      const testCases = [
        { path: '/path/to/my-trip.pdf', expected: 'my-trip.pdf' },
        { path: 'relative/path/vacation.pdf', expected: 'vacation.pdf' },
        { path: 'single-file.pdf', expected: 'single-file.pdf' },
        { path: '/deep/nested/path/to/itinerary.pdf', expected: 'itinerary.pdf' },
      ];

      testCases.forEach(({ path, expected }) => {
        const enhancedItinerary = (service as any).enhanceItineraryMetadata(
          mockItinerary,
          path,
          usage,
          Date.now() - 1000,
          Date.now()
        );

        expect(enhancedItinerary.metadata.importSource.filename).toBe(expected);
      });
    });

    it('should not mutate original itinerary', () => {
      const usage = {
        model: 'anthropic/claude-3-haiku',
        inputTokens: 1000,
        outputTokens: 500,
        costUSD: 0.001,
        timestamp: new Date(),
      };

      const originalMetadata = { ...mockItinerary.metadata };
      const originalSegments = [...mockItinerary.segments];

      const enhancedItinerary = (service as any).enhanceItineraryMetadata(
        mockItinerary,
        '/path/to/test.pdf',
        usage,
        Date.now() - 1000,
        Date.now()
      );

      // Original should be unchanged (metadata is still empty)
      expect(mockItinerary.metadata).toEqual(originalMetadata);
      expect(mockItinerary.segments).toEqual(originalSegments);

      // Enhanced should have new metadata
      expect(enhancedItinerary.metadata.importSource).toBeDefined();
      expect(enhancedItinerary.metadata.llmUsage).toBeDefined();
    });
  });
});

/**
 * Trip Designer Service tests
 * @module tests/services/trip-designer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TripDesignerService, InMemorySessionStorage } from '../../../src/services/trip-designer/index.js';
import type { ItineraryId } from '../../../src/domain/types/branded.js';
import type { Itinerary } from '../../../src/domain/types/itinerary.js';
import { ok } from '../../../src/core/result.js';

describe('TripDesignerService', () => {
  let service: TripDesignerService;
  const testItineraryId = 'test-itin-123' as ItineraryId;

  beforeEach(() => {
    // Create service with mock API key
    service = new TripDesignerService(
      {
        apiKey: 'test-api-key',
        model: 'anthropic/claude-3.5-sonnet:online',
      },
      new InMemorySessionStorage()
    );
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const result = await service.createSession(testItineraryId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toMatch(/^session_/);
      }
    });

    it('should create session with empty message history', async () => {
      const sessionIdResult = await service.createSession(testItineraryId);
      if (!sessionIdResult.success) {
        throw new Error('Failed to create session');
      }

      const sessionId = sessionIdResult.value;
      const sessionResult = await service.getSession(sessionId);

      expect(sessionResult.success).toBe(true);
      if (sessionResult.success) {
        expect(sessionResult.value.messages).toHaveLength(0);
        expect(sessionResult.value.itineraryId).toBe(testItineraryId);
      }
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', async () => {
      const createResult = await service.createSession(testItineraryId);
      if (!createResult.success) {
        throw new Error('Failed to create session');
      }

      const sessionId = createResult.value;
      const getResult = await service.getSession(sessionId);

      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.value.id).toBe(sessionId);
      }
    });

    it('should return error for non-existent session', async () => {
      const result = await service.getSession('non-existent' as any);

      expect(result.success).toBe(false);
    });
  });

  describe('session lifecycle', () => {
    it('should initialize trip profile', async () => {
      const sessionIdResult = await service.createSession(testItineraryId);
      if (!sessionIdResult.success) {
        throw new Error('Failed to create session');
      }

      const sessionId = sessionIdResult.value;
      const sessionResult = await service.getSession(sessionId);

      expect(sessionResult.success).toBe(true);
      if (sessionResult.success) {
        expect(sessionResult.value.tripProfile).toBeDefined();
        expect(sessionResult.value.tripProfile.travelers.count).toBe(1);
        expect(sessionResult.value.tripProfile.confidence).toBe(0);
      }
    });

    it('should track metadata', async () => {
      const sessionIdResult = await service.createSession(testItineraryId);
      if (!sessionIdResult.success) {
        throw new Error('Failed to create session');
      }

      const sessionId = sessionIdResult.value;
      const sessionResult = await service.getSession(sessionId);

      expect(sessionResult.success).toBe(true);
      if (sessionResult.success) {
        expect(sessionResult.value.metadata.messageCount).toBe(0);
        expect(sessionResult.value.metadata.totalTokens).toBe(0);
      }
    });
  });

  describe('getStats', () => {
    it('should return session statistics', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('activeSessions');
      expect(typeof stats.activeSessions).toBe('number');
    });

    it('should track active sessions', async () => {
      const initialStats = service.getStats();
      const initialCount = initialStats.activeSessions;

      await service.createSession(testItineraryId);

      const newStats = service.getStats();
      expect(newStats.activeSessions).toBeGreaterThan(initialCount);
    });
  });

  describe('cleanupIdleSessions', () => {
    it('should return cleanup count', async () => {
      const count = await service.cleanupIdleSessions();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('existing itinerary context', () => {
    it('should inject context when itinerary has segments', async () => {
      // Create mock itinerary with segments
      const mockItinerary: Partial<Itinerary> = {
        id: testItineraryId,
        title: 'Portugal Couple Trip',
        startDate: new Date('2025-01-03'),
        endDate: new Date('2025-01-12'),
        destinations: [{ name: 'Lisbon', city: 'Lisbon', country: 'Portugal' }],
        travelers: [{ firstName: 'John', lastName: 'Doe' }],
        segments: [
          {
            id: 'seg-1' as any,
            type: 'FLIGHT',
            startDatetime: new Date('2025-01-03T10:00:00Z'),
            endDatetime: new Date('2025-01-03T18:00:00Z'),
            metadata: { route: 'SFO → LIS' },
          },
          {
            id: 'seg-2' as any,
            type: 'HOTEL',
            startDatetime: new Date('2025-01-03T18:00:00Z'),
            endDatetime: new Date('2025-01-06T12:00:00Z'),
            metadata: { name: 'Hotel Avenida Palace', nights: 3 },
          },
        ],
        tripPreferences: {
          travelStyle: 'moderate',
          pace: 'balanced',
        },
      };

      // Create mock itinerary service
      const mockItineraryService = {
        get: vi.fn().mockResolvedValue(ok(mockItinerary)),
      };

      // Create service with mock dependencies
      const serviceWithItinerary = new TripDesignerService(
        {
          apiKey: 'test-api-key',
          model: 'anthropic/claude-3.5-sonnet:online',
        },
        new InMemorySessionStorage(),
        {
          itineraryService: mockItineraryService,
        }
      );

      // Create session
      const sessionIdResult = await serviceWithItinerary.createSession(testItineraryId);
      expect(sessionIdResult.success).toBe(true);

      if (!sessionIdResult.success) return;

      // Get session and verify context was injected
      const sessionResult = await serviceWithItinerary.getSession(sessionIdResult.value);
      expect(sessionResult.success).toBe(true);

      if (!sessionResult.success) return;

      const session = sessionResult.value;

      // Should have at least one system message with itinerary context
      expect(session.messages.length).toBeGreaterThan(0);

      const systemMessage = session.messages.find(m => m.role === 'system');
      expect(systemMessage).toBeDefined();

      if (systemMessage) {
        expect(systemMessage.content).toContain('existing itinerary');
        expect(systemMessage.content).toContain('Portugal Couple Trip');
        expect(systemMessage.content).toContain('Jan 3-12, 2025');
      }
    });

    it('should NOT inject context for blank itinerary', async () => {
      // Create mock blank itinerary
      const mockBlankItinerary: Partial<Itinerary> = {
        id: testItineraryId,
        title: 'New Itinerary',
        startDate: new Date(),
        endDate: new Date(),
        destinations: [],
        travelers: [],
        segments: [],
      };

      // Create mock itinerary service
      const mockItineraryService = {
        get: vi.fn().mockResolvedValue(ok(mockBlankItinerary)),
      };

      // Create service with mock dependencies
      const serviceWithItinerary = new TripDesignerService(
        {
          apiKey: 'test-api-key',
          model: 'anthropic/claude-3.5-sonnet:online',
        },
        new InMemorySessionStorage(),
        {
          itineraryService: mockItineraryService,
        }
      );

      // Create session
      const sessionIdResult = await serviceWithItinerary.createSession(testItineraryId);
      expect(sessionIdResult.success).toBe(true);

      if (!sessionIdResult.success) return;

      // Get session and verify NO context was injected
      const sessionResult = await serviceWithItinerary.getSession(sessionIdResult.value);
      expect(sessionResult.success).toBe(true);

      if (!sessionResult.success) return;

      const session = sessionResult.value;

      // Should have NO messages (blank itinerary)
      expect(session.messages.length).toBe(0);
    });
  });
});

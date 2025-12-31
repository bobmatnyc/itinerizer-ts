/**
 * Test date validation in tool executor
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolExecutor } from '../../src/services/trip-designer/tool-executor.js';
import { ItineraryService } from '../../src/services/itinerary.service.js';
import { createItineraryStorage } from '../../src/storage/index.js';
import type { ItineraryId } from '../../src/domain/types/branded.js';
import type { Itinerary } from '../../src/domain/types/itinerary.js';
import { generateItineraryId } from '../../src/domain/types/branded.js';

describe('ToolExecutor - Date Validation', () => {
  let toolExecutor: ToolExecutor;
  let itineraryService: ItineraryService;
  let testItineraryId: ItineraryId;

  beforeEach(async () => {
    // Create services
    const storage = createItineraryStorage();
    itineraryService = new ItineraryService(storage);

    toolExecutor = new ToolExecutor({
      itineraryService,
    });

    // Create a test itinerary directly via storage
    testItineraryId = generateItineraryId();
    const testItinerary: Itinerary = {
      id: testItineraryId,
      title: 'Test Trip',
      userId: 'test-user' as any,
      startDate: new Date(),
      endDate: new Date(),
      segments: [],
      travelers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.save(testItinerary);
  });

  it('should reject past start dates', async () => {
    // Yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result = await toolExecutor.execute({
      sessionId: 'test-session' as any,
      itineraryId: testItineraryId,
      toolCall: {
        id: 'test-call-1',
        type: 'function',
        function: {
          name: 'update_itinerary',
          arguments: JSON.stringify({
            startDate: yesterdayStr,
            endDate: '2025-12-30',
          }),
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot be in the past');
    expect(result.error).toContain('already passed');
  });

  it('should reject today as start date', async () => {
    // Today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const result = await toolExecutor.execute({
      sessionId: 'test-session' as any,
      itineraryId: testItineraryId,
      toolCall: {
        id: 'test-call-2',
        type: 'function',
        function: {
          name: 'update_itinerary',
          arguments: JSON.stringify({
            startDate: todayStr,
            endDate: '2025-12-30',
          }),
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot be in the past');
  });

  it('should accept tomorrow as start date', async () => {
    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const endDate = new Date(tomorrow);
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0];

    const result = await toolExecutor.execute({
      sessionId: 'test-session' as any,
      itineraryId: testItineraryId,
      toolCall: {
        id: 'test-call-3',
        type: 'function',
        function: {
          name: 'update_itinerary',
          arguments: JSON.stringify({
            startDate: tomorrowStr,
            endDate: endDateStr,
          }),
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('should accept future dates', async () => {
    const result = await toolExecutor.execute({
      sessionId: 'test-session' as any,
      itineraryId: testItineraryId,
      toolCall: {
        id: 'test-call-4',
        type: 'function',
        function: {
          name: 'update_itinerary',
          arguments: JSON.stringify({
            startDate: '2026-06-15',
            endDate: '2026-06-25',
          }),
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('should provide helpful suggestions in error message', async () => {
    const result = await toolExecutor.execute({
      sessionId: 'test-session' as any,
      itineraryId: testItineraryId,
      toolCall: {
        id: 'test-call-5',
        type: 'function',
        function: {
          name: 'update_itinerary',
          arguments: JSON.stringify({
            startDate: '2025-12-22', // Past date
            endDate: '2025-12-30',
          }),
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Suggestions:');
    expect(result.error).toContain('Start tomorrow:');
    expect(result.error).toContain('Same dates next year:');
  });
});

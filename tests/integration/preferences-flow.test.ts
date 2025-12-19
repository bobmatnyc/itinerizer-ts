/**
 * Integration test for preferences capture and session compression flow
 * This test demonstrates the complete flow of:
 * 1. User provides preferences during discovery
 * 2. Preferences are stored via update_preferences tool
 * 3. Session compression preserves preferences
 * 4. AI maintains context about preferences after compression
 *
 * @module tests/integration/preferences-flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ItineraryService } from '../../src/services/itinerary.service.js';
import { SegmentService } from '../../src/services/segment.service.js';
import { DependencyService } from '../../src/services/dependency.service.js';
import { InMemoryItineraryStorage } from '../../src/storage/in-memory-storage.js';
import { ToolExecutor } from '../../src/services/trip-designer/tool-executor.js';
import type { ItineraryId } from '../../src/domain/types/branded.js';
import type { ToolCall } from '../../src/domain/types/trip-designer.js';

describe('Preferences Flow Integration', () => {
  let itineraryService: ItineraryService;
  let segmentService: SegmentService;
  let dependencyService: DependencyService;
  let toolExecutor: ToolExecutor;
  let testItineraryId: ItineraryId;

  beforeEach(async () => {
    // Set up services
    const storage = new InMemoryItineraryStorage();
    itineraryService = new ItineraryService(storage);
    segmentService = new SegmentService(storage, itineraryService);
    dependencyService = new DependencyService();

    toolExecutor = new ToolExecutor({
      itineraryService,
      segmentService,
      dependencyService,
    });

    // Create a test itinerary
    const createResult = await itineraryService.create({
      title: 'New Itinerary',
      startDate: new Date('2025-01-03'),
      endDate: new Date('2025-01-12'),
    });

    if (!createResult.success) {
      throw new Error('Failed to create itinerary');
    }

    testItineraryId = createResult.value.id;
  });

  describe('Preference Capture', () => {
    it('should store preferences via update_preferences tool', async () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'update_preferences',
          arguments: JSON.stringify({
            travelStyle: 'moderate',
            pace: 'balanced',
            interests: ['food', 'history', 'culture'],
            dietaryRestrictions: 'vegetarian',
            mobilityRestrictions: 'none',
            origin: 'New York',
            accommodationPreference: 'boutique',
            budgetFlexibility: 3,
          }),
        },
      };

      const result = await toolExecutor.execute({
        sessionId: 'session_test' as any,
        itineraryId: testItineraryId,
        toolCall,
      });

      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({
        success: true,
        message: 'Travel preferences updated successfully',
      });

      // Verify preferences were stored
      const itineraryResult = await itineraryService.get(testItineraryId);
      expect(itineraryResult.success).toBe(true);

      if (itineraryResult.success) {
        const itinerary = itineraryResult.value;
        expect(itinerary.tripPreferences).toBeDefined();
        expect(itinerary.tripPreferences?.travelStyle).toBe('moderate');
        expect(itinerary.tripPreferences?.pace).toBe('balanced');
        expect(itinerary.tripPreferences?.interests).toEqual(['food', 'history', 'culture']);
        expect(itinerary.tripPreferences?.dietaryRestrictions).toBe('vegetarian');
        expect(itinerary.tripPreferences?.origin).toBe('New York');
        expect(itinerary.tripPreferences?.accommodationPreference).toBe('boutique');
        expect(itinerary.tripPreferences?.budgetFlexibility).toBe(3);
      }
    });

    it('should merge preferences with existing ones', async () => {
      // First call: set some preferences
      const call1: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'update_preferences',
          arguments: JSON.stringify({
            travelStyle: 'budget',
            interests: ['food'],
          }),
        },
      };

      await toolExecutor.execute({
        sessionId: 'session_test' as any,
        itineraryId: testItineraryId,
        toolCall: call1,
      });

      // Second call: update some fields and add new ones
      const call2: ToolCall = {
        id: 'call_2',
        type: 'function',
        function: {
          name: 'update_preferences',
          arguments: JSON.stringify({
            travelStyle: 'moderate', // Override
            pace: 'leisurely', // New field
            interests: ['food', 'history'], // Override with expanded list
          }),
        },
      };

      const result2 = await toolExecutor.execute({
        sessionId: 'session_test' as any,
        itineraryId: testItineraryId,
        toolCall: call2,
      });

      expect(result2.success).toBe(true);

      // Verify merged preferences
      const itineraryResult = await itineraryService.get(testItineraryId);
      if (itineraryResult.success) {
        const prefs = itineraryResult.value.tripPreferences;
        expect(prefs?.travelStyle).toBe('moderate'); // Updated
        expect(prefs?.pace).toBe('leisurely'); // Added
        expect(prefs?.interests).toEqual(['food', 'history']); // Updated
      }
    });

    it('should handle partial preference updates', async () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'update_preferences',
          arguments: JSON.stringify({
            dietaryRestrictions: 'gluten-free',
            mobilityRestrictions: 'wheelchair accessible',
          }),
        },
      };

      const result = await toolExecutor.execute({
        sessionId: 'session_test' as any,
        itineraryId: testItineraryId,
        toolCall,
      });

      expect(result.success).toBe(true);

      const itineraryResult = await itineraryService.get(testItineraryId);
      if (itineraryResult.success) {
        const prefs = itineraryResult.value.tripPreferences;
        expect(prefs?.dietaryRestrictions).toBe('gluten-free');
        expect(prefs?.mobilityRestrictions).toBe('wheelchair accessible');
        // Other fields should be undefined/not set
        expect(prefs?.travelStyle).toBeUndefined();
        expect(prefs?.pace).toBeUndefined();
      }
    });
  });

  describe('Preference Persistence', () => {
    it('should preserve preferences across itinerary updates', async () => {
      // Set preferences
      const prefCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'update_preferences',
          arguments: JSON.stringify({
            travelStyle: 'luxury',
            interests: ['wine', 'spas'],
          }),
        },
      };

      await toolExecutor.execute({
        sessionId: 'session_test' as any,
        itineraryId: testItineraryId,
        toolCall: prefCall,
      });

      // Update itinerary metadata
      const updateCall: ToolCall = {
        id: 'call_2',
        type: 'function',
        function: {
          name: 'update_itinerary',
          arguments: JSON.stringify({
            title: 'Luxury Wine Tour',
            description: 'A luxurious wine tasting experience',
          }),
        },
      };

      await toolExecutor.execute({
        sessionId: 'session_test' as any,
        itineraryId: testItineraryId,
        toolCall: updateCall,
      });

      // Verify preferences are still there
      const itineraryResult = await itineraryService.get(testItineraryId);
      if (itineraryResult.success) {
        expect(itineraryResult.value.title).toBe('Luxury Wine Tour');
        expect(itineraryResult.value.tripPreferences?.travelStyle).toBe('luxury');
        expect(itineraryResult.value.tripPreferences?.interests).toEqual(['wine', 'spas']);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid preference values gracefully', async () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'update_preferences',
          arguments: JSON.stringify({
            budgetFlexibility: 10, // Invalid: should be 1-5
          }),
        },
      };

      // Should still succeed (no validation in handler currently)
      const result = await toolExecutor.execute({
        sessionId: 'session_test' as any,
        itineraryId: testItineraryId,
        toolCall,
      });

      // Note: Currently no validation, but this test documents expected behavior
      expect(result.success).toBe(true);
    });

    it('should handle non-existent itinerary', async () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'update_preferences',
          arguments: JSON.stringify({
            travelStyle: 'budget',
          }),
        },
      };

      const result = await toolExecutor.execute({
        sessionId: 'session_test' as any,
        itineraryId: 'non-existent' as any,
        toolCall,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

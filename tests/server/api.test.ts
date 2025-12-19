/**
 * API server tests
 * @module tests/server/api
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createApiServer } from '../../src/server/api.js';
import { ItineraryService } from '../../src/services/itinerary.service.js';
import { SegmentService } from '../../src/services/segment.service.js';
import { DependencyService } from '../../src/services/dependency.service.js';
import { InMemoryItineraryStorage } from '../../src/storage/in-memory-storage.js';
import type { ImportConfig } from '../../src/domain/types/import.js';

describe('API Server - Trip Designer Endpoints', () => {
  let app: express.Application;
  let storage: InMemoryItineraryStorage;
  let itineraryService: ItineraryService;
  let segmentService: SegmentService;
  let dependencyService: DependencyService;

  beforeEach(async () => {
    // Initialize in-memory storage
    storage = new InMemoryItineraryStorage();
    await storage.initialize();

    // Initialize services
    itineraryService = new ItineraryService(storage);
    segmentService = new SegmentService(storage);
    dependencyService = new DependencyService(storage);

    // Create API server WITHOUT API key (test disabled state)
    app = createApiServer({
      itineraryService,
      segmentService,
      dependencyService,
    });
  });

  describe('POST /api/chat/sessions', () => {
    it('should return 503 when API key is not configured', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .send({ itineraryId: 'test-id' });

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        error: 'Trip Designer disabled',
        message: expect.stringContaining('OPENROUTER_API_KEY'),
      });
    });
  });

  describe('POST /api/chat/sessions/:sessionId/messages', () => {
    it('should return 503 when API key is not configured', async () => {
      const response = await request(app)
        .post('/api/chat/sessions/test-session/messages')
        .send({ message: 'Hello' });

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        error: 'Trip Designer disabled',
      });
    });
  });

  describe('GET /api/chat/sessions/:sessionId', () => {
    it('should return 503 when API key is not configured', async () => {
      const response = await request(app).get('/api/chat/sessions/test-session');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        error: 'Trip Designer disabled',
      });
    });
  });

  describe('GET /api/chat/stats', () => {
    it('should return 503 when API key is not configured', async () => {
      const response = await request(app).get('/api/chat/stats');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        error: 'Trip Designer disabled',
      });
    });
  });
});

describe('API Server - Trip Designer with API Key', () => {
  let app: express.Application;
  let storage: InMemoryItineraryStorage;
  let itineraryService: ItineraryService;
  let segmentService: SegmentService;
  let dependencyService: DependencyService;

  // Mock API key for testing
  const mockApiKey = 'test-api-key';
  const importConfig: ImportConfig = {
    apiKey: mockApiKey,
    costTrackingEnabled: false,
  };

  beforeEach(async () => {
    // Initialize in-memory storage
    storage = new InMemoryItineraryStorage();
    await storage.initialize();

    // Initialize services
    itineraryService = new ItineraryService(storage);
    segmentService = new SegmentService(storage);
    dependencyService = new DependencyService(storage);

    // Create API server WITH API key
    app = createApiServer({
      itineraryService,
      segmentService,
      dependencyService,
      importConfig,
    });
  });

  describe('POST /api/chat/sessions', () => {
    it('should return 400 when itineraryId is missing', async () => {
      const response = await request(app).post('/api/chat/sessions').send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Missing itineraryId',
      });
    });

    it('should return 404 when itinerary does not exist', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .send({ itineraryId: 'non-existent-id' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Itinerary not found',
      });
    });

    it('should create a session for valid itinerary', async () => {
      // First create an itinerary
      const createResult = await itineraryService.create({
        title: 'Test Trip',
        description: 'Test Description',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const itineraryId = createResult.value.id;

      // Now create a session
      const response = await request(app)
        .post('/api/chat/sessions')
        .send({ itineraryId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(typeof response.body.sessionId).toBe('string');
      expect(response.body.sessionId).toMatch(/^session_/);
    });
  });

  describe('POST /api/chat/sessions/:sessionId/messages', () => {
    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/chat/sessions/test-session/messages')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid message',
      });
    });

    it('should return 404 when session does not exist', async () => {
      const response = await request(app)
        .post('/api/chat/sessions/non-existent-session/messages')
        .send({ message: 'Hello' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Session not found',
      });
    });

    // Note: We can't easily test successful message sending without mocking
    // the OpenAI client, which would require more complex test setup
  });

  describe('GET /api/chat/sessions/:sessionId', () => {
    it('should return 404 when session does not exist', async () => {
      const response = await request(app).get('/api/chat/sessions/non-existent-session');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Session not found',
      });
    });

    it('should return session details for existing session', async () => {
      // Create an itinerary
      const createResult = await itineraryService.create({
        title: 'Test Trip',
        description: 'Test Description',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const itineraryId = createResult.value.id;

      // Create a session
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ itineraryId });

      expect(sessionResponse.status).toBe(201);
      const sessionId = sessionResponse.body.sessionId;

      // Get session details
      const response = await request(app).get(`/api/chat/sessions/${sessionId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: sessionId,
        itineraryId,
        messages: [],
        metadata: expect.objectContaining({
          messageCount: 0,
          totalTokens: 0,
        }),
      });
    });
  });

  describe('GET /api/chat/stats', () => {
    it('should return statistics', async () => {
      const response = await request(app).get('/api/chat/stats');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        activeSessions: expect.any(Number),
      });
    });
  });

  describe('GET /api/itineraries/:id/events', () => {
    it('should return 404 when itinerary does not exist', async () => {
      const response = await request(app).get('/api/itineraries/non-existent-id/events');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Itinerary not found',
      });
    });

    it('should establish SSE connection for existing itinerary', (done) => {
      // Create an itinerary first
      itineraryService
        .create({
          title: 'Test Trip',
          description: 'Test Description',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-10'),
        })
        .then((createResult) => {
          expect(createResult.success).toBe(true);
          if (!createResult.success) {
            done(new Error('Failed to create itinerary'));
            return;
          }

          const itineraryId = createResult.value.id;

          // SSE endpoints are hard to test with supertest
          // We'll verify the headers and first message, then close
          const req = request(app).get(`/api/itineraries/${itineraryId}/events`);

          req.on('response', (res) => {
            // Verify headers
            expect(res.headers['content-type']).toBe('text/event-stream');
            expect(res.headers['cache-control']).toBe('no-cache');
            expect(res.headers['connection']).toBe('keep-alive');

            // Listen for first data chunk
            res.once('data', (chunk) => {
              const data = chunk.toString();
              expect(data).toContain('connected');
              expect(data).toContain(itineraryId);

              // Close connection
              req.abort();
              done();
            });
          });

          // Timeout safety
          setTimeout(() => {
            req.abort();
            done(new Error('SSE connection timeout'));
          }, 500);
        });
    });
  });
});

/**
 * Tests for storage factory function
 * @module tests/storage/storage-factory
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createItineraryStorage } from '../../src/storage/index.js';
import { JsonItineraryStorage } from '../../src/storage/json-storage.js';
import { BlobItineraryStorage } from '../../src/storage/blob-storage.js';

describe('createItineraryStorage', () => {
  let originalToken: string | undefined;

  beforeEach(() => {
    // Save original token
    originalToken = process.env.BLOB_READ_WRITE_TOKEN;
  });

  afterEach(() => {
    // Restore original token
    if (originalToken !== undefined) {
      process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    } else {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    }
  });

  describe('environment detection', () => {
    it('creates JsonItineraryStorage when BLOB_READ_WRITE_TOKEN is not set', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const storage = createItineraryStorage('./data/test');

      expect(storage).toBeInstanceOf(JsonItineraryStorage);
    });

    it('creates BlobItineraryStorage when BLOB_READ_WRITE_TOKEN is set', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

      const storage = createItineraryStorage('./data/test');

      expect(storage).toBeInstanceOf(BlobItineraryStorage);
    });

    it('uses provided basePath for JsonItineraryStorage', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const customPath = './custom/path';
      const storage = createItineraryStorage(customPath);

      expect(storage).toBeInstanceOf(JsonItineraryStorage);
      // Note: We can't easily verify the basePath without exposing it,
      // but this tests that the parameter is accepted
    });

    it('uses default basePath when not provided', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const storage = createItineraryStorage();

      expect(storage).toBeInstanceOf(JsonItineraryStorage);
    });
  });

  describe('interface compliance', () => {
    it('JsonItineraryStorage implements ItineraryStorage interface', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const storage = createItineraryStorage('./data/test');

      // Verify all interface methods exist
      expect(storage.initialize).toBeDefined();
      expect(storage.save).toBeDefined();
      expect(storage.load).toBeDefined();
      expect(storage.delete).toBeDefined();
      expect(storage.list).toBeDefined();
      expect(storage.exists).toBeDefined();

      // Verify they're functions
      expect(typeof storage.initialize).toBe('function');
      expect(typeof storage.save).toBe('function');
      expect(typeof storage.load).toBe('function');
      expect(typeof storage.delete).toBe('function');
      expect(typeof storage.list).toBe('function');
      expect(typeof storage.exists).toBe('function');
    });

    it('BlobItineraryStorage implements ItineraryStorage interface', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

      const storage = createItineraryStorage();

      // Verify all interface methods exist
      expect(storage.initialize).toBeDefined();
      expect(storage.save).toBeDefined();
      expect(storage.load).toBeDefined();
      expect(storage.delete).toBeDefined();
      expect(storage.list).toBeDefined();
      expect(storage.exists).toBeDefined();

      // Verify they're functions
      expect(typeof storage.initialize).toBe('function');
      expect(typeof storage.save).toBe('function');
      expect(typeof storage.load).toBe('function');
      expect(typeof storage.delete).toBeDefined();
      expect(typeof storage.list).toBe('function');
      expect(typeof storage.exists).toBe('function');
    });
  });

  describe('initialization', () => {
    it('JsonItineraryStorage can be initialized', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const storage = createItineraryStorage('./data/test-init');
      const result = await storage.initialize();

      expect(result.success).toBe(true);
    });

    it('BlobItineraryStorage can be initialized', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

      const storage = createItineraryStorage();
      const result = await storage.initialize();

      expect(result.success).toBe(true);
    });
  });
});

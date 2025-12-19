/**
 * Debug endpoint to test Vercel Blob operations directly
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put, head, del, list } from '@vercel/blob';

export const GET: RequestHandler = async () => {
  try {
    const testKey = 'debug/test.json';
    const testData = JSON.stringify({ timestamp: new Date().toISOString(), test: true });

    const results: Record<string, unknown> = {};

    // Test 1: List existing blobs
    try {
      const { blobs } = await list({ prefix: 'itineraries/' });
      results.list = { success: true, count: blobs.length, blobs: blobs.slice(0, 3).map(b => b.pathname) };
    } catch (e) {
      results.list = { success: false, error: e instanceof Error ? e.message : String(e) };
    }

    // Test 2: Put a blob
    try {
      const blob = await put(testKey, testData, {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      });
      results.put = { success: true, url: blob.url, pathname: blob.pathname };
    } catch (e) {
      results.put = { success: false, error: e instanceof Error ? e.message : String(e) };
    }

    // Test 3: Head the blob
    try {
      const info = await head(testKey);
      results.head = { success: true, url: info?.url, pathname: info?.pathname };
    } catch (e) {
      results.head = { success: false, error: e instanceof Error ? e.message : String(e) };
    }

    // Test 4: Delete the blob
    try {
      const info = await head(testKey);
      if (info) {
        await del(info.url);
        results.delete = { success: true };
      } else {
        results.delete = { success: false, error: 'Blob not found for delete' };
      }
    } catch (e) {
      results.delete = { success: false, error: e instanceof Error ? e.message : String(e) };
    }

    // Test 5: Put again (should work after delete)
    try {
      const blob = await put(testKey, testData, {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      });
      results.putAfterDelete = { success: true, url: blob.url };
      // Cleanup
      await del(blob.url);
    } catch (e) {
      results.putAfterDelete = { success: false, error: e instanceof Error ? e.message : String(e) };
    }

    return json({
      status: 'ok',
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      results
    });
  } catch (e) {
    return json({
      status: 'error',
      error: e instanceof Error ? e.message : String(e)
    }, { status: 500 });
  }
};

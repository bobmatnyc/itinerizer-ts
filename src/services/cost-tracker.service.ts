/**
 * Cost tracking service for LLM API usage
 * @module services/cost-tracker
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createStorageError } from '../core/errors.js';
import type { StorageError } from '../core/errors.js';
import { err, ok } from '../core/result.js';
import type { Result } from '../core/result.js';
import type { TokenUsage } from '../domain/types/import.js';

/**
 * Cost log entry
 */
interface CostLogEntry extends TokenUsage {
  /** Source file that was processed */
  sourceFile?: string;
  /** Whether processing succeeded */
  success: boolean;
}

/**
 * Cost log structure
 */
interface CostLog {
  /** Log entries */
  entries: CostLogEntry[];
  /** Total cost in USD */
  totalCostUSD: number;
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Cost summary by model
 */
export interface CostSummary {
  /** Total cost in USD */
  totalCostUSD: number;
  /** Total input tokens */
  totalInputTokens: number;
  /** Total output tokens */
  totalOutputTokens: number;
  /** Number of requests */
  requestCount: number;
  /** Cost breakdown by model */
  byModel: Map<string, {
    costUSD: number;
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
  }>;
  /** Recent entries */
  recentEntries: CostLogEntry[];
}

/**
 * Service for tracking LLM API costs
 */
export class CostTrackerService {
  private logPath: string;
  private enabled: boolean;
  private cache: CostLog | null = null;

  /**
   * Creates a new cost tracker service
   * @param logPath - Path to cost log file
   * @param enabled - Whether cost tracking is enabled
   */
  constructor(logPath: string = './data/imports/cost-log.json', enabled: boolean = true) {
    this.logPath = logPath;
    this.enabled = enabled;
  }

  /**
   * Initialize cost tracking
   * Creates the log file if it doesn't exist
   */
  async initialize(): Promise<Result<void, StorageError>> {
    if (!this.enabled) {
      return ok(undefined);
    }

    try {
      // Create directory
      await mkdir(dirname(this.logPath), { recursive: true });

      // Try to load existing log
      const loadResult = await this.load();

      if (!loadResult.success) {
        // Create new log if doesn't exist
        const newLog: CostLog = {
          entries: [],
          totalCostUSD: 0,
          lastUpdated: new Date().toISOString(),
        };

        await this.save(newLog);
        this.cache = newLog;
      }

      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to initialize cost tracker', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Load cost log from disk
   */
  private async load(): Promise<Result<CostLog, StorageError>> {
    try {
      const data = await readFile(this.logPath, 'utf-8');
      const log = JSON.parse(data) as CostLog;
      this.cache = log;
      return ok(log);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return err(createStorageError('NOT_FOUND', 'Cost log not found'));
      }

      return err(
        createStorageError('READ_ERROR', 'Failed to load cost log', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Save cost log to disk
   */
  private async save(log: CostLog): Promise<Result<void, StorageError>> {
    try {
      await mkdir(dirname(this.logPath), { recursive: true });
      await writeFile(this.logPath, JSON.stringify(log, null, 2), 'utf-8');
      this.cache = log;
      return ok(undefined);
    } catch (error) {
      return err(
        createStorageError('WRITE_ERROR', 'Failed to save cost log', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Log token usage
   * @param usage - Token usage from LLM call
   * @param sourceFile - Optional source file that was processed
   * @param success - Whether the processing succeeded
   */
  async logUsage(
    usage: TokenUsage,
    sourceFile?: string,
    success: boolean = true
  ): Promise<Result<void, StorageError>> {
    if (!this.enabled) {
      return ok(undefined);
    }

    // Load current log
    let log: CostLog;
    if (this.cache) {
      log = this.cache;
    } else {
      const loadResult = await this.load();
      if (!loadResult.success) {
        // Create new log
        log = {
          entries: [],
          totalCostUSD: 0,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        log = loadResult.value;
      }
    }

    // Add entry
    const entry: CostLogEntry = {
      ...usage,
      sourceFile,
      success,
      timestamp: new Date(),
    };

    log.entries.push(entry);
    log.totalCostUSD += usage.costUSD;
    log.lastUpdated = new Date().toISOString();

    // Save log
    return this.save(log);
  }

  /**
   * Get total cost
   */
  async getTotalCost(): Promise<Result<number, StorageError>> {
    if (!this.enabled) {
      return ok(0);
    }

    if (this.cache) {
      return ok(this.cache.totalCostUSD);
    }

    const loadResult = await this.load();
    if (!loadResult.success) {
      return ok(0);
    }

    return ok(loadResult.value.totalCostUSD);
  }

  /**
   * Get cost summary
   */
  async getSummary(): Promise<Result<CostSummary, StorageError>> {
    if (!this.enabled) {
      return ok({
        totalCostUSD: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        requestCount: 0,
        byModel: new Map(),
        recentEntries: [],
      });
    }

    // Load log
    let log: CostLog;
    if (this.cache) {
      log = this.cache;
    } else {
      const loadResult = await this.load();
      if (!loadResult.success) {
        return ok({
          totalCostUSD: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          requestCount: 0,
          byModel: new Map(),
          recentEntries: [],
        });
      }
      log = loadResult.value;
    }

    // Calculate summary
    const byModel = new Map<string, {
      costUSD: number;
      inputTokens: number;
      outputTokens: number;
      requestCount: number;
    }>();

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const entry of log.entries) {
      totalInputTokens += entry.inputTokens;
      totalOutputTokens += entry.outputTokens;

      const existing = byModel.get(entry.model) ?? {
        costUSD: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
      };

      existing.costUSD += entry.costUSD;
      existing.inputTokens += entry.inputTokens;
      existing.outputTokens += entry.outputTokens;
      existing.requestCount += 1;

      byModel.set(entry.model, existing);
    }

    return ok({
      totalCostUSD: log.totalCostUSD,
      totalInputTokens,
      totalOutputTokens,
      requestCount: log.entries.length,
      byModel,
      recentEntries: log.entries.slice(-10),
    });
  }

  /**
   * Get cost by date range
   */
  async getCostByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<number, StorageError>> {
    if (!this.enabled) {
      return ok(0);
    }

    // Load log
    let log: CostLog;
    if (this.cache) {
      log = this.cache;
    } else {
      const loadResult = await this.load();
      if (!loadResult.success) {
        return ok(0);
      }
      log = loadResult.value;
    }

    // Filter entries by date range
    const cost = log.entries
      .filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      })
      .reduce((sum, entry) => sum + entry.costUSD, 0);

    return ok(cost);
  }

  /**
   * Clear all cost tracking data
   */
  async clear(): Promise<Result<void, StorageError>> {
    const newLog: CostLog = {
      entries: [],
      totalCostUSD: 0,
      lastUpdated: new Date().toISOString(),
    };

    return this.save(newLog);
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

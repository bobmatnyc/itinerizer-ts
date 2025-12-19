/**
 * Model selection service for dynamic model selection based on file size
 * @module services/model-selector
 */

import { promises as fs } from 'node:fs';
import { createStorageError } from '../core/errors.js';
import type { StorageError } from '../core/errors.js';
import { err, ok } from '../core/result.js';
import type { Result } from '../core/result.js';

/**
 * Model configuration with pricing and capabilities
 */
export interface ModelConfig {
  /** Model name (OpenRouter format) */
  name: string;
  /** Maximum output tokens */
  maxTokens: number;
  /** Cost per million input tokens (USD) */
  costPerMillionInput: number;
  /** Cost per million output tokens (USD) */
  costPerMillionOutput: number;
  /** Maximum recommended file size in bytes */
  maxRecommendedFileSize: number;
}

/**
 * Available models sorted by capacity (smallest to largest)
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    name: 'anthropic/claude-3-haiku',
    maxTokens: 8192,
    costPerMillionInput: 0.25,
    costPerMillionOutput: 1.25,
    maxRecommendedFileSize: 500_000, // 500KB
  },
  {
    name: 'anthropic/claude-3.5-sonnet',
    maxTokens: 16384,
    costPerMillionInput: 3.0,
    costPerMillionOutput: 15.0,
    maxRecommendedFileSize: 2_000_000, // 2MB
  },
  {
    name: 'anthropic/claude-3-opus',
    maxTokens: 32768,
    costPerMillionInput: 15.0,
    costPerMillionOutput: 75.0,
    maxRecommendedFileSize: 10_000_000, // 10MB
  },
];

/**
 * Cost estimation result
 */
export interface CostEstimate {
  /** Selected model name */
  model: string;
  /** Estimated cost in USD (rough approximation) */
  estimatedCost: number;
  /** File size in bytes */
  fileSize: number;
  /** Estimated input tokens (rough approximation) */
  estimatedInputTokens: number;
  /** Estimated output tokens (rough approximation) */
  estimatedOutputTokens: number;
}

/**
 * Service for intelligent model selection based on file characteristics
 */
export class ModelSelectorService {
  /**
   * Select the most appropriate model for a file based on its size
   * @param filePath - Path to the file
   * @returns Selected model configuration
   */
  async selectModelForFile(filePath: string): Promise<Result<ModelConfig, StorageError>> {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      return ok(this.selectModelBySize(fileSize));
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', `Failed to read file for model selection: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Select model based on file size (synchronous)
   * @param fileSize - File size in bytes
   * @returns Selected model configuration
   */
  selectModelBySize(fileSize: number): ModelConfig {
    // Find the smallest model that can handle this file size
    for (const model of AVAILABLE_MODELS) {
      if (fileSize <= model.maxRecommendedFileSize) {
        return model;
      }
    }

    // If file is larger than all recommendations, use the largest model
    return AVAILABLE_MODELS[AVAILABLE_MODELS.length - 1]!;
  }

  /**
   * Get a specific model by name
   * @param name - Model name
   * @returns Model configuration or undefined if not found
   */
  getModel(name: string): ModelConfig | undefined {
    return AVAILABLE_MODELS.find((model) => model.name === name);
  }

  /**
   * Get all available models
   * @returns Array of all model configurations
   */
  getAllModels(): ModelConfig[] {
    return [...AVAILABLE_MODELS];
  }

  /**
   * Estimate cost for processing a file
   * @param filePath - Path to the file
   * @param modelName - Optional model name (auto-selected if not provided)
   * @returns Cost estimation
   */
  async estimateCost(
    filePath: string,
    modelName?: string
  ): Promise<Result<CostEstimate, StorageError>> {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Select or get model
      let model: ModelConfig;
      if (modelName) {
        const found = this.getModel(modelName);
        if (!found) {
          return err(
            createStorageError('VALIDATION_ERROR', `Unknown model: ${modelName}`, {
              availableModels: AVAILABLE_MODELS.map((m) => m.name),
            })
          );
        }
        model = found;
      } else {
        model = this.selectModelBySize(fileSize);
      }

      // Rough estimation:
      // - Assume 1 byte ≈ 0.3 tokens for input (conservative estimate)
      // - Assume output tokens ≈ 50% of input tokens (itinerary is usually shorter than raw PDF text)
      const estimatedInputTokens = Math.ceil(fileSize * 0.3);
      const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.5);

      const inputCost = (estimatedInputTokens / 1_000_000) * model.costPerMillionInput;
      const outputCost = (estimatedOutputTokens / 1_000_000) * model.costPerMillionOutput;
      const estimatedCost = inputCost + outputCost;

      return ok({
        model: model.name,
        estimatedCost,
        fileSize,
        estimatedInputTokens,
        estimatedOutputTokens,
      });
    } catch (error) {
      return err(
        createStorageError('READ_ERROR', `Failed to read file for cost estimation: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Get model selection explanation for a file
   * @param filePath - Path to the file
   * @returns Human-readable explanation of model selection
   */
  async explainSelection(filePath: string): Promise<Result<string, StorageError>> {
    const result = await this.selectModelForFile(filePath);
    if (!result.success) {
      return result;
    }

    const model = result.value;
    const stats = await fs.stat(filePath);
    const fileSizeMB = (stats.size / 1_000_000).toFixed(2);
    const maxSizeMB = (model.maxRecommendedFileSize / 1_000_000).toFixed(2);

    const explanation = [
      `File size: ${fileSizeMB}MB`,
      `Selected model: ${model.name}`,
      `  - Max tokens: ${model.maxTokens.toLocaleString()}`,
      `  - Recommended for files up to ${maxSizeMB}MB`,
      `  - Cost: $${model.costPerMillionInput}/M input, $${model.costPerMillionOutput}/M output`,
    ].join('\n');

    return ok(explanation);
  }
}

/**
 * Travel Agent - Available models route
 * GET /api/v1/agent/models
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Model configuration with pricing and capabilities
 */
interface ModelConfig {
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
 * Inlined to avoid importing parent project code that fails in serverless
 */
const AVAILABLE_MODELS: ModelConfig[] = [
	{
		name: 'anthropic/claude-3-haiku',
		maxTokens: 8192,
		costPerMillionInput: 0.25,
		costPerMillionOutput: 1.25,
		maxRecommendedFileSize: 500_000 // 500KB
	},
	{
		name: 'anthropic/claude-3.5-sonnet',
		maxTokens: 16384,
		costPerMillionInput: 3.0,
		costPerMillionOutput: 15.0,
		maxRecommendedFileSize: 2_000_000 // 2MB
	},
	{
		name: 'anthropic/claude-3-opus',
		maxTokens: 32768,
		costPerMillionInput: 15.0,
		costPerMillionOutput: 75.0,
		maxRecommendedFileSize: 10_000_000 // 10MB
	}
];

/**
 * GET /api/v1/agent/models
 * Get available LLM models for import
 */
export const GET: RequestHandler = async () => {
	return json(AVAILABLE_MODELS);
};

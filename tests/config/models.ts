/**
 * Model configurations for E2E testing
 *
 * LOCKED_MODELS: Production model assignments for each agent type
 * EVAL_MODELS: Models available for evaluation and experimentation
 */

/**
 * LOCKED_MODELS - Production model assignments based on evaluation
 *
 * Model Selection (2025-12-23):
 * - Claude 3.5 Haiku: Recommended replacement for deprecated Claude 3 Haiku
 * - Perfect ONE question rule compliance (1.00)
 * - Fast response times, cost-effective
 *
 * Available Haiku models (OpenRouter):
 * - claude-3-haiku: $0.25/1M (deprecated soon)
 * - claude-3.5-haiku: $0.80/1M (current, recommended)
 * - claude-haiku-4.5: $1.00/1M (latest)
 *
 * See: tests/eval/results/EVALUATION_SUMMARY.md
 */
export const LOCKED_MODELS = {
  'trip-designer': {
    model: 'anthropic/claude-3.5-haiku',
    description: 'Fast, excellent format compliance, perfect ONE question rule',
    maxTokens: 4096,
  },
  'help': {
    model: 'anthropic/claude-3.5-haiku',
    description: 'Fast and capable for Q&A',
    maxTokens: 2048,
  },
  'travel-agent': {
    model: 'anthropic/claude-3.5-haiku',
    description: 'Fast synthesis with perfect question compliance',
    maxTokens: 4096,
  },
} as const;

export const EVAL_MODELS = [
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-sonnet-4',
] as const;

export type AgentType = keyof typeof LOCKED_MODELS;
export type EvalModel = (typeof EVAL_MODELS)[number];

/**
 * Get the locked production model for an agent type
 */
export function getModelForAgent(agent: AgentType): string {
  return LOCKED_MODELS[agent].model;
}

/**
 * Get the max tokens configuration for an agent type
 */
export function getMaxTokensForAgent(agent: AgentType): number {
  return LOCKED_MODELS[agent].maxTokens;
}

/**
 * Get full model configuration for an agent type
 */
export function getModelConfig(agent: AgentType) {
  return LOCKED_MODELS[agent];
}

/**
 * Validate that a model is in the eval set
 */
export function isEvalModel(model: string): model is EvalModel {
  return EVAL_MODELS.includes(model as EvalModel);
}

/**
 * Get description for a model
 */
export function getModelDescription(agent: AgentType): string {
  return LOCKED_MODELS[agent].description;
}

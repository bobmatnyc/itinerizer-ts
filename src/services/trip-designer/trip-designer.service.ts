/**
 * Trip Designer Agent service - conversational trip planning
 * @module services/trip-designer/trip-designer
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { createStorageError, createValidationError } from '../../core/errors.js';
import type { StorageError, ValidationError } from '../../core/errors.js';
import { err, ok } from '../../core/result.js';
import type { Result } from '../../core/result.js';
import type { ItineraryId, SegmentId } from '../../domain/types/branded.js';
import type {
  TripDesignerConfig,
  TripDesignerSession,
  SessionId,
  AgentResponse,
  ToolCall,
  ToolExecutionResult,
  TripDesignerError,
  Message,
  StreamEvent,
} from '../../domain/types/trip-designer.js';
import { SessionManager, InMemorySessionStorage } from './session.js';
import type { SessionStorage } from './session.js';
import { ALL_TOOLS } from './tools.js';
import { TRIP_DESIGNER_SYSTEM_PROMPT, COMPACTION_SYSTEM_PROMPT } from '../../prompts/index.js';
import { ToolExecutor } from './tool-executor.js';
import type { KnowledgeService } from '../knowledge.service.js';
import type { TravelAgentFacade } from '../travel-agent-facade.service.js';
import { summarizeItineraryMinimal, summarizeItinerary } from './itinerary-summarizer.js';

/**
 * Default model for Trip Designer
 */
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet:online';

/**
 * Claude 3.5 Sonnet pricing (USD per 1M tokens)
 */
const CLAUDE_PRICING = {
  inputCostPer1M: 3.0,
  outputCostPer1M: 15.0,
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<TripDesignerConfig> = {
  model: DEFAULT_MODEL,
  maxTokens: 4096,
  temperature: 0.7,
  sessionCostLimit: 2.0,
  streaming: false,
  compactionThreshold: 0.5, // 50% = 100k tokens for more aggressive compression
};

/**
 * Trip Designer Agent service
 */
export class TripDesignerService {
  private client: OpenAI;
  private config: TripDesignerConfig;
  private sessionManager: SessionManager;
  private toolExecutor: ToolExecutor;
  private deps: {
    itineraryService?: unknown;
    segmentService?: unknown;
    dependencyService?: unknown;
  };
  private knowledgeService?: KnowledgeService;
  private knowledgeInitialized = false;
  private travelAgentFacade?: TravelAgentFacade;

  /**
   * Create a new Trip Designer service
   */
  constructor(
    config: TripDesignerConfig,
    sessionStorage?: SessionStorage,
    dependencies?: {
      itineraryService?: unknown;
      segmentService?: unknown;
      dependencyService?: unknown;
      knowledgeService?: KnowledgeService;
      travelAgentFacade?: TravelAgentFacade;
    }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize OpenRouter client
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/itinerizer',
        'X-Title': 'Itinerizer Trip Designer',
      },
    });

    // Initialize session manager
    const storage = sessionStorage || new InMemorySessionStorage();
    this.sessionManager = new SessionManager(storage);

    // Initialize tool executor
    this.toolExecutor = new ToolExecutor(dependencies);

    // Store dependencies for use in buildMessages
    this.deps = {
      itineraryService: dependencies?.itineraryService,
      segmentService: dependencies?.segmentService,
      dependencyService: dependencies?.dependencyService,
    };

    // Store knowledge service if provided (lazy initialization)
    this.knowledgeService = dependencies?.knowledgeService;

    // Store travel agent facade if provided
    this.travelAgentFacade = dependencies?.travelAgentFacade;
  }

  /**
   * Create a new trip planning session
   * If the itinerary already has content, injects a summary into the initial context
   */
  async createSession(itineraryId: ItineraryId): Promise<Result<SessionId, StorageError>> {
    const sessionResult = await this.sessionManager.createSession(itineraryId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    const session = sessionResult.value;

    // Check if the itinerary has existing content
    if (this.deps.itineraryService) {
      const itineraryService = this.deps.itineraryService as any;
      const itineraryResult = await itineraryService.get(itineraryId);

      if (itineraryResult.success) {
        const itinerary = itineraryResult.value;

        // If itinerary has segments or meaningful metadata, inject context
        const hasContent =
          itinerary.segments.length > 0 ||
          itinerary.title !== 'New Itinerary' ||
          (itinerary.destinations && itinerary.destinations.length > 0) ||
          (itinerary.tripPreferences && Object.keys(itinerary.tripPreferences).length > 0);

        if (hasContent) {
          // Use Travel Agent facade for summary if available, otherwise fallback to direct summarizer
          let summary: string;
          if (this.travelAgentFacade) {
            const summaryResult = await this.travelAgentFacade.summarize(itineraryId);
            if (summaryResult.success) {
              summary = summaryResult.value.summary;
            } else {
              // Fallback to direct summarizer if Travel Agent fails
              summary = summarizeItinerary(itinerary);
            }
          } else {
            // Fallback to direct summarizer if Travel Agent not available
            summary = summarizeItinerary(itinerary);
          }

          // Inject itinerary context as initial system message
          const contextMessage = `The user is working on an existing itinerary. Here's the current state:

${summary}

Important: Since the itinerary already has content, skip any questions about information that's already provided in the summary above. Instead, acknowledge what's already planned and offer to help refine, modify, or extend the itinerary.`;

          await this.sessionManager.addMessage(session.id, {
            role: 'system',
            content: contextMessage,
          });
        }
      }
    }

    return ok(session.id);
  }

  /**
   * Send a message and get agent response
   */
  async chat(
    sessionId: SessionId,
    userMessage: string
  ): Promise<Result<AgentResponse, TripDesignerError>> {
    // Get session
    const sessionResult = await this.sessionManager.getSession(sessionId);
    if (!sessionResult.success) {
      return err({ type: 'session_not_found', sessionId });
    }

    const session = sessionResult.value;

    // Add user message to session
    const addMessageResult = await this.sessionManager.addMessage(sessionId, {
      role: 'user',
      content: userMessage,
    });

    if (!addMessageResult.success) {
      return err({ type: 'session_not_found', sessionId });
    }

    // Check if compaction needed BEFORE building messages
    const shouldCompact = this.sessionManager.shouldCompact(session, this.config.compactionThreshold);
    if (shouldCompact) {
      console.log(`Compaction triggered for session ${sessionId}. Messages: ${session.messages.length}, Estimated tokens: ${this.estimateSessionTokens(session)}`);
      const compactResult = await this.compactSession(sessionId);
      if (!compactResult.success) {
        // Log warning but continue
        console.warn('Session compaction failed:', compactResult.error);
      } else {
        // Reload session after compaction
        const reloadResult = await this.sessionManager.getSession(sessionId);
        if (reloadResult.success) {
          Object.assign(session, reloadResult.value);
        }
      }
    }

    // Build messages for LLM with RAG context
    const messages = await this.buildMessagesWithRAG(session, userMessage);

    // Call LLM with tools
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || DEFAULT_MODEL,
        messages,
        tools: ALL_TOOLS as ChatCompletionTool[],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const choice = response.choices[0];
      if (!choice) {
        return err({
          type: 'llm_api_error',
          error: 'No response from LLM',
          retryable: true,
        });
      }

      const assistantMessage = choice.message;
      const toolCalls = assistantMessage.tool_calls;

      // Track token usage
      const usage = response.usage;
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;

      // Execute tool calls if any
      let toolResults: ToolExecutionResult[] = [];
      let segmentsModified: SegmentId[] = [];

      if (toolCalls && toolCalls.length > 0) {
        // Convert to our ToolCall format
        const ourToolCalls: ToolCall[] = toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));

        // Execute all tool calls
        const executionResults = await Promise.all(
          ourToolCalls.map((tc) =>
            this.toolExecutor.execute({
              sessionId,
              itineraryId: session.itineraryId,
              toolCall: tc,
            })
          )
        );

        toolResults = executionResults;

        // Collect modified segment IDs
        for (const result of executionResults) {
          if (result.success && result.metadata?.segmentId) {
            segmentsModified.push(result.metadata.segmentId);
          }
        }

        // Add assistant message with tool calls
        await this.sessionManager.addMessage(sessionId, {
          role: 'assistant',
          content: assistantMessage.content || '',
          toolCalls: ourToolCalls,
          tokens: { input: inputTokens, output: outputTokens },
        });

        // Add tool results as separate messages
        for (const result of toolResults) {
          await this.sessionManager.addMessage(sessionId, {
            role: 'tool',
            content: JSON.stringify(result.result || { error: result.error }),
            toolResults: [result],
          });
        }

        // Make a second call to get natural language response with tool results
        const toolResultMessages: ChatCompletionMessageParam[] = toolResults.map((result) => ({
          role: 'tool' as const,
          tool_call_id: result.toolCallId,
          content: JSON.stringify(result.result || { error: result.error }),
        }));

        const finalResponse = await this.client.chat.completions.create({
          model: this.config.model || DEFAULT_MODEL,
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: assistantMessage.content,
              tool_calls: toolCalls,
            },
            ...toolResultMessages,
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        });

        const finalChoice = finalResponse.choices[0];
        const finalMessage = finalChoice?.message.content || '';

        // Add final assistant message
        await this.sessionManager.addMessage(sessionId, {
          role: 'assistant',
          content: finalMessage,
          tokens: {
            input: finalResponse.usage?.prompt_tokens || 0,
            output: finalResponse.usage?.completion_tokens || 0,
          },
        });

        // Store conversation in knowledge graph (async, don't wait)
        this.storeConversation(sessionId, userMessage, finalMessage).catch((error) => {
          console.warn('Failed to store conversation:', error);
        });

        // Return agent response
        return ok({
          message: finalMessage,
          itineraryUpdated: segmentsModified.length > 0,
          segmentsModified,
          toolCallsMade: ourToolCalls,
        });
      } else {
        // No tool calls, just a message
        const content = assistantMessage.content || '';

        // Add assistant message
        await this.sessionManager.addMessage(sessionId, {
          role: 'assistant',
          content,
          tokens: { input: inputTokens, output: outputTokens },
        });

        // Parse structured questions if any (from JSON in message)
        const structuredQuestions = this.parseStructuredQuestions(content);
        const cleanMessage = this.extractCleanMessage(content);

        // Store conversation in knowledge graph (async, don't wait)
        this.storeConversation(sessionId, userMessage, cleanMessage).catch((error) => {
          console.warn('Failed to store conversation:', error);
        });

        return ok({
          message: cleanMessage,
          itineraryUpdated: false,
          structuredQuestions,
        });
      }
    } catch (error) {
      // Handle API errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          return err({
            type: 'llm_api_error',
            error: 'Invalid API key',
            retryable: false,
          });
        }

        if (error.message.includes('429') || error.message.includes('rate limit')) {
          return err({
            type: 'rate_limit_exceeded',
            retryAfter: 60,
          });
        }
      }

      return err({
        type: 'llm_api_error',
        error: error instanceof Error ? error.message : String(error),
        retryable: true,
      });
    }
  }

  /**
   * Send a message and stream the response
   * Yields StreamEvent objects for SSE transmission
   */
  async *chatStream(
    sessionId: SessionId,
    userMessage: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    // Get session
    const sessionResult = await this.sessionManager.getSession(sessionId);
    if (!sessionResult.success) {
      yield { type: 'error', message: 'Session not found' };
      return;
    }

    const session = sessionResult.value;

    // Add user message to session
    const addMessageResult = await this.sessionManager.addMessage(sessionId, {
      role: 'user',
      content: userMessage,
    });

    if (!addMessageResult.success) {
      yield { type: 'error', message: 'Failed to add message to session' };
      return;
    }

    // Check if compaction needed BEFORE building messages
    const shouldCompact = this.sessionManager.shouldCompact(session, this.config.compactionThreshold);
    if (shouldCompact) {
      console.log(`Compaction triggered for session ${sessionId}. Messages: ${session.messages.length}, Estimated tokens: ${this.estimateSessionTokens(session)}`);
      const compactResult = await this.compactSession(sessionId);
      if (!compactResult.success) {
        console.warn('Session compaction failed:', compactResult.error);
      } else {
        // Reload session after compaction
        const reloadResult = await this.sessionManager.getSession(sessionId);
        if (reloadResult.success) {
          Object.assign(session, reloadResult.value);
        }
      }
    }

    // Build messages for LLM with RAG context
    const messages = await this.buildMessagesWithRAG(session, userMessage);

    try {
      // Call LLM with streaming enabled
      const stream = await this.client.chat.completions.create({
        model: this.config.model || DEFAULT_MODEL,
        messages,
        tools: ALL_TOOLS as ChatCompletionTool[],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true,
      });

      let fullContent = '';
      let toolCalls: ToolCall[] = [];
      let currentToolCall: Partial<ToolCall> | null = null;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // Stream the response
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Track token usage if available
        if (chunk.usage) {
          totalInputTokens = chunk.usage.prompt_tokens || 0;
          totalOutputTokens = chunk.usage.completion_tokens || 0;
        }

        if (!delta) continue;

        // Handle text content
        if (delta.content) {
          fullContent += delta.content;
          yield { type: 'text', content: delta.content };
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              // New tool call or continuation
              if (!currentToolCall || toolCallDelta.id) {
                // Start new tool call
                currentToolCall = {
                  id: toolCallDelta.id || '',
                  type: 'function',
                  function: {
                    name: toolCallDelta.function?.name || '',
                    arguments: toolCallDelta.function?.arguments || '',
                  },
                };
              } else if (currentToolCall.function) {
                // Append to existing tool call
                if (toolCallDelta.function?.arguments) {
                  currentToolCall.function.arguments += toolCallDelta.function.arguments;
                }
                if (toolCallDelta.function?.name) {
                  currentToolCall.function.name += toolCallDelta.function.name;
                }
              }
            }
          }
        }

        // Check if tool call is complete (next chunk doesn't have tool_calls)
        const nextHasToolCalls = chunk.choices[0]?.finish_reason === 'tool_calls';
        if (nextHasToolCalls && currentToolCall && currentToolCall.id && currentToolCall.function) {
          const completeToolCall = currentToolCall as ToolCall;
          toolCalls.push(completeToolCall);

          // Parse arguments and emit tool_call event
          try {
            const args = JSON.parse(completeToolCall.function.arguments);
            yield {
              type: 'tool_call',
              name: completeToolCall.function.name,
              arguments: args,
            };
          } catch {
            // Invalid JSON, skip
          }

          currentToolCall = null;
        }
      }

      // Finalize any remaining tool call
      if (currentToolCall && currentToolCall.id && currentToolCall.function) {
        const completeToolCall = currentToolCall as ToolCall;
        toolCalls.push(completeToolCall);

        try {
          const args = JSON.parse(completeToolCall.function.arguments);
          yield {
            type: 'tool_call',
            name: completeToolCall.function.name,
            arguments: args,
          };
        } catch {
          // Invalid JSON, skip
        }
      }

      // Handle tool calls if any
      let segmentsModified: SegmentId[] = [];

      if (toolCalls.length > 0) {
        // Add assistant message with tool calls
        await this.sessionManager.addMessage(sessionId, {
          role: 'assistant',
          content: fullContent,
          toolCalls,
        });

        // Execute tool calls and emit results
        const executionResults = await Promise.all(
          toolCalls.map((tc) =>
            this.toolExecutor.execute({
              sessionId,
              itineraryId: session.itineraryId,
              toolCall: tc,
            })
          )
        );

        // Emit tool results
        for (let i = 0; i < executionResults.length; i++) {
          const result = executionResults[i];
          const toolCall = toolCalls[i];

          yield {
            type: 'tool_result',
            name: toolCall.function.name,
            result: result.result,
            success: result.success,
          };

          // Track modified segments
          if (result.success && result.metadata?.segmentId) {
            segmentsModified.push(result.metadata.segmentId);
          }
        }

        // Add tool results as messages
        for (const result of executionResults) {
          await this.sessionManager.addMessage(sessionId, {
            role: 'tool',
            content: JSON.stringify(result.result || { error: result.error }),
            toolResults: [result],
          });
        }

        // Make second call to get natural language response
        const toolResultMessages: ChatCompletionMessageParam[] = executionResults.map((result) => ({
          role: 'tool' as const,
          tool_call_id: result.toolCallId,
          content: JSON.stringify(result.result || { error: result.error }),
        }));

        const finalStream = await this.client.chat.completions.create({
          model: this.config.model || DEFAULT_MODEL,
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: fullContent,
              tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              })),
            },
            ...toolResultMessages,
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: true,
        });

        let finalContent = '';
        for await (const chunk of finalStream) {
          const delta = chunk.choices[0]?.delta;

          // Track token usage from second call
          if (chunk.usage) {
            totalInputTokens += chunk.usage.prompt_tokens || 0;
            totalOutputTokens += chunk.usage.completion_tokens || 0;
          }

          if (delta?.content) {
            finalContent += delta.content;
            yield { type: 'text', content: delta.content };
          }
        }

        // Add final assistant message
        await this.sessionManager.addMessage(sessionId, {
          role: 'assistant',
          content: finalContent,
        });

        // Store conversation in knowledge graph (async, don't wait)
        this.storeConversation(sessionId, userMessage, finalContent).catch((error) => {
          console.warn('Failed to store conversation:', error);
        });

        // Parse structured questions from final message
        const structuredQuestions = this.parseStructuredQuestions(finalContent);
        if (structuredQuestions && structuredQuestions.length > 0) {
          yield {
            type: 'structured_questions',
            questions: structuredQuestions,
          };
        }

        // Calculate costs
        const totalTokens = totalInputTokens + totalOutputTokens;
        const inputCost = (totalInputTokens / 1_000_000) * CLAUDE_PRICING.inputCostPer1M;
        const outputCost = (totalOutputTokens / 1_000_000) * CLAUDE_PRICING.outputCostPer1M;
        const totalCost = inputCost + outputCost;

        // Emit done event
        yield {
          type: 'done',
          itineraryUpdated: segmentsModified.length > 0,
          segmentsModified,
          tokens: {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalTokens,
          },
          cost: {
            input: inputCost,
            output: outputCost,
            total: totalCost,
          },
        };
      } else {
        // No tool calls, just a message
        await this.sessionManager.addMessage(sessionId, {
          role: 'assistant',
          content: fullContent,
        });

        // Store conversation in knowledge graph (async, don't wait)
        this.storeConversation(sessionId, userMessage, fullContent).catch((error) => {
          console.warn('Failed to store conversation:', error);
        });

        // Parse structured questions
        const structuredQuestions = this.parseStructuredQuestions(fullContent);
        if (structuredQuestions && structuredQuestions.length > 0) {
          yield {
            type: 'structured_questions',
            questions: structuredQuestions,
          };
        }

        // Calculate costs
        const totalTokens = totalInputTokens + totalOutputTokens;
        const inputCost = (totalInputTokens / 1_000_000) * CLAUDE_PRICING.inputCostPer1M;
        const outputCost = (totalOutputTokens / 1_000_000) * CLAUDE_PRICING.outputCostPer1M;
        const totalCost = inputCost + outputCost;

        // Emit done event
        yield {
          type: 'done',
          itineraryUpdated: false,
          tokens: {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalTokens,
          },
          cost: {
            input: inputCost,
            output: outputCost,
            total: totalCost,
          },
        };
      }
    } catch (error) {
      // Handle API errors
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Invalid API key';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }

      yield { type: 'error', message: errorMessage };
    }
  }

  /**
   * Get current session state
   */
  async getSession(sessionId: SessionId): Promise<Result<TripDesignerSession, StorageError>> {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Compact session history when context limit approaching
   *
   * This method summarizes the conversation history to reduce token count:
   * 1. Extract trip profile from early messages
   * 2. Keep recent messages (last 10)
   * 3. Replace older messages with a structured summary
   * 4. Preserve all tool calls and results
   */
  async compactSession(sessionId: SessionId): Promise<Result<void, StorageError>> {
    // Get session
    const sessionResult = await this.sessionManager.getSession(sessionId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    const session = sessionResult.value;

    // Don't compact if already recently compacted
    const lastCompacted = session.metadata.lastCompactedAt;
    if (lastCompacted) {
      const timeSinceCompaction = Date.now() - lastCompacted.getTime();
      const minTimeBetweenCompactions = 5 * 60 * 1000; // 5 minutes
      if (timeSinceCompaction < minTimeBetweenCompactions) {
        return ok(undefined);
      }
    }

    // Keep recent messages (last 5-7 for more aggressive compression)
    const KEEP_RECENT_COUNT = 6;
    const recentMessages = session.messages.slice(-KEEP_RECENT_COUNT);
    const oldMessages = session.messages.slice(0, -KEEP_RECENT_COUNT);

    // If not enough old messages to compact, skip
    if (oldMessages.length < 5) {
      return ok(undefined);
    }

    try {
      // Build conversation history for summarization
      const conversationHistory = oldMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      // Get itinerary context
      let itineraryContext = '';
      if (this.deps.itineraryService) {
        const itineraryService = this.deps.itineraryService as any;
        const itineraryResult = await itineraryService.get(session.itineraryId);
        if (itineraryResult.success) {
          itineraryContext = summarizeItineraryMinimal(itineraryResult.value);
        }
      }

      // Call LLM to generate summary
      const response = await this.client.chat.completions.create({
        model: this.config.model || DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: COMPACTION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Summarize the following trip planning conversation. Current itinerary state: ${itineraryContext || 'New trip'}

Conversation to summarize:
${conversationHistory}

Provide a structured JSON summary following the format in your system instructions.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more focused summarization
      });

      const summaryContent = response.choices[0]?.message.content;
      if (!summaryContent) {
        console.warn('No summary generated, skipping compaction');
        return ok(undefined);
      }

      // Parse the summary (it should be JSON)
      let summary;
      try {
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = summaryContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                         summaryContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          summary = JSON.parse(jsonStr);
        } else {
          summary = JSON.parse(summaryContent);
        }
      } catch (error) {
        console.warn('Failed to parse compaction summary, using raw content');
        summary = { summary: summaryContent };
      }

      // Create a single system message with the summary
      const summaryMessage: Message = {
        role: 'system',
        content: `[Conversation Summary - ${oldMessages.length} messages compacted on ${new Date().toLocaleString()}]

${JSON.stringify(summary, null, 2)}

Recent conversation continues below...`,
        timestamp: new Date(),
      };

      // Replace old messages with summary + keep recent messages
      session.messages = [summaryMessage, ...recentMessages];

      // Update metadata
      session.metadata.lastCompactedAt = new Date();
      session.metadata.messageCount = session.messages.length;

      // Recalculate total tokens (more accurate estimation)
      const summaryTokens = Math.ceil(summaryMessage.content.length / 4);
      let recentTokens = 0;
      for (const m of recentMessages) {
        if (m.tokens) {
          recentTokens += (m.tokens.input || 0) + (m.tokens.output || 0);
        } else {
          // Estimate from content if no tracked tokens
          recentTokens += Math.ceil(m.content.length / 4);
        }
      }
      session.metadata.totalTokens = summaryTokens + recentTokens;

      console.log(`Session compacted: ${oldMessages.length} messages -> 1 summary. Estimated tokens: ${session.metadata.totalTokens}`);

      // Save updated session
      return this.sessionManager.updateSession(session);
    } catch (error) {
      console.error('Session compaction failed:', error);
      return err(
        createStorageError(
          'UNKNOWN',
          `Session compaction failed: ${error instanceof Error ? error.message : String(error)}`,
          { sessionId }
        )
      );
    }
  }

  /**
   * Lazily initialize knowledge service
   */
  private async ensureKnowledgeInitialized(): Promise<void> {
    if (!this.knowledgeService || this.knowledgeInitialized) {
      return;
    }

    try {
      const result = await this.knowledgeService.initialize();
      if (result.success) {
        this.knowledgeInitialized = true;
      } else {
        console.warn('Failed to initialize knowledge service:', result.error.message);
      }
    } catch (error) {
      console.warn('Knowledge service initialization error:', error);
    }
  }

  /**
   * Retrieve RAG context for a user query
   */
  private async retrieveRAGContext(query: string): Promise<string | null> {
    if (!this.knowledgeService || !this.knowledgeInitialized) {
      await this.ensureKnowledgeInitialized();
    }

    if (!this.knowledgeService || !this.knowledgeInitialized) {
      return null; // Graceful degradation
    }

    try {
      const result = await this.knowledgeService.retrieveContext(query, {
        type: 'chat', // Focus on chat messages for now
      });

      if (result.success && result.value.documents.length > 0) {
        return result.value.context;
      }
    } catch (error) {
      console.warn('RAG context retrieval failed:', error);
    }

    return null;
  }

  /**
   * Store chat messages in knowledge graph
   */
  private async storeConversation(
    sessionId: SessionId,
    userMessage: string,
    assistantMessage: string
  ): Promise<void> {
    if (!this.knowledgeService || !this.knowledgeInitialized) {
      await this.ensureKnowledgeInitialized();
    }

    if (!this.knowledgeService || !this.knowledgeInitialized) {
      return; // Graceful degradation
    }

    try {
      // Store both messages in batch
      await this.knowledgeService.storeMessages([
        {
          content: userMessage,
          role: 'user',
          sessionId,
        },
        {
          content: assistantMessage,
          role: 'assistant',
          sessionId,
        },
      ]);
    } catch (error) {
      console.warn('Failed to store conversation in knowledge graph:', error);
    }
  }

  /**
   * Build messages array for LLM from session
   */
  private async buildMessages(session: TripDesignerSession): Promise<ChatCompletionMessageParam[]> {
    let systemPrompt = TRIP_DESIGNER_SYSTEM_PROMPT;

    // Check if the itinerary has content and inject context
    if (this.deps.itineraryService) {
      const itineraryService = this.deps.itineraryService as any;
      const itineraryResult = await itineraryService.get(session.itineraryId);
      if (itineraryResult.success) {
        const itinerary = itineraryResult.value;

        // If itinerary has segments or substantial metadata, include detailed summary
        if (itinerary.segments.length > 0 || itinerary.title !== 'New Itinerary') {
          const summary = summarizeItinerary(itinerary);

          systemPrompt = `${TRIP_DESIGNER_SYSTEM_PROMPT}

## Current Itinerary Context

You are editing an existing itinerary. Here's the current state:

${summary}

The user wants to modify or extend this itinerary. Help them make changes while preserving the existing structure and respecting their stated preferences.`;
        }
      }
    }

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history
    for (const message of session.messages) {
      if (message.role === 'user' || message.role === 'assistant' || message.role === 'system') {
        messages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return messages;
  }

  /**
   * Build messages with RAG context injected
   */
  private async buildMessagesWithRAG(
    session: TripDesignerSession,
    currentUserMessage: string
  ): Promise<ChatCompletionMessageParam[]> {
    // Get base messages (now async with itinerary context)
    const messages = await this.buildMessages(session);

    // Try to retrieve RAG context
    const ragContext = await this.retrieveRAGContext(currentUserMessage);

    if (ragContext) {
      // Inject RAG context into system prompt
      const systemMessage = messages[0];
      if (systemMessage && systemMessage.role === 'system') {
        // Append RAG context to existing system prompt (which may already have itinerary context)
        systemMessage.content = `${systemMessage.content}

## Relevant Knowledge from Previous Conversations

${ragContext}

Use this relevant knowledge to inform your responses, but prioritize the current conversation context.`;
      }
    }

    return messages;
  }

  /**
   * Parse structured questions from message content
   * Looks for JSON blocks in the message (code-fenced or naked)
   */
  private parseStructuredQuestions(content: string): any[] | undefined {
    // Try to find code-fenced JSON blocks first
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || '{}');
        return parsed.structuredQuestions;
      } catch {
        // Fall through to try naked JSON
      }
    }

    // Try to find naked JSON object with structuredQuestions
    const nakedJsonMatch = content.match(/\{[\s\S]*"structuredQuestions"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
    if (nakedJsonMatch) {
      try {
        const parsed = JSON.parse(nakedJsonMatch[0]);
        return parsed.structuredQuestions;
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * Extract clean message from content, removing JSON blocks
   * If content has a JSON response format, extract just the message field
   */
  private extractCleanMessage(content: string): string {
    // Try to parse as JSON response format first (code-fenced)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || '{}');
        if (parsed.message) {
          return parsed.message;
        }
      } catch {
        // Fall through
      }
      // Remove the JSON block from content
      return content.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
    }

    // Try naked JSON
    const nakedJsonMatch = content.match(/\{[\s\S]*"message"\s*:\s*"[\s\S]*"[\s\S]*"structuredQuestions"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
    if (nakedJsonMatch) {
      try {
        const parsed = JSON.parse(nakedJsonMatch[0]);
        if (parsed.message) {
          return parsed.message;
        }
      } catch {
        // Fall through
      }
      // Remove naked JSON from content
      return content.replace(nakedJsonMatch[0], '').trim();
    }

    // Return content as-is if no JSON found
    return content;
  }

  /**
   * Estimate total context tokens for a session
   * This matches the logic in SessionManager.shouldCompact()
   */
  private estimateSessionTokens(session: TripDesignerSession): number {
    const systemPromptTokens = 3000; // System prompt + itinerary context + RAG

    let messageTokens = 0;
    for (const msg of session.messages) {
      if (msg.tokens) {
        messageTokens += (msg.tokens.input || 0) + (msg.tokens.output || 0);
      } else {
        messageTokens += Math.ceil(msg.content.length / 4);
      }
    }

    return systemPromptTokens + messageTokens;
  }

  /**
   * Clean up idle sessions periodically
   */
  async cleanupIdleSessions(): Promise<number> {
    return this.sessionManager.cleanupIdleSessions();
  }

  /**
   * Get statistics about active sessions
   */
  getStats(): {
    activeSessions: number;
  } {
    return {
      activeSessions: this.sessionManager.getActiveSessionCount(),
    };
  }
}

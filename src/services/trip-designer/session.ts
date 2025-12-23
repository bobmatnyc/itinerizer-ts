/**
 * Session management for Trip Designer Agent
 * @module services/trip-designer/session
 */

import { createStorageError } from '../../core/errors.js';
import type { StorageError } from '../../core/errors.js';
import { err, ok } from '../../core/result.js';
import type { Result } from '../../core/result.js';
import type { ItineraryId } from '../../domain/types/branded.js';
import type {
  TripDesignerSession,
  SessionId,
  SessionSummary,
  Message,
  TripProfile,
} from '../../domain/types/trip-designer.js';
import { generateSessionId } from '../../domain/types/trip-designer.js';

/**
 * Session storage interface
 */
export interface SessionStorage {
  /** Save a session to persistent storage */
  save(session: TripDesignerSession): Promise<Result<void, StorageError>>;

  /** Load a session from storage */
  load(sessionId: SessionId): Promise<Result<TripDesignerSession, StorageError>>;

  /** List all sessions for an itinerary */
  list(itineraryId?: ItineraryId): Promise<Result<SessionSummary[], StorageError>>;

  /** Delete a session */
  delete(sessionId: SessionId): Promise<Result<void, StorageError>>;
}

/**
 * In-memory session storage implementation
 */
export class InMemorySessionStorage implements SessionStorage {
  private sessions = new Map<SessionId, TripDesignerSession>();

  async save(session: TripDesignerSession): Promise<Result<void, StorageError>> {
    this.sessions.set(session.id, session);
    return ok(undefined);
  }

  async load(sessionId: SessionId): Promise<Result<TripDesignerSession, StorageError>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return err(
        createStorageError('NOT_FOUND', `Session ${sessionId} not found`, { sessionId })
      );
    }
    return ok(session);
  }

  async list(itineraryId?: ItineraryId): Promise<Result<SessionSummary[], StorageError>> {
    const summaries: SessionSummary[] = [];

    for (const session of this.sessions.values()) {
      if (!itineraryId || session.itineraryId === itineraryId) {
        const firstUserMessage = session.messages.find((m) => m.role === 'user');
        summaries.push({
          id: session.id,
          itineraryId: session.itineraryId,
          messageCount: session.messages.length,
          lastActiveAt: session.lastActiveAt,
          preview: firstUserMessage?.content.slice(0, 100) || 'New session',
        });
      }
    }

    // Sort by last active, most recent first
    summaries.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());

    return ok(summaries);
  }

  async delete(sessionId: SessionId): Promise<Result<void, StorageError>> {
    if (!this.sessions.has(sessionId)) {
      return err(
        createStorageError('NOT_FOUND', `Session ${sessionId} not found`, { sessionId })
      );
    }
    this.sessions.delete(sessionId);
    return ok(undefined);
  }

  /** Clear all sessions (for testing) */
  clear(): void {
    this.sessions.clear();
  }
}

/**
 * Session manager with lifecycle management
 */
export class SessionManager {
  /** Active sessions in memory */
  private activeSessions = new Map<SessionId, TripDesignerSession>();

  /** Idle timeout (30 minutes) */
  private static readonly IDLE_TIMEOUT_MS = 30 * 60 * 1000;

  /** Archive timeout (24 hours) */
  private static readonly ARCHIVE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly storage: SessionStorage) {}

  /**
   * Create a new session for an itinerary or help mode
   */
  async createSession(itineraryId?: ItineraryId, mode: 'trip-designer' | 'help' = 'trip-designer'): Promise<Result<TripDesignerSession, StorageError>> {
    const now = new Date();

    const session: TripDesignerSession = {
      id: generateSessionId(),
      itineraryId: itineraryId || ('' as ItineraryId), // Empty string for help mode
      messages: [],
      tripProfile: this.createEmptyProfile(now),
      createdAt: now,
      lastActiveAt: now,
      agentMode: mode,
      metadata: {
        messageCount: 0,
        totalTokens: 0,
      },
    };

    // Save to storage
    const saveResult = await this.storage.save(session);
    if (!saveResult.success) {
      return saveResult;
    }

    // Add to active sessions
    this.activeSessions.set(session.id, session);

    return ok(session);
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: SessionId): Promise<Result<TripDesignerSession, StorageError>> {
    // Check active sessions first
    const active = this.activeSessions.get(sessionId);
    if (active) {
      return ok(active);
    }

    // Load from storage
    const loadResult = await this.storage.load(sessionId);
    if (!loadResult.success) {
      return loadResult;
    }

    // Add to active sessions
    this.activeSessions.set(sessionId, loadResult.value);

    return ok(loadResult.value);
  }

  /**
   * Update a session and save
   */
  async updateSession(session: TripDesignerSession): Promise<Result<void, StorageError>> {
    // Update last active time
    session.lastActiveAt = new Date();

    // Update in-memory
    this.activeSessions.set(session.id, session);

    // Persist to storage
    return this.storage.save(session);
  }

  /**
   * Add a message to session
   */
  async addMessage(
    sessionId: SessionId,
    message: Omit<Message, 'timestamp'>
  ): Promise<Result<TripDesignerSession, StorageError>> {
    const sessionResult = await this.getSession(sessionId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    const session = sessionResult.value;

    // Add message with timestamp
    const fullMessage: Message = {
      ...message,
      timestamp: new Date(),
    };

    session.messages.push(fullMessage);

    // Update metadata
    session.metadata.messageCount = session.messages.length;
    if (fullMessage.tokens) {
      session.metadata.totalTokens += (fullMessage.tokens.input || 0) + (fullMessage.tokens.output || 0);
    }

    // Save updated session
    const saveResult = await this.updateSession(session);
    if (!saveResult.success) {
      return saveResult;
    }

    return ok(session);
  }

  /**
   * Update trip profile
   */
  async updateTripProfile(
    sessionId: SessionId,
    profile: Partial<TripProfile>
  ): Promise<Result<TripDesignerSession, StorageError>> {
    const sessionResult = await this.getSession(sessionId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    const session = sessionResult.value;

    // Merge profile updates
    session.tripProfile = {
      ...session.tripProfile,
      ...profile,
      extractedAt: new Date(),
    };

    // Save updated session
    const saveResult = await this.updateSession(session);
    if (!saveResult.success) {
      return saveResult;
    }

    return ok(session);
  }

  /**
   * List sessions for an itinerary
   */
  async listSessions(itineraryId?: ItineraryId): Promise<Result<SessionSummary[], StorageError>> {
    return this.storage.list(itineraryId);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: SessionId): Promise<Result<void, StorageError>> {
    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Delete from storage
    return this.storage.delete(sessionId);
  }

  /**
   * Clean up idle sessions
   * Moves sessions that haven't been active to storage and removes from memory
   */
  async cleanupIdleSessions(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const idleTime = now - session.lastActiveAt.getTime();

      if (idleTime > SessionManager.IDLE_TIMEOUT_MS) {
        // Save to storage before removing from memory
        await this.storage.save(session);
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Check if session should be compacted
   * Returns true if estimated context tokens exceed threshold
   *
   * IMPORTANT: This estimates the FULL context sent to the API, not just
   * the incremental tokens. The API receives:
   * - System prompt (~5-7k tokens with tool definitions)
   * - Itinerary context (~1-2k tokens)
   * - RAG context (0-2k tokens)
   * - ALL messages in session history (this grows unbounded!)
   * - Tool results (can be large even after summarization)
   *
   * So we must estimate the total context size, not just `metadata.totalTokens`.
   */
  shouldCompact(session: TripDesignerSession, threshold: number = 0.5): boolean {
    const maxTokens = 200000; // Claude 3.5 Sonnet context window
    const hardLimit = 180000; // Force compression at 180k tokens

    // Estimate full context size (characters / 4 is rough token estimate)
    const systemPromptTokens = 7000; // System prompt + tool definitions + itinerary context + RAG

    // Estimate all message tokens
    let messageTokens = 0;
    for (const msg of session.messages) {
      // Use tracked tokens if available, otherwise estimate from content
      if (msg.tokens) {
        messageTokens += (msg.tokens.input || 0) + (msg.tokens.output || 0);
      } else {
        // More accurate estimate: 1 token per 4 characters
        messageTokens += Math.ceil(msg.content.length / 4);
      }

      // Account for tool results which can be large even after truncation
      if (msg.toolResults && msg.toolResults.length > 0) {
        for (const toolResult of msg.toolResults) {
          const resultJson = JSON.stringify(toolResult.result || {});
          messageTokens += Math.ceil(resultJson.length / 4);
        }
      }
    }

    const estimatedTotal = systemPromptTokens + messageTokens;

    // Force compression if we're at hard limit
    if (estimatedTotal >= hardLimit) {
      return true;
    }

    // Otherwise use threshold
    return estimatedTotal > maxTokens * threshold;
  }

  /**
   * Create an empty trip profile
   */
  private createEmptyProfile(timestamp: Date): TripProfile {
    return {
      travelers: {
        count: 1,
      },
      extractedAt: timestamp,
      confidence: 0,
    };
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Clear all active sessions (for testing)
   */
  clearActiveSessions(): void {
    this.activeSessions.clear();
  }
}

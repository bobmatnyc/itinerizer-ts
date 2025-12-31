/**
 * Event Bus for decoupled store communication
 *
 * Stores emit events instead of importing each other directly.
 * This eliminates circular dependencies and improves testability.
 *
 * Usage:
 * - Emit: eventBus.emit({ type: 'auth:logout' })
 * - Listen: eventBus.on('auth:logout', () => { ... })
 */

// Event types
export type StoreEvent =
  | { type: 'auth:logout' }
  | { type: 'auth:login'; email: string }
  | { type: 'itinerary:updated'; id: string }
  | { type: 'itinerary:selected'; id: string }
  | { type: 'itinerary:created'; id: string };

type EventHandler<T extends StoreEvent> = (event: T) => void;

class EventBus {
  private listeners = new Map<string, Set<EventHandler<any>>>();

  /**
   * Emit an event to all registered listeners
   */
  emit<T extends StoreEvent>(event: T): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  /**
   * Register a listener for an event type
   * Returns an unsubscribe function
   */
  on<T extends StoreEvent['type']>(
    type: T,
    handler: EventHandler<Extract<StoreEvent, { type: T }>>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  /**
   * Remove all listeners (useful for testing)
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get listener count for a specific event type (useful for debugging)
   */
  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

export const eventBus = new EventBus();

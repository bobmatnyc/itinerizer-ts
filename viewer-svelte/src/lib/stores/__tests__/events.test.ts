/**
 * Event Bus Tests
 *
 * Verifies type-safe event emission and subscription
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus, type StoreEvent } from '../events';

describe('EventBus', () => {
  beforeEach(() => {
    // Clear all listeners before each test
    eventBus.clear();
  });

  it('should emit and receive events', () => {
    const received: StoreEvent[] = [];

    eventBus.on('auth:logout', (event) => {
      received.push(event);
    });

    eventBus.emit({ type: 'auth:logout' });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: 'auth:logout' });
  });

  it('should support multiple listeners for same event', () => {
    let count1 = 0;
    let count2 = 0;

    eventBus.on('auth:logout', () => count1++);
    eventBus.on('auth:logout', () => count2++);

    eventBus.emit({ type: 'auth:logout' });

    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });

  it('should support unsubscribe', () => {
    let count = 0;

    const unsubscribe = eventBus.on('auth:logout', () => count++);

    eventBus.emit({ type: 'auth:logout' });
    expect(count).toBe(1);

    unsubscribe();

    eventBus.emit({ type: 'auth:logout' });
    expect(count).toBe(1); // Should not increment
  });

  it('should pass event data to listeners', () => {
    let receivedEmail: string | undefined;

    eventBus.on('auth:login', (event) => {
      receivedEmail = event.email;
    });

    eventBus.emit({ type: 'auth:login', email: 'user@example.com' });

    expect(receivedEmail).toBe('user@example.com');
  });

  it('should track listener count', () => {
    expect(eventBus.listenerCount('auth:logout')).toBe(0);

    const unsubscribe1 = eventBus.on('auth:logout', () => {});
    expect(eventBus.listenerCount('auth:logout')).toBe(1);

    const unsubscribe2 = eventBus.on('auth:logout', () => {});
    expect(eventBus.listenerCount('auth:logout')).toBe(2);

    unsubscribe1();
    expect(eventBus.listenerCount('auth:logout')).toBe(1);

    unsubscribe2();
    expect(eventBus.listenerCount('auth:logout')).toBe(0);
  });

  it('should handle different event types independently', () => {
    const logoutEvents: StoreEvent[] = [];
    const loginEvents: StoreEvent[] = [];

    eventBus.on('auth:logout', (event) => logoutEvents.push(event));
    eventBus.on('auth:login', (event) => loginEvents.push(event));

    eventBus.emit({ type: 'auth:logout' });
    eventBus.emit({ type: 'auth:login', email: 'test@example.com' });

    expect(logoutEvents).toHaveLength(1);
    expect(loginEvents).toHaveLength(1);
    expect(loginEvents[0]).toHaveProperty('email', 'test@example.com');
  });

  it('should not fail when emitting event with no listeners', () => {
    expect(() => {
      eventBus.emit({ type: 'auth:logout' });
    }).not.toThrow();
  });

  it('should clear all listeners', () => {
    eventBus.on('auth:logout', () => {});
    eventBus.on('auth:login', () => {});

    expect(eventBus.listenerCount('auth:logout')).toBe(1);
    expect(eventBus.listenerCount('auth:login')).toBe(1);

    eventBus.clear();

    expect(eventBus.listenerCount('auth:logout')).toBe(0);
    expect(eventBus.listenerCount('auth:login')).toBe(0);
  });
});

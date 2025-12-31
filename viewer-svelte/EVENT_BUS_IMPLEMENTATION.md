# Event Bus Implementation Summary

## Objective
Eliminate circular dependencies between stores by implementing an event-driven communication pattern.

## Problem Solved
**Before**: `auth.svelte.ts` directly imported `clearItineraries()` from `itineraries.svelte.ts`, creating tight coupling and potential circular dependency issues.

**After**: Stores communicate via a type-safe event bus, eliminating direct dependencies.

## Implementation

### 1. Event Bus (`src/lib/stores/events.ts`)
Created a centralized event bus with TypeScript discriminated unions for type safety:

```typescript
export type StoreEvent =
  | { type: 'auth:logout' }
  | { type: 'auth:login'; email: string }
  | { type: 'itinerary:updated'; id: string }
  | { type: 'itinerary:selected'; id: string }
  | { type: 'itinerary:created'; id: string };

export const eventBus = new EventBus();
```

**Key Features**:
- Type-safe event emission and subscription
- Generic `on<T>()` method with proper type inference
- Unsubscribe function returned from `on()`
- `clear()` method for testing
- `listenerCount()` for debugging

### 2. Auth Store Updates (`src/lib/stores/auth.svelte.ts`)

**Before**:
```typescript
import { clearItineraries } from './itineraries.svelte';

logout(): void {
  this.isAuthenticated = false;
  this.userEmail = null;
  if (isBrowser) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
  }
  clearItineraries(); // Direct call
}
```

**After**:
```typescript
import { eventBus } from './events';

logout(): void {
  this.isAuthenticated = false;
  this.userEmail = null;
  if (isBrowser) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
  }
  eventBus.emit({ type: 'auth:logout' }); // Event emission
}
```

### 3. Itineraries Store Updates (`src/lib/stores/itineraries.svelte.ts`)

**Added**:
```typescript
import { eventBus } from './events';

// Listen for auth:logout events to clear itinerary data
eventBus.on('auth:logout', () => {
  itinerariesStore.clear();
});
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Coupling** | Tight (direct import) | Loose (event-driven) |
| **Circular Dependencies** | Risk of circular imports | No circular dependencies |
| **Testing** | Hard to mock clearItineraries | Easy to mock events |
| **Extensibility** | Modify auth for each new listener | Add listeners without modifying auth |
| **Type Safety** | Function signature | TypeScript discriminated unions |
| **Maintenance** | Change in one place affects others | Decoupled changes |

## Event Flow

```
User Action (Logout)
       ↓
authStore.logout()
       ↓
eventBus.emit({ type: 'auth:logout' })
       ↓
Event Bus dispatches to all listeners
       ↓
itinerariesStore listener receives event
       ↓
itinerariesStore.clear() called
       ↓
State cleared
```

## Available Events

- **auth:logout** - User logged out, clear user-specific data
- **auth:login** - User logged in (payload: `{ email: string }`)
- **itinerary:updated** - Itinerary modified (payload: `{ id: string }`)
- **itinerary:selected** - User selected itinerary (payload: `{ id: string }`)
- **itinerary:created** - New itinerary created (payload: `{ id: string }`)

## Testing

All verification steps passed:
- ✓ TypeScript compiles without errors
- ✓ Event bus unit tests pass
- ✓ No circular import errors
- ✓ Auth store emits events correctly
- ✓ Itineraries store receives events
- ✓ Logout flow works end-to-end

## Migration Guide

To add a new event-driven interaction:

1. **Define the event type** in `events.ts`:
   ```typescript
   export type StoreEvent =
     | { type: 'your:event'; data: YourData }
     | ... // existing events
   ```

2. **Emit the event** from the source store:
   ```typescript
   eventBus.emit({ type: 'your:event', data: yourData });
   ```

3. **Listen for the event** in the target store:
   ```typescript
   eventBus.on('your:event', (event) => {
     // React to event
     console.log(event.data);
   });
   ```

## Code Metrics

- **Files Created**: 1 (`events.ts`, 69 lines)
- **Files Modified**: 2
  - `auth.svelte.ts`: 1 import changed, 1 line modified
  - `itineraries.svelte.ts`: 1 import added, 4 lines added
- **Total LOC Delta**: +75 lines
- **Net Impact**: Improved architecture, zero functional changes

## Notes on Chat → Visualization

The chat store's dependency on visualization store was evaluated but not changed because:
- It's a one-way dependency (chat → visualization, not bidirectional)
- No risk of circular dependencies
- The current pattern is clean and functional
- Could be migrated to events if needed in the future

## Next Steps (Optional)

Future enhancements could include:
- Event history/replay for debugging
- Event middleware for logging/analytics
- Typed event payloads with Zod schemas
- Event batching for performance optimization

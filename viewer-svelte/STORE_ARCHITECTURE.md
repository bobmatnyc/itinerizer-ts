# Store Architecture - Before and After

## Before: Direct Dependencies (Tight Coupling)

```
┌─────────────────┐
│   auth.svelte   │
│                 │
│  logout() {     │
│    ...          │
│    clearIt...() │◄─── Direct import
│  }              │      from itineraries.svelte
└────────┬────────┘
         │
         │ import { clearItineraries }
         │
         ↓
┌─────────────────────────┐
│  itineraries.svelte     │
│                         │
│  clearItineraries() {   │
│    itineraries.set([])  │
│    ...                  │
│  }                      │
└─────────────────────────┘
```

**Problems**:
- Tight coupling between auth and itineraries
- Risk of circular dependencies
- Hard to test in isolation
- Changes in itineraries affect auth
- Not extensible (adding new listeners requires modifying auth)

## After: Event Bus (Loose Coupling)

```
┌─────────────────┐
│   auth.svelte   │
│                 │
│  logout() {     │
│    ...          │
│    emit(logout) │──┐
│  }              │  │
└─────────────────┘  │
                     │
                     ↓
            ┌────────────────┐
            │   Event Bus    │
            │                │
            │  emit(event)   │
            │  on(type, fn)  │
            └────────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ↓                       ↓
┌─────────────────────┐  ┌──────────────────┐
│ itineraries.svelte  │  │  Future Store    │
│                     │  │  (chat, etc.)    │
│ on('logout', () => {│  │                  │
│   clear()           │  │  on('logout'...) │
│ })                  │  │                  │
└─────────────────────┘  └──────────────────┘
```

**Benefits**:
- Loose coupling via events
- No circular dependencies
- Easy to test with mock events
- Changes isolated to each store
- Extensible (add listeners without modifying emitters)

## Event Flow Detail

```
User Interaction
      │
      ↓
┌──────────────────────────────────────┐
│ authStore.logout()                   │
│ ┌──────────────────────────────────┐ │
│ │ 1. Clear auth state              │ │
│ │ 2. Remove localStorage           │ │
│ │ 3. emit({ type: 'auth:logout' }) │ │
│ └──────────────────────────────────┘ │
└────────────────┬─────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────┐
│ EventBus.emit(event)                 │
│ ┌──────────────────────────────────┐ │
│ │ Get listeners for 'auth:logout'  │ │
│ │ Call each handler with event     │ │
│ └──────────────────────────────────┘ │
└────────────────┬─────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────┐
│ itinerariesStore listener            │
│ ┌──────────────────────────────────┐ │
│ │ Receive 'auth:logout' event      │ │
│ │ Call itinerariesStore.clear()    │ │
│ │ Reset all state to empty         │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
                 │
                 ↓
         Clean State ✓
```

## Type Safety

The event bus uses TypeScript discriminated unions for compile-time type safety:

```typescript
// Define all possible events
export type StoreEvent =
  | { type: 'auth:logout' }
  | { type: 'auth:login'; email: string }
  | { type: 'itinerary:updated'; id: string };

// Emitting - TypeScript ensures correct payload
eventBus.emit({ type: 'auth:logout' }); // ✓
eventBus.emit({ type: 'auth:login' }); // ✗ Error: missing 'email'
eventBus.emit({ type: 'auth:login', email: 'user@example.com' }); // ✓

// Listening - TypeScript infers correct event type
eventBus.on('auth:login', (event) => {
  console.log(event.email); // ✓ TypeScript knows 'email' exists
});
```

## Store Dependencies Visualization

### Before
```
auth ──────► itineraries
            (direct import)
```

### After
```
auth ──────► eventBus ◄────── itineraries
            (emit)           (listen)

             eventBus ◄────── chat
                             (listen)

             eventBus ◄────── future stores
                             (listen)
```

## Testing Benefits

### Before (Direct Import)
```typescript
// Hard to test in isolation
test('logout clears itineraries', () => {
  // Must import real itineraries store
  // Or mock the entire module
  authStore.logout();
  // How do we verify clearItineraries was called?
});
```

### After (Event Bus)
```typescript
// Easy to test with mock events
test('logout emits event', () => {
  const events: StoreEvent[] = [];
  eventBus.on('auth:logout', (event) => {
    events.push(event);
  });

  authStore.logout();

  expect(events).toEqual([{ type: 'auth:logout' }]);
});

test('itineraries clears on logout event', () => {
  // Populate itineraries
  itinerariesStore.add(mockItinerary);

  // Emit logout event
  eventBus.emit({ type: 'auth:logout' });

  // Verify state cleared
  expect(get(itineraries)).toEqual([]);
});
```

## Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Direct Imports | 1 (auth → itineraries) | 0 | ✓ No coupling |
| Circular Dependency Risk | High | None | ✓ Eliminated |
| Test Isolation | Poor | Excellent | ✓ Easy mocking |
| Extensibility | Low | High | ✓ Add listeners easily |
| Type Safety | Medium | High | ✓ Discriminated unions |
| Lines of Code | - | +75 | Small cost for big gain |

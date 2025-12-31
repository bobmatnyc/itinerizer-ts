# New Trip Creation Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOME VIEW                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Welcome back!                                            │  │
│  │  Ready to plan your next adventure?                      │  │
│  │                                                           │  │
│  │  Quick Prompts:                                          │  │
│  │  [Plan a weekend getaway]  [Help with upcoming trip]    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ User clicks "Create New"
                            │ or Quick Prompt
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               NEW TRIP HELPER VIEW (EMPTY)                       │
│  ┌──────────────────┐  ┌─────────────────────────────────────┐  │
│  │ 💬 CHAT PANEL   │  │  ✈️ Let's Plan Your Trip!         │  │
│  │                 │  │                                     │  │
│  │ AI: Who's       │  │  What We'll Cover:                 │  │
│  │ traveling?      │  │  ┌─────────────────────────────┐   │  │
│  │                 │  │  │ 📍 Destination               │   │  │
│  │ [Solo]          │  │  │ 📅 Dates                     │   │  │
│  │ [Couple]        │  │  │ 👥 Who's traveling           │   │  │
│  │ [Family]        │  │  │ 💰 Budget & style            │   │  │
│  │ [Friends]       │  │  │ ⭐ Interests & activities    │   │  │
│  │ [Business] 💼   │  │  └─────────────────────────────┘   │  │
│  │ [Other]         │  │                                     │  │
│  │                 │  │  💡 Tip: Answer in chat or use      │  │
│  │                 │  │     quick-select options           │  │
│  │                 │  │                                     │  │
│  │                 │  │  👈 Ready? Check the chat panel!   │  │
│  └──────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ User answers questions
                            │ AI asks follow-up questions
                            │ Helper view stays visible
                            ▼
                    (Questions continue...)
                            │
                            │ AI adds first segment
                            │ (Flight/Hotel/Activity)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            ITINERARY DETAIL VIEW (AUTO-SWITCH)                   │
│  ┌──────────────────┐  ┌─────────────────────────────────────┐  │
│  │ 💬 CHAT PANEL   │  │  📋 Portugal Trip - Jan 5-19        │  │
│  │                 │  │                                     │  │
│  │ AI: I've added  │  │  📅 Day 1 - January 5              │  │
│  │ your flight!    │  │  ┌─────────────────────────────┐   │  │
│  │                 │  │  │ ✈️ Flight SFO → LIS         │   │  │
│  │ User: Great!    │  │  │    9:45 AM - 5:30 PM        │   │  │
│  │ What hotels do  │  │  │    United Airlines          │   │  │
│  │ you recommend?  │  │  │    $650                     │   │  │
│  │                 │  │  └─────────────────────────────┘   │  │
│  │ AI: I found 3   │  │                                     │  │
│  │ great options.. │  │  📅 Day 2 - January 6              │  │
│  │                 │  │  ┌─────────────────────────────┐   │  │
│  │                 │  │  │ 🏨 Hotel Lisbon Heritage    │   │  │
│  │                 │  │  │    Check-in 3:00 PM         │   │  │
│  │                 │  │  └─────────────────────────────┘   │  │
│  └──────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## State Transitions

### Trigger Points

1. **Create New Itinerary**
   ```
   Home → New Trip Helper
   ```

2. **Quick Prompt Clicked**
   ```
   Home → New Trip Helper (if no itinerary)
   Home → Detail View (if itinerary has segments)
   ```

3. **First Segment Added**
   ```
   New Trip Helper → Itinerary Detail (automatic)
   ```

4. **All Segments Deleted**
   ```
   Itinerary Detail → New Trip Helper (automatic)
   ```

## Component Responsibilities

### NewTripHelperView.svelte
- **Purpose**: Guide users through trip creation process
- **Displayed**: When itinerary is selected but has 0 segments
- **Content**:
  - Welcoming header with animated plane icon ✈️
  - Visual checklist of information to collect
  - Helpful tips about using chat
  - Animated pointer directing to chat panel
- **Transitions**: Friendly animations (float, pulse, point)

### +page.svelte (Main Container)
- **Purpose**: Orchestrate view switching
- **Reactive Logic**:
  ```typescript
  // Effect 1: Home → Helper/Detail based on segments
  if (onHomeView && hasItinerary && hasActivity) {
    view = hasSegments ? 'detail' : 'helper';
  }

  // Effect 2: Helper → Detail when segments added
  if (onHelperView && hasSegments) {
    view = 'detail';
  }
  ```
- **Triggers**:
  - `$selectedItinerary` changes (store update)
  - `$chatMessages` changes (user interaction)
  - `$isStreaming` changes (AI responding)

## Traveler Options (NEW)

When AI asks "Who's traveling?", options now include:

```
Solo      → Just me
Couple    → Traveling with partner
Family    → With kids
Friends   → Group of adults
Business  → Work travel 💼 (NEW!)
Other     → I'll describe my group
```

The Business option enables AI to:
- Suggest hotels near business districts
- Recommend co-working spaces
- Find quick dining options
- Account for work schedules
- Suggest networking venues

## Key Benefits

✅ **Contextual Guidance**: Users always see relevant content
✅ **Seamless Transitions**: Automatic view switching feels natural
✅ **Visual Feedback**: Animations keep interface engaging
✅ **Clear Expectations**: Helper view explains what's coming
✅ **Progressive Disclosure**: Information revealed as needed
✅ **Business Travel Support**: New option for work trips

## Technical Implementation

### Reactive Dependencies
```typescript
// Stores that trigger view updates
$selectedItinerary        // From itineraries.ts
$selectedItinerary.segments  // Reactive array
$chatMessages             // From chat.ts
$isStreaming             // From chat.ts
```

### View Selection Logic
```typescript
type MainView =
  | 'home'              // Initial landing
  | 'new-trip-helper'   // Empty itinerary guidance
  | 'itinerary-detail'  // Itinerary with segments
  | 'import'            // Import flow
  | 'help'              // Documentation
```

### Automatic Updates
When `addSegment()` is called (by AI or user):
1. API call updates backend
2. `selectedItinerary` store updates
3. Reactive `$effect` detects change
4. View switches to `itinerary-detail`
5. User sees new segment immediately

No manual intervention needed - it just works! ✨

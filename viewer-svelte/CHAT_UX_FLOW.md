# Chat Panel UX Flow

## Visual Layout

### Before (Old Layout)
```
┌────────────────────────────────────┐
│  Header                            │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐ │
│  │ User: Hello                  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Assistant: How can I help?   │ │
│  └──────────────────────────────┘ │
│                                    │
│  Question: Where to go?            │
│  [Paris] [London] [Rome]           │ ← Mixed in messages
│                                    │
│  ┌──────────────────────────────┐ │
│  │ More messages...             │ │
│  └──────────────────────────────┘ │
├────────────────────────────────────┤
│  [_____________] [Send]            │
└────────────────────────────────────┘
```

### After (New Layout)
```
┌────────────────────────────────────┐
│  Header                            │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐ │
│  │ User: Hello                  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Assistant: How can I help?   │ │
│  └──────────────────────────────┘ │
│                 ⬆                  │
│         Messages scroll here       │
├────────────────────────────────────┤
│  Question: Where to go?            │ ← Fixed area
│  [Paris] [London] [Rome]           │
│                                    │
│  Or type your own response below   │
├────────────────────────────────────┤
│  [_____________] [Send]            │
└────────────────────────────────────┘
```

## Animation Sequence

### When User Clicks "Paris" Button

**Step 1: Click (0ms)**
```
├────────────────────────────────────┤
│  Question: Where to go?            │
│  [Paris*] [London] [Rome]          │ ← Clicked
├────────────────────────────────────┤
│  [_____________] [Send]            │
└────────────────────────────────────┘
```

**Step 2: Animation Starts (0-200ms)**
```
├────────────────────────────────────┤
│  Question: Where to go?            │
│  [Paris*] [London] [Rome]          │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐ │ ← Slides down
│  │ ✓ Paris                      │ │ ← Blue gradient
│  └──────────────────────────────┘ │
│  [_____________] [Send]            │
└────────────────────────────────────┘
```

**Step 3: Full Visibility (200-400ms)**
```
├────────────────────────────────────┤
│  Question: Where to go?            │
│  [Paris*] [London] [Rome]          │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐ │
│  │ ✓ Paris                      │ │ ← Fully visible
│  │   City of Light              │ │ ← Shows description
│  └──────────────────────────────┘ │
│  [_____________] [Send]            │
└────────────────────────────────────┘
```

**Step 4: Message Sent (400ms+)**
```
├────────────────────────────────────┤
│  ┌──────────────────────────────┐ │
│  │ User: Paris                  │ │ ← Appears in chat
│  └──────────────────────────────┘ │
│                                    │
│  Questions disappear (answered)    │
├────────────────────────────────────┤
│  [_____________] [Send]            │
└────────────────────────────────────┘
```

## CSS Animation Details

### slideDownFade Animation
```css
@keyframes slideDownFade {
  0% {
    opacity: 0;
    transform: translateY(-20px);  /* Starts above */
  }
  50% {
    opacity: 1;
    transform: translateY(0);      /* Slides to position */
  }
  100% {
    opacity: 1;
    transform: translateY(0);      /* Holds position */
  }
}
```

**Duration**: 400ms
**Easing**: ease-out (feels natural and responsive)
**Effect**: Slides from above and fades in

## Component Structure

```svelte
<div class="chatpanel">
  <!-- Messages area (order: 1) -->
  <div class="chatpanel-messages">
    {#each messages as msg}
      <div class="message">{msg.content}</div>
    {/each}
  </div>

  <!-- Structured questions area (order: 2) -->
  {#if $structuredQuestions.length > 0}
    <div class="chatpanel-structured-questions">
      {#each questions as q}
        <button onclick={() => handleStructuredAnswer(q, opt.id)}>
          {opt.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Input container (order: 3) -->
  <div class="chatpanel-input-container">
    <!-- Animating option (appears on click) -->
    {#if animatingOption}
      <div class="chatpanel-animating-option">
        <div class="chatpanel-animating-content">
          {animatingOption.label}
        </div>
      </div>
    {/if}

    <textarea bind:value={message} />
    <button>Send</button>
  </div>
</div>
```

## State Flow

```
User clicks button
      ↓
animatingOption = { label, description }
      ↓
Wait 400ms (animation plays)
      ↓
message = option.label
animatingOption = null
      ↓
handleSend() called
      ↓
Questions cleared
Message sent to AI
```

## Responsive Behavior

### Desktop
- Structured questions: Max height 40% of viewport
- Scrollable if many options
- Input always visible at bottom

### Mobile
- Same layout but optimized for touch
- Larger touch targets for buttons
- Questions scroll horizontally if needed

## Accessibility

- **Keyboard Navigation**: Tab through options, Enter to select
- **Screen Readers**: Announce when option is selected
- **Focus Management**: Maintains focus on input after selection
- **ARIA Labels**: Proper button labels and roles

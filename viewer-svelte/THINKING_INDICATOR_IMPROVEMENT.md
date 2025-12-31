# Thinking Indicator Improvement

## Summary
Replaced the "Thinking..." dots animation with a thin animated progress bar line above the chat input.

## Changes Made

### 1. Removed Old Thinking Indicator
- **Removed HTML** (lines 679-690): Deleted the entire thinking indicator message bubble with dots
- **Removed CSS** (lines 1914-1967): Removed all `.chatpanel-thinking*` classes and `@keyframes thinkingPulse`

### 2. Added Network Progress Bar

#### HTML Addition
Added above the input container (line 934-938):
```svelte
{#if $isThinking || $isStreaming}
  <div class="network-progress-bar">
    <div class="progress-bar-inner"></div>
  </div>
{/if}
```

#### CSS Addition
Added new progress bar styles (lines 1490-1521):
```css
.network-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #e5e7eb;
  overflow: hidden;
  z-index: 10;
}

.progress-bar-inner {
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
  background-size: 200% 100%;
  animation: progress-slide 1.5s ease-in-out infinite;
  border-radius: 2px;
}

@keyframes progress-slide {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(250%);
  }
  100% {
    transform: translateX(-100%);
  }
}
```

## Visual Behavior

### Before
- "Thinking..." message bubble with three animated dots appeared in the chat messages area
- Dots pulsed/scaled with different delays
- Took up vertical space in the message list

### After
- Thin 3px progress bar appears at the **top** of the input container
- Blue-to-purple gradient slides left-to-right continuously
- No vertical space consumed in the message area
- More subtle and modern visual indicator
- Shows during both `$isThinking` and `$isStreaming` states

## Benefits

1. **Less Intrusive**: Doesn't add to message clutter
2. **More Space Efficient**: Takes minimal vertical space
3. **Modern Design**: Clean progress bar matches contemporary UX patterns
4. **Dual Purpose**: Works for both thinking and streaming states
5. **Better Positioning**: Fixed at input area, always visible

## File Modified
- `/viewer-svelte/src/lib/components/ChatPanel.svelte`

## Testing
The dev server can be started with:
```bash
cd viewer-svelte && npm run dev
```

Then trigger the AI thinking state by sending a message to see the progress bar in action.

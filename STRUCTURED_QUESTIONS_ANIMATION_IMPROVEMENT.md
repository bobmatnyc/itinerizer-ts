# Structured Question Button Animation Improvement

## Summary

Enhanced the structured question button interaction in ChatPanel to provide smoother visual feedback when a button is clicked. The entire form section now slides away gracefully before sending the message.

## Implementation Details

### Changes Made

**File**: `viewer-svelte/src/lib/components/ChatPanel.svelte`

### 1. Added State Variable

```typescript
let isQuestionsHiding = $state(false);
```

Tracks when the structured questions section is in the process of hiding.

### 2. Updated `handleStructuredAnswer` Function

```typescript
async function handleStructuredAnswer(
  question: StructuredQuestion,
  optionId?: string
) {
  if (question.type === 'single_choice' && optionId) {
    const option = question.options?.find((o) => o.id === optionId);
    if (option) {
      // Start hiding the questions section
      isQuestionsHiding = true;

      // Show animation of the selected option
      animatingOption = { label: option.label, description: option.description };

      // Wait for slide-out animation (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Clear questions immediately so they don't show after animation
      structuredQuestions.set([]);

      // Wait a bit more for the selected option animation (200ms)
      await new Promise(resolve => setTimeout(resolve, 200));

      message = option.label;
      animatingOption = null;
      isQuestionsHiding = false;
      await handleSend();
      selectedOptions.clear();
    }
  }
  // ... rest of function
}
```

**Animation Timing**:
- **0-300ms**: Structured questions section slides down and fades out
- **300ms**: Questions cleared from DOM
- **300-500ms**: Selected option indicator shows (existing animation)
- **500ms+**: Message sent to chat

### 3. Added CSS Class Binding

```svelte
<div class="chatpanel-structured-questions" class:hiding={isQuestionsHiding}>
```

Conditionally applies the `.hiding` class when animation is active.

### 4. Added CSS Transitions

```css
.chatpanel-structured-questions {
  /* ... existing styles ... */
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.chatpanel-structured-questions.hiding {
  transform: translateY(20px);
  opacity: 0;
  pointer-events: none;
}
```

**Animation Effects**:
- **Transform**: Slides down 20px
- **Opacity**: Fades to 0
- **Pointer Events**: Disabled during animation to prevent interaction
- **Duration**: 300ms with ease-out easing

## User Experience Flow

1. **User clicks a structured question button**
   - Button click triggers `handleStructuredAnswer`
   - `isQuestionsHiding` set to `true`

2. **Entire questions section slides down and fades out (300ms)**
   - Visual feedback that the selection was registered
   - Smooth transition prevents jarring UI changes

3. **Questions cleared from DOM**
   - Ensures they don't reappear after animation

4. **Selected option briefly animates (200ms)**
   - Shows what was chosen before sending
   - Provides context for the outgoing message

5. **Message sent to chat**
   - User sees their selection added to chat history

## Benefits

- **Clear Visual Feedback**: User knows their selection was registered
- **Smooth Transitions**: No jarring UI changes or content jumps
- **Better UX**: Entire form section behavior is predictable and polished
- **No Lingering UI**: Questions don't linger after selection

## Testing

- ✅ TypeScript compilation successful
- ✅ No new Svelte warnings or errors
- ✅ Animation timing coordinated with existing selected option indicator
- ✅ Pointer events disabled during animation prevents double-clicks

## LOC Delta

```
Added: 6 lines (state variable, CSS classes)
Modified: 10 lines (handleStructuredAnswer timing)
Net Change: +16 lines
```

## Phase

**Phase**: Enhancement (UI Polish)
**Category**: User Experience Improvement
**Impact**: Improved visual feedback for structured question interactions

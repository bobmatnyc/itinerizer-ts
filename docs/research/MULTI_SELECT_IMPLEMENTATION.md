# Multi-Select Implementation for Trip Designer

## Summary
Updated the Trip Designer to use `multiple_choice` type for questions where users might want to select multiple options, eliminating poor UX patterns like "Multiple Cities" meta-options.

## Changes Made

### 1. Updated Trip Designer System Prompt (`src/prompts/trip-designer/system.md`)

#### Added RULE 7: USE MULTI-SELECT APPROPRIATELY
- Clear guidance on when to use `multiple_choice` vs `single_choice`
- Explicit prohibition of meta-options like "Multiple Cities" or "Multiple Activities"
- Examples of correct and incorrect usage

#### Updated Discovery Phase Guidelines
- Added detailed rules for when to use each question type
- Emphasized that `multiple_choice` should be used for:
  - Cities/destinations to visit
  - Activities and interests
  - Dietary preferences
  - Event types
- Clarified that `single_choice` is for mutually exclusive options:
  - Travel style (luxury/moderate/budget/backpacker)
  - Traveler type (solo/couple/family/group)
  - Pace (packed/balanced/leisurely)

#### Added Examples Section
- ✅ GOOD: Multiple choice for cities (correct approach)
- ✅ GOOD: Multiple choice for interests (with "Other" option)
- ❌ BAD: Using "Multiple Cities" meta-option (what NOT to do)

## UI Support (Already Implemented)

The UI in `viewer-svelte/src/lib/components/ChatPanel.svelte` already fully supports `multiple_choice`:

1. **Lines 711-743**: Renders multiple_choice questions with:
   - Checkboxes for each option (toggleable selection)
   - Visual indication of selected options (blue background)
   - "Confirm" button showing count of selected items
   - Hint text: "Or type your own response below"

2. **Lines 392-415**: Handler functions:
   - `handleStructuredAnswer()`: Toggles option selection for multiple_choice
   - `confirmMultipleChoice()`: Sends selected options as comma-separated string

3. **Type Definition** (`viewer-svelte/src/lib/types.ts` line 169):
   ```typescript
   type: 'single_choice' | 'multiple_choice' | 'scale' | 'date_range' | 'text';
   ```

## How It Works

### Before (Poor UX)
```json
{
  "type": "single_choice",
  "question": "Which Croatian city will you visit?",
  "options": [
    {"id": "zagreb", "label": "Zagreb"},
    {"id": "split", "label": "Split"},
    {"id": "multiple", "label": "Multiple Cities", "description": "..."},
    {"id": "other", "label": "Let me specify"}
  ]
}
```
**Problem**: User has to click "Multiple Cities" then type them out manually - wasteful interaction!

### After (Good UX)
```json
{
  "type": "multiple_choice",
  "question": "Which Croatian cities interest you?",
  "options": [
    {"id": "zagreb", "label": "Zagreb", "description": "Capital with historic charm"},
    {"id": "split", "label": "Split", "description": "Coastal city with Roman palace"},
    {"id": "dubrovnik", "label": "Dubrovnik", "description": "Walled city on the Adriatic"},
    {"id": "plitvice", "label": "Plitvice Lakes", "description": "National park"},
    {"id": "other", "label": "Let me specify", "description": "Other places"}
  ]
}
```
**Benefit**: User can select multiple cities directly with checkboxes, then click "Confirm (3 selected)"

## User Experience Improvements

1. **Fewer Clicks**: Select multiple options directly instead of through meta-option
2. **Visual Feedback**: Selected options show blue background
3. **Clear Intent**: Message says "Select all that apply" for multiple_choice
4. **Flexibility**: Can still type custom response or select "Other" option
5. **Efficiency**: One confirmation button sends all selections at once

## Testing

To test the implementation:
1. Start a new itinerary in the Trip Designer
2. When asked about destinations, cities, or interests, verify:
   - Question type is `multiple_choice` (not `single_choice`)
   - Can select multiple options by clicking
   - Selected options show blue background
   - "Confirm (X selected)" button appears
   - Can also type custom response in text field below

## Migration Notes

The Trip Designer LLM will now:
- Use `multiple_choice` for any question where multiple selections make sense
- Never generate "Multiple X" meta-options
- Always include "Let me specify" / "Other" as the last option
- Make message text clear with phrases like "Select all that apply"

No code changes needed - the UI already supports this pattern fully!

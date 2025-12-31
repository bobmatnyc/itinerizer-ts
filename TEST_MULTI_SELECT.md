# Multi-Select Feature Testing Guide

## What Changed
Trip Designer now uses `multiple_choice` for questions where users might want multiple selections (cities, activities, interests) instead of using poor UX patterns like "Multiple Cities" meta-options.

## How to Test

### Test 1: City Selection
1. Start a new itinerary
2. When asked about destinations, look for:
   - Question type should be `multiple_choice` for multi-city trips
   - Options should list actual cities (Zagreb, Split, Dubrovnik, etc.)
   - Should NOT show "Multiple Cities" as an option
   - Should show "Let me specify" or "Other" as last option

**Example Expected Response:**
```json
{
  "message": "Which Croatian cities would you like to visit? Select all that interest you.",
  "structuredQuestions": [{
    "type": "multiple_choice",
    "question": "Which Croatian destinations interest you?",
    "options": [
      {"id": "zagreb", "label": "Zagreb", "description": "..."},
      {"id": "split", "label": "Split", "description": "..."},
      {"id": "dubrovnik", "label": "Dubrovnik", "description": "..."},
      {"id": "other", "label": "Let me specify", "description": "..."}
    ]
  }]
}
```

### Test 2: Activities/Interests
1. During discovery phase, when asked about interests
2. Verify:
   - Question type is `multiple_choice`
   - Can select multiple activities
   - "Confirm (X selected)" button appears
   - Selected options show blue background

### Test 3: User Experience
1. Select 2-3 cities/activities by clicking
2. Verify visual feedback (blue background on selected)
3. Click "Confirm (3 selected)" button
4. Verify all selections are sent as user message

## Expected Behavior

### Single Choice (Mutually Exclusive)
- Travel style: luxury OR moderate OR budget (can only be one)
- Traveler type: solo OR couple OR family (can only be one)
- Pace: packed OR balanced OR leisurely (can only be one)
- UI: Radio buttons (click one, previous deselects)

### Multiple Choice (Can Select Many)
- Cities: Zagreb AND Split AND Dubrovnik (can be multiple)
- Activities: Food & Wine AND History AND Nature (can be multiple)
- Dietary: Vegetarian AND Gluten-free (can be multiple)
- UI: Checkboxes (click multiple, all stay selected)

## Anti-Patterns to Watch For

❌ **NEVER show these:**
- "Multiple Cities" option
- "Multiple Activities" option  
- "Visit several places" meta-option
- Any option that's just a placeholder for "I want to select multiple"

✅ **ALWAYS show these:**
- Actual city/activity options that can be selected directly
- "Let me specify" / "Other" as last option
- Clear instructions: "Select all that apply" for multiple_choice

## Files Modified

1. `src/prompts/trip-designer/system.md`
   - Added RULE 7: USE MULTI-SELECT APPROPRIATELY
   - Updated Discovery Phase guidelines
   - Added correct/incorrect examples
   - Emphasized prohibition of meta-options

2. UI (Already Working)
   - `viewer-svelte/src/lib/components/ChatPanel.svelte` (lines 711-743)
   - `viewer-svelte/src/lib/types.ts` (line 169)
   - No changes needed - already supports multiple_choice!

## Verification Checklist

- [ ] Start new Croatia trip
- [ ] Asked about cities using `multiple_choice` type (not "Multiple Cities" option)
- [ ] Can select multiple cities with checkboxes
- [ ] "Confirm (X selected)" button appears
- [ ] All selections sent as comma-separated string
- [ ] Trip Designer acknowledges all selected cities
- [ ] Same pattern works for activities/interests

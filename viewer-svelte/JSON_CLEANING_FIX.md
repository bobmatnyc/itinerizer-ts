# JSON Cleaning Fix - Chat Messages

## Problem
Users were seeing raw JSON blocks in chat messages instead of clean, readable text:

```json
{
  "message": "I found some great options for you!",
  "structuredQuestions": [...]
}
```

Or fenced code blocks:

````markdown
```json
{
  "message": "Your itinerary has been updated!"
}
```
````

## Root Cause
The `cleanMessageContent()` function in `src/lib/stores/chat.ts` had:
1. **Weak regex patterns** - Only matched specific JSON structures
2. **No handling for partial JSON** - Didn't handle incomplete JSON during streaming
3. **Missing edge cases** - Didn't handle multiple JSON blocks or escaped strings

## Solution

### Enhanced `cleanMessageContent()` Function

**File**: `viewer-svelte/src/lib/stores/chat.ts`

The improved function now:

1. **Removes all fenced JSON blocks** - ````json ... ```
2. **Extracts message field** - Parses `{"message": "..."}` and extracts just the message
3. **Handles escaped strings** - Properly unescapes `\"` and `\n` in messages
4. **Removes leftover JSON** - Cleans up any remaining JSON structures
5. **Truncates partial JSON** - Cuts off incomplete JSON during streaming
6. **Preserves valid text** - Keeps all non-JSON content intact

### Key Improvements

#### Before:
```typescript
// Only removed JSON if it had BOTH message AND structuredQuestions
const nakedJsonMatch = content.match(/\{[\s\S]*"message"\s*:\s*"[\s\S]*?"[\s\S]*"structuredQuestions"\s*:\s*\[[\s\S]*?\]\s*\}/);
```

#### After:
```typescript
// Removes ANY JSON object with a "message" field
const jsonObjectMatch = cleaned.match(/\{\s*"message"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,[\s\S]*)?\}/);
// Extracts and properly unescapes the message value
```

### Application Points

The cleaning is applied at:

1. **During streaming** (lines 214, 350) - Users never see JSON while message is typing
2. **Final message** (lines 247, 387) - Ensures complete message is clean
3. **Non-streaming responses** (line 165) - Cleans traditional API responses

## Testing

### Basic Tests (`test-json-cleaning.mjs`)

8 core functionality tests - all passing ✅:
- Fenced JSON blocks
- Naked JSON objects
- Plain text preservation
- Partial JSON truncation
- Multiple JSON blocks
- Escaped quotes handling
- Empty blocks

### Edge Case Tests (`test-edge-cases.mjs`)

8 real-world scenario tests - all passing ✅:
- Trip Designer response format
- Streaming with partial JSON
- Newlines in messages
- JSON in middle of text
- Empty message fields
- Nested JSON structures
- Unicode and emoji characters
- Special characters (colons, etc.)

Run tests:
```bash
node test-json-cleaning.mjs
node test-edge-cases.mjs
```

## Impact

**User Experience**:
- ✅ Clean, readable messages
- ✅ No JSON noise in chat
- ✅ Proper handling of special characters
- ✅ Smooth streaming without artifacts

**Technical**:
- ✅ No breaking changes
- ✅ Build succeeds without errors
- ✅ Backward compatible with existing messages
- ✅ Handles edge cases gracefully

## Files Changed

1. `viewer-svelte/src/lib/stores/chat.ts` - Enhanced `cleanMessageContent()` function
2. `viewer-svelte/test-json-cleaning.mjs` - New test file (can be removed after verification)

## Verification

Build the app and test chat functionality:

```bash
cd viewer-svelte
npm run build
npm run dev
```

Try sending messages and verify:
- No JSON blocks appear in chat
- Structured questions still work correctly
- Streaming messages are clean
- Special characters display properly

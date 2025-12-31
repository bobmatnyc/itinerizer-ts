# Tool Call Streaming Fix

## Problem Summary

The Trip Designer chat was failing when the LLM sent tool calls because the streaming implementation didn't properly accumulate tool call arguments across multiple chunks.

### Error Symptoms
```
[chatStream] Tool "get_itinerary" failed: Unexpected end of JSON input
[chatStream] Tool arguments:
[chatStream] Second stream ended, received 40 chunks, finalContent length: 0
```

### Root Cause

**Issue 1: Incomplete Tool Call Accumulation**
- Location: `trip-designer.service.ts` lines 582-681
- The streaming code used a single `currentToolCall` variable to track tool calls
- When multiple tool call chunks arrived, arguments were being lost or not properly concatenated
- The completion detection logic (checking `finish_reason === 'tool_calls'`) was incorrect

**Issue 2: Missing Validation in Tool Executor**
- Location: `tool-executor.ts` line 76
- `JSON.parse(argsJson)` was called directly without checking if arguments were complete/valid
- Empty or malformed arguments caused "Unexpected end of JSON input" error

## The Fix

### 1. Proper Tool Call Accumulation (`trip-designer.service.ts`)

**Before:**
```typescript
let currentToolCall: Partial<ToolCall> | null = null;

// Fragile logic that lost chunks
if (!currentToolCall || toolCallDelta.id) {
  currentToolCall = { ... };
}
```

**After:**
```typescript
let toolCallsInProgress: Map<number, Partial<ToolCall>> = new Map();

// Track multiple tool calls by index
for (const toolCallDelta of delta.tool_calls) {
  const index = toolCallDelta.index;
  let toolCall = toolCallsInProgress.get(index);

  if (!toolCall) {
    // Start new tool call
    toolCall = { id: '', type: 'function', function: { ... } };
    toolCallsInProgress.set(index, toolCall);
  } else {
    // Append to existing tool call
    toolCall.function.arguments += toolCallDelta.function.arguments;
  }
}

// Finalize when stream completes
if (finishReason === 'tool_calls') {
  for (const [index, toolCall] of toolCallsInProgress.entries()) {
    toolCalls.push(toolCall as ToolCall);
  }
}
```

**Key improvements:**
- Uses `Map<number, ToolCall>` to track multiple concurrent tool calls by their stream index
- Properly concatenates arguments across all chunks
- Only finalizes tool calls when `finish_reason === 'tool_calls'` is received
- Added comprehensive logging to debug argument accumulation

### 2. Defensive Validation (`tool-executor.ts`)

**Before:**
```typescript
const args = JSON.parse(argsJson);
```

**After:**
```typescript
// Validate arguments exist
if (!argsJson || argsJson.trim().length === 0) {
  return {
    toolCallId: toolCall.id,
    success: false,
    error: `Tool "${name}" called with empty arguments`,
  };
}

// Parse with error handling
try {
  args = JSON.parse(argsJson);
} catch (parseError) {
  return {
    toolCallId: toolCall.id,
    success: false,
    error: `Failed to parse tool arguments: ${parseError.message}`,
  };
}
```

**Key improvements:**
- Checks for empty/null arguments before parsing
- Wraps JSON.parse in try-catch with detailed error messages
- Returns structured error response instead of throwing

## How Streaming Works (OpenAI Format)

When the LLM decides to call a tool, streaming chunks arrive like this:

```typescript
// Chunk 1: Tool call starts
{
  choices: [{
    delta: {
      tool_calls: [{
        index: 0,
        id: "call_abc123",
        function: { name: "get_itinerary", arguments: "" }
      }]
    },
    finish_reason: null
  }]
}

// Chunk 2: Arguments start streaming
{
  choices: [{
    delta: {
      tool_calls: [{
        index: 0,
        function: { arguments: "{\"itinerary" }
      }]
    },
    finish_reason: null
  }]
}

// Chunk 3: Arguments continue
{
  choices: [{
    delta: {
      tool_calls: [{
        index: 0,
        function: { arguments: "_id\": \"abc123\"}" }
      }]
    },
    finish_reason: null
  }]
}

// Final chunk: Stream completes
{
  choices: [{
    delta: {},
    finish_reason: "tool_calls"
  }]
}
```

**Critical insights:**
1. `index` identifies which tool call the chunk belongs to (for parallel tool calls)
2. `arguments` arrive in fragments across multiple chunks
3. `finish_reason === "tool_calls"` signals all tool calls are complete
4. Must concatenate all argument fragments before calling `JSON.parse()`

## Testing

To verify the fix:

1. Start the server: `npm run server`
2. Open the Trip Designer chat
3. Send a message that triggers `get_itinerary` tool call
4. Check server logs for:
   - `[chatStream] Started tool call at index 0: get_itinerary`
   - `[chatStream] Appended X chars to tool call 0, total: Y`
   - `[chatStream] Stream finished with tool_calls, finalizing 1 tool calls`
   - `[chatStream] Finalized tool call: get_itinerary, args length: 27`
   - Tool execution success (no "Unexpected end of JSON input")

## Files Modified

1. **src/services/trip-designer/trip-designer.service.ts**
   - Lines 582-704: Rewrote tool call accumulation logic
   - Changed from single `currentToolCall` to `Map<number, ToolCall>`
   - Added proper finalization on `finish_reason === 'tool_calls'`
   - Enhanced logging for debugging

2. **src/services/trip-designer/tool-executor.ts**
   - Lines 75-99: Added argument validation before JSON.parse
   - Added empty/null check
   - Added try-catch with detailed error messages

## LOC Delta

```
Added: ~60 lines (enhanced logging + Map-based tracking)
Removed: ~30 lines (old single-variable logic)
Net Change: +30 lines
```

## Related Issues

This fix resolves:
- Tool calls failing with "Unexpected end of JSON input"
- Second stream returning no content
- Empty arguments being passed to tool executor
- Lost tool call chunks during streaming

## Prevention

To prevent similar issues in the future:

1. **Always accumulate streaming data by index** - Don't assume single values
2. **Only finalize on explicit completion signals** - Wait for `finish_reason`
3. **Validate before parsing** - Check for empty/malformed input
4. **Add comprehensive logging** - Track each step of accumulation
5. **Test with actual streaming** - Don't assume non-streaming behavior translates

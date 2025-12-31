# Stream Debugging Enhancement

## Summary

Added comprehensive debugging to `chatStream` method in `TripDesignerService` to trace the complete flow from first stream → tool execution → second stream → text response.

## Changes Made

### File: `src/services/trip-designer/trip-designer.service.ts`

#### 1. First Stream Logging (Lines 588-610)
- **All chunks logged** (not just first 3) with format:
  ```
  [chatStream] Chunk N: content=X, tools=Y, finish=Z
  ```
- **Text yields logged** when content is streamed:
  ```
  [chatStream] Yielding text: X chars
  ```

#### 2. Stream End Summary (Line 662)
- Logs total chunks, content length, and tool call count:
  ```
  [chatStream] Stream ended, received N chunks, content length: X, toolCalls: Y
  ```

#### 3. Tool Execution Phase (Lines 685, 707)
- **Before execution**:
  ```
  [chatStream] Executing N tool calls...
  ```
- **After execution** (success/failure counts):
  ```
  [chatStream] Tool results: X success, Y failure
  ```

#### 4. Second Stream Logging (Lines 746, 783, 793, 797)
- **Start**:
  ```
  [chatStream] Second stream starting...
  ```
- **Each chunk**:
  ```
  [chatStream] Second stream chunk N: content=X
  ```
- **Text yields**:
  ```
  [chatStream] Yielding text from second stream: X chars
  ```
- **End**:
  ```
  [chatStream] Second stream ended, received N chunks, finalContent length: X
  ```

## Testing Flow

When you send a chat message that triggers tool calls, the console will now show:

```
[chatStream] Calling LLM for session xxx, model: anthropic/claude-sonnet-4
[chatStream] Stream created, starting to read chunks...
[chatStream] Chunk 1: content=0, tools=0, finish=none
[chatStream] Chunk 2: content=0, tools=1, finish=none
[chatStream] Chunk 3: content=0, tools=0, finish=none
...
[chatStream] Chunk 6: content=0, tools=0, finish=tool_calls
[chatStream] Stream ended, received 6 chunks, content length: 0, toolCalls: 1

[chatStream] Executing 1 tool calls...
[chatStream] Tool results: 1 success, 0 failure

[chatStream] Second stream starting...
[chatStream] Second stream chunk 1: content=12
[chatStream] Yielding text from second stream: 12 chars
[chatStream] Second stream chunk 2: content=15
[chatStream] Yielding text from second stream: 15 chars
...
[chatStream] Second stream ended, received 20 chunks, finalContent length: 250
```

## What to Look For

### If text appears in UI:
- Second stream should show `content > 0` in chunk logs
- Should see "Yielding text from second stream" messages
- Final content length should match what appears in UI

### If text is missing:
- Check if second stream has `content=0` in all chunks
- Check if "Second stream starting..." appears (confirms tool execution completed)
- Check if tool results are structured correctly

## Next Steps

1. Restart the server: `npm run server`
2. Test chat with tool calls
3. Check console for the full trace
4. Share the complete log output to identify where content is lost

## Build

Already built successfully:
```bash
npm run build
# ESM Build success in 222ms
```

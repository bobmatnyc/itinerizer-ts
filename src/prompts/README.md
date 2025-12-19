# Agent Prompts

This directory contains external markdown files for agent system prompts, organized by agent ID.

## Why External Markdown?

1. **Edit without recompiling** - Change prompts without rebuilding TypeScript
2. **Better readability** - Markdown formatting is easier to read and edit
3. **Version control** - Git diffs are clearer for text changes
4. **Documentation** - Can include markdown comments and formatting
5. **Separation of concerns** - Keep prompts separate from code logic

## Directory Structure

```
src/prompts/
├── README.md              # This file
├── index.ts               # Prompt loader utility
└── trip-designer/         # Trip Designer Agent prompts
    ├── system.md          # Main system prompt
    ├── compaction.md      # Context compaction prompt
    └── profile-extraction.md  # Profile extraction prompt
```

## Usage

### Import Pre-loaded Prompts

```typescript
import {
  TRIP_DESIGNER_SYSTEM_PROMPT,
  COMPACTION_SYSTEM_PROMPT,
  PROFILE_EXTRACTION_PROMPT,
} from './prompts/index.js';

// Use the prompt
const messages = [
  { role: 'system', content: TRIP_DESIGNER_SYSTEM_PROMPT },
  // ...
];
```

### Load Custom Prompts

```typescript
import { loadPrompt } from './prompts/index.js';

// Load any prompt by agent ID and prompt name
const customPrompt = loadPrompt('trip-designer', 'custom-prompt');
```

### Lazy Loading with Functions

```typescript
import { PROMPTS } from './prompts/index.js';

// Load prompts on-demand (avoids loading at import time)
const systemPrompt = PROMPTS.tripDesigner.system();
const compactionPrompt = PROMPTS.tripDesigner.compaction();
```

## Adding New Agent Prompts

1. **Create agent directory**:
   ```bash
   mkdir src/prompts/my-agent
   ```

2. **Add markdown prompt files**:
   ```bash
   touch src/prompts/my-agent/system.md
   ```

3. **Update `index.ts`** to add loader functions:
   ```typescript
   export const PROMPTS = {
     myAgent: {
       system: () => loadPrompt('my-agent', 'system'),
     },
   };
   ```

4. **Export constants for backwards compatibility** (optional):
   ```typescript
   export const MY_AGENT_SYSTEM_PROMPT = PROMPTS.myAgent.system();
   ```

## Best Practices

### Prompt Organization

- **system.md** - Main agent personality and instructions
- **compaction.md** - Context compression/summarization
- **profile-extraction.md** - Extract structured data from conversation
- **{task-name}.md** - Task-specific prompts

### Markdown Formatting

- Use `##` for major sections
- Use `###` for subsections
- Use code blocks with triple backticks for examples
- Use **bold** for important terms
- Use bullet lists for instructions
- Add horizontal rules (`---`) to separate major sections

### Prompt Engineering

- **Be specific** - Clear instructions produce better results
- **Use examples** - Show good and bad examples
- **Structure with headings** - Makes prompts scannable
- **Version control** - Track changes with meaningful commits
- **Test changes** - Validate prompt modifications with real conversations

## Maintenance

### Editing Prompts

1. Edit the `.md` file directly in your editor
2. Save changes
3. Test with the agent (no rebuild needed for development)
4. Commit changes with descriptive message

### Testing Prompts

```bash
# Run TypeScript directly with tsx
npx tsx --eval "
import { TRIP_DESIGNER_SYSTEM_PROMPT } from './src/prompts/index.ts';
console.log('Prompt length:', TRIP_DESIGNER_SYSTEM_PROMPT.length);
console.log('Contains expected text:', TRIP_DESIGNER_SYSTEM_PROMPT.includes('YOUR_TEXT'));
"
```

### Rebuilding

When you build the project, prompts are bundled with the code:

```bash
npm run build
```

The markdown files are read at runtime, so they must exist in the `src/prompts` directory.

## Migration from Old Prompts

The previous prompts were in `src/services/trip-designer/prompts.ts`. They have been:

1. ✅ Moved to `src/prompts/trip-designer/*.md`
2. ✅ Loader created in `src/prompts/index.ts`
3. ✅ Imports updated to use new location
4. ✅ Backwards compatibility maintained via re-exports

The old `prompts.ts` file can now be safely deleted.

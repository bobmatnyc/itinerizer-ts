# Text Import Feature

## Overview

The text import feature allows users to import travel itineraries by pasting plain text (emails, confirmations, notes, etc.) instead of uploading PDF files. The feature uses the same LLM parsing service as PDF imports but accepts raw text input directly.

## Implementation Details

### 1. TextImportModal Component

**Location:** `/src/lib/components/TextImportModal.svelte`

**Technology:** Svelte 5 with Runes API

**Features:**
- Modal overlay with centered content
- Title input for naming the itinerary
- Large textarea for pasting travel text (12 rows, auto-resizable)
- Loading state with spinner
- Error message display
- Form validation (title and text required)
- API key validation (from settings store)
- Responsive design (full-screen on mobile)

**Props:**
- `open` - Boolean bindable prop to control modal visibility
- `onSuccess` - Callback function called with `itineraryId` on successful import

**State Management:**
Uses Svelte 5 `$state` runes for:
- `title` - Itinerary title
- `text` - Pasted travel text
- `loading` - Loading state during import
- `error` - Error message display

**Integration:**
- Uses `settingsStore.getApiKey()` to retrieve the OpenRouter API key
- Calls `/api/v1/import/text` endpoint with POST request
- On success, closes modal and calls `onSuccess(itineraryId)` callback

### 2. Text Import API Route

**Location:** `/src/routes/api/v1/import/text/+server.ts`

**Type:** SvelteKit server endpoint (POST)

**Request Body:**
```typescript
{
  title: string;      // User-provided itinerary title
  text: string;       // Raw travel text to parse
  apiKey: string;     // OpenRouter API key from settings
}
```

**Response:**
```typescript
// Success
{
  success: true,
  itineraryId: string
}

// Error
{
  success: false,
  error: string
}
```

**Processing Flow:**
1. Validate inputs (title, text, apiKey required)
2. Dynamically import `LLMService` (avoids serverless issues)
3. Create LLM service instance with provided API key
4. Parse text using `llmService.parseItinerary(text)`
5. Override parsed title with user-provided title
6. Save itinerary using `itineraryService.saveImported()`
7. Return success with `itineraryId`

**Error Handling:**
- 400: Missing or invalid inputs
- 500: LLM parsing failed
- 500: Storage/save failed

**Dynamic Imports:**
Uses dynamic imports to avoid loading LLM service modules during build/serverless initialization:
```typescript
const { LLMService } = await import('../../../../../../../src/services/llm.service.js');
```

### 3. Integration with Itineraries Page

**Location:** `/src/routes/itineraries/+page.svelte`

**Changes:**
1. Added `TextImportModal` component import
2. Added `textImportModalOpen` state variable
3. Added `handleTextImportClick()` function to open modal
4. Added `handleTextImportSuccess(itineraryId)` callback to:
   - Reload itineraries list
   - Select newly imported itinerary
5. Updated header buttons:
   - "Import" → "Import PDF" (clarification)
   - Added "Import Text" button
   - Kept "Build" button

**Button Layout:**
```
┌────────────┬─────────────┬───────┐
│ Import PDF │ Import Text │ Build │
└────────────┴─────────────┴───────┘
```

## How It Works

### User Flow

1. User clicks "Import Text" button on itineraries page
2. TextImportModal opens
3. User enters:
   - Itinerary title (e.g., "Summer Italy Trip")
   - Travel text (paste confirmation emails, etc.)
4. User clicks "Import" button
5. Modal shows loading spinner
6. Backend:
   - Validates inputs
   - Uses LLM to parse text into structured segments
   - Saves itinerary to storage
   - Returns itinerary ID
7. Modal closes on success
8. Itinerary list refreshes
9. Newly imported itinerary is automatically selected

### LLM Parsing

The text is sent directly to the LLM service without preprocessing:

**Input:** Raw text (emails, confirmations, notes)

**LLM Prompt:** Same prompt used for PDF imports (from `LLMService.buildSystemPrompt()`)

**Output:** Structured `Itinerary` object with:
- Extracted segments (flights, hotels, activities, transfers)
- Metadata (start/end dates, destinations, tags)
- Parsed dates and times
- Location information

**Model:** Uses default model from `ImportConfig` (configurable)

## Usage Example

### Pasting Flight Confirmation Email

```
Subject: Flight Confirmation - UA1234

Your flight from San Francisco (SFO) to Rome (FCO)
Departure: June 15, 2025 at 6:30 PM
Arrival: June 16, 2025 at 2:45 PM
Flight: UA1234
Confirmation: ABC123
```

**Result:**
- Creates FLIGHT segment
- Extracts airline (United), flight number (UA1234)
- Parses origin (SFO), destination (FCO)
- Converts times to ISO 8601 datetime

### Pasting Hotel Booking

```
Hotel Reservation Confirmed

Hotel Artemide Rome
Check-in: June 16, 2025 (3:00 PM)
Check-out: June 20, 2025 (11:00 AM)
Room: Deluxe Double Room
Confirmation: XYZ789
```

**Result:**
- Creates HOTEL segment
- Extracts property name
- Parses check-in/check-out dates with default times
- Captures room type

## Technical Considerations

### API Key Management

- API key stored in `settingsStore` (localStorage)
- Sent with each import request
- Not stored on server (serverless-safe)
- Required for every import

### Serverless Compatibility

**Dynamic Imports:** Uses dynamic imports for LLM service to avoid:
- Loading modules during build
- Filesystem dependencies on serverless platforms
- Initialization errors on Vercel/Netlify

**No Cost Tracking:** Cost tracking disabled for text imports (filesystem-dependent):
```typescript
const llmService = new LLMService({
  apiKey: apiKey.trim(),
  costTrackingEnabled: false, // Serverless-safe
});
```

### Type Safety

- Uses Svelte 5 `$props()` for type-safe component props
- TypeScript strict mode for API route
- Validates LLM response against `itinerarySchema` (Zod)

### Error Handling

**Modal Errors:**
- Displays inline error message
- Keeps modal open for correction
- Clears error on new submission

**API Errors:**
- Returns appropriate HTTP status codes
- Includes descriptive error messages
- Logs errors to console for debugging

## Dependencies

### Required Services

- `LLMService` - Parses text into structured itinerary
- `ItineraryService` - Saves parsed itinerary to storage
- `settingsStore` - Provides OpenRouter API key

### Required Environment

- OpenRouter API key (user-provided via settings)
- SvelteKit server environment
- Storage backend (JSON or Blob)

## Future Enhancements

### Potential Improvements

1. **Model Selection:** Allow user to choose LLM model (like PDF import)
2. **Preview Mode:** Show parsed segments before final import
3. **Multi-Format Support:** Detect and handle different text formats
4. **Batch Import:** Import multiple trips from a single text block
5. **Template Library:** Pre-filled examples for testing
6. **Copy Detection:** Warn if text looks like PDF content
7. **History Tracking:** Save import history for debugging
8. **Cost Display:** Show estimated or actual API cost after import

### Advanced Features

1. **Email Integration:** Direct email forwarding to import@app.com
2. **OCR Support:** Extract text from images of documents
3. **Calendar Integration:** Import from .ics files
4. **Multi-Language:** Support non-English travel documents
5. **Smart Validation:** Detect common parsing errors and suggest fixes

## Testing

### Manual Testing Steps

1. **Basic Import:**
   - Open modal
   - Enter title "Test Trip"
   - Paste simple flight confirmation
   - Verify import succeeds
   - Verify itinerary appears in list

2. **Validation:**
   - Try empty title (should show error)
   - Try empty text (should show error)
   - Try without API key (should show error)
   - Verify error messages clear on retry

3. **Complex Content:**
   - Paste multi-day itinerary with flights, hotels, activities
   - Verify all segments extracted
   - Verify dates parsed correctly
   - Verify locations detected

4. **Error Handling:**
   - Use invalid API key (should show LLM error)
   - Paste gibberish text (LLM should return empty or fail)
   - Test network timeout scenarios

5. **UI/UX:**
   - Test responsive design on mobile
   - Verify loading spinner shows during import
   - Verify modal closes on success
   - Verify Escape key closes modal
   - Verify click outside closes modal

### Automated Tests (TODO)

- Unit tests for TextImportModal component
- Integration tests for `/api/v1/import/text` endpoint
- E2E tests for complete user flow
- Snapshot tests for error states

## Files Modified/Created

### Created Files
1. `/src/lib/components/TextImportModal.svelte` (8KB)
2. `/src/routes/api/v1/import/text/+server.ts` (3KB)

### Modified Files
1. `/src/routes/itineraries/+page.svelte`
   - Added TextImportModal import
   - Added state and handlers
   - Updated button layout

### Total LOC
- Added: ~350 lines
- Modified: ~15 lines
- Net Change: +365 lines

## Architecture Decisions

### Why Svelte 5 Runes?

- **Modern API:** Uses latest Svelte patterns (`$state`, `$props`, `$bindable`)
- **Type Safety:** Better TypeScript integration than Svelte 4
- **Fine-grained Reactivity:** Efficient updates for modal state
- **Future-proof:** Aligned with Svelte 5 stable release

### Why Dynamic Imports?

- **Serverless Compatibility:** Avoids loading modules during build
- **Lazy Loading:** Only loads LLM service when needed
- **Error Prevention:** Prevents initialization errors on Vercel
- **Performance:** Reduces initial bundle size

### Why Client-side API Key?

- **User Control:** Users manage their own API keys
- **Privacy:** No server-side storage of credentials
- **Flexibility:** Different users can use different keys
- **Serverless-safe:** No persistent storage required

## Conclusion

The text import feature provides a faster, more flexible alternative to PDF import for users with travel text readily available. It leverages the same LLM parsing infrastructure while offering a streamlined UX and maintaining serverless compatibility.

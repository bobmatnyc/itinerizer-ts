# Email Import Feature - Setup Guide

Automatically import travel bookings from confirmation emails using inbound.new webhook integration.

## Overview

The email import webhook allows users to forward booking confirmation emails to a dedicated email address. The system:

1. Receives emails via inbound.new webhook
2. Uses Claude (via OpenRouter) to extract booking details
3. Creates segments in the user's most recent itinerary
4. Supports flights, hotels, activities, car rentals, and more

## Architecture

```
Email → inbound.new → Webhook → EmailImportService → LLM Extraction → SegmentService → Itinerary
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| **EmailImportService** | `src/services/email-import.service.ts` | LLM-based booking extraction |
| **Webhook Endpoint** | `viewer-svelte/src/routes/api/v1/import/email/+server.ts` | Receives inbound.new webhooks |
| **Test Script** | `test-email-import.mjs` | Simulates webhook for testing |

## Setup Instructions

### 1. Configure inbound.new

1. Sign up at https://inbound.new
2. Create a new inbound email address (e.g., `import@yourdomain.com`)
3. Get your API key from the dashboard
4. Configure webhook URL: `https://your-domain.com/api/v1/import/email`

### 2. Environment Variables

Add to `viewer-svelte/.env`:

```bash
# Inbound Email Webhook
INBOUND_API_KEY=your_inbound_api_key_here

# OpenRouter (required for LLM extraction)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Deploy Webhook Endpoint

The webhook is automatically available at `/api/v1/import/email` when the SvelteKit app is running.

**Local development:**
```bash
cd viewer-svelte
npm run dev
# Webhook available at: http://localhost:5176/api/v1/import/email
```

**Production (Vercel):**
- Deploy to Vercel
- Add environment variables in Vercel dashboard
- Webhook URL: `https://your-vercel-app.vercel.app/api/v1/import/email`

### 4. Configure inbound.new Webhook

In your inbound.new dashboard:

1. Navigate to Webhooks settings
2. Add webhook URL: `https://your-domain.com/api/v1/import/email`
3. Set authentication:
   - Method: API Key Header
   - Header name: `x-api-key`
   - Header value: Your `INBOUND_API_KEY`
4. Select event: `email.received`
5. Save and test

## Testing

### Local Testing with Test Script

```bash
# Set environment variables
export VITE_API_URL=http://localhost:5176
export INBOUND_API_KEY=test-key-12345
export OPENROUTER_API_KEY=your_key_here

# Run test script
node test-email-import.mjs
```

The script sends three test emails:
1. United Airlines flight confirmation
2. Marriott hotel reservation
3. Viator activity booking

### Manual Testing with curl

```bash
curl -X POST http://localhost:5176/api/v1/import/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key-12345" \
  -d @test-email-payload.json
```

### Testing with Real Emails

1. Forward a booking confirmation email to your inbound.new address
2. Check webhook logs in inbound.new dashboard
3. Check application logs for extraction results
4. Verify segments were added to itinerary

## Supported Email Types

The LLM extraction handles common booking confirmation formats:

### Airlines
- ✅ United, Delta, American, Southwest, JetBlue
- ✅ International carriers (Lufthansa, British Airways, etc.)
- ✅ Budget carriers (Spirit, Frontier, Ryanair, etc.)

### Hotels
- ✅ Marriott, Hilton, Hyatt, IHG, Accor
- ✅ Booking.com, Hotels.com, Expedia
- ✅ Airbnb, VRBO

### Activities
- ✅ Viator, GetYourGuide, TripAdvisor Experiences
- ✅ Museums, attractions, tours
- ✅ Restaurant reservations (OpenTable, Resy)

### Transportation
- ✅ Car rentals (Hertz, Enterprise, Budget, Avis)
- ✅ Train tickets (Amtrak, Eurostar, SNCF)
- ✅ Uber/Lyft receipts (converted to TRANSFER segments)

## How It Works

### 1. Email Reception

User forwards confirmation email → `import@yourdomain.com` → inbound.new → webhook POST to `/api/v1/import/email`

### 2. Authentication

Webhook validates `x-api-key` header matches `INBOUND_API_KEY` environment variable.

### 3. User Identification

Sender email address (`from.address`) is used to:
- Find user's existing itineraries
- Create new itinerary if none exist
- Associate segments with correct user

### 4. LLM Extraction

Email content is sent to Claude 3.5 Haiku with a specialized prompt:

**Input:**
- Email subject
- Email body (text or HTML)
- Sender/recipient info
- Date

**Output (JSON):**
```json
{
  "segments": [
    {
      "type": "FLIGHT",
      "startDatetime": "2025-01-15T08:00:00Z",
      "endDatetime": "2025-01-15T16:30:00Z",
      "airline": { "name": "United Airlines", "code": "UA" },
      "flightNumber": "UA123",
      "origin": { "name": "San Francisco International", "code": "SFO" },
      "destination": { "name": "John F. Kennedy International", "code": "JFK" },
      "confirmationNumber": "ABC123XYZ",
      "status": "CONFIRMED"
    }
  ],
  "confidence": 0.95,
  "summary": "Found 1 flight booking from SFO to JFK on Jan 15",
  "warnings": []
}
```

### 5. Segment Creation

Each extracted segment is:
- Validated against segment schema
- Assigned a unique segment ID
- Added to user's most recent itinerary
- Tagged with metadata:
  ```json
  {
    "importedFrom": "email",
    "emailId": "msg-123",
    "emailSubject": "Flight Confirmation",
    "emailDate": "2025-01-10T12:00:00Z"
  }
  ```

### 6. Itinerary Selection

**Logic:**
- If user has existing itineraries → use most recently updated
- If user has no itineraries → create new one with title from email subject

**Future enhancement:** Allow user to specify target itinerary via email subject line (e.g., "FWD: [ITN-123] Hotel Confirmation")

## API Reference

### POST /api/v1/import/email

**Request Headers:**
```
Content-Type: application/json
x-api-key: your_inbound_api_key
```

**Request Body (from inbound.new):**
```typescript
{
  event: 'email.received',
  timestamp: string,
  email: {
    id: string,
    parsedData: {
      from: { address: string, name?: string },
      to: Array<{ address: string, name?: string }>,
      subject: string,
      textBody: string,
      htmlBody: string,
      date: string,
      attachments: Array<{ filename, contentType, size, url }>
    }
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Imported 2 booking(s) to itinerary",
  "itineraryId": "itn-abc123",
  "segments": ["seg-001", "seg-002"],
  "confidence": 0.92,
  "summary": "Found flight and hotel bookings",
  "warnings": ["Could not extract seat assignment"]
}
```

**Response (No Bookings - 200):**
```json
{
  "success": true,
  "message": "No travel bookings found in email",
  "confidence": 0.0,
  "summary": "Email does not contain travel booking information"
}
```

**Response (Error - 4xx/5xx):**
```json
{
  "error": "Invalid API key",
  "message": "Authentication failed"
}
```

## Extraction Confidence

The LLM returns a confidence score (0-1) indicating extraction quality:

| Score | Meaning | Action |
|-------|---------|--------|
| **0.9 - 1.0** | High confidence | All critical details extracted |
| **0.7 - 0.9** | Medium confidence | Main details extracted, minor gaps |
| **0.5 - 0.7** | Low confidence | Partial extraction, review needed |
| **0.0 - 0.5** | Very low | Unclear email, manual review required |

**Warnings array** provides specific feedback:
- "Could not extract confirmation number"
- "Unclear check-in time, defaulting to 3:00 PM"
- "Missing flight terminal information"

## Cost Estimation

Using Claude 3.5 Haiku via OpenRouter:

- **Input cost:** $0.80 per 1M tokens
- **Output cost:** $4.00 per 1M tokens

**Typical email extraction:**
- Input: ~500 tokens (email content)
- Output: ~300 tokens (JSON response)
- **Cost per email: ~$0.0016** (less than 1¢)

**Monthly cost for 100 emails:** ~$0.16

## Security Considerations

### API Key Validation
- Webhook validates `x-api-key` header
- Rejects requests without valid key
- Logs failed authentication attempts

### Email Sender Verification
- Uses sender email to identify user
- Only adds segments to sender's itineraries
- Prevents cross-user data leakage

### PII Handling
- Email content not persisted
- Only extracted booking data stored
- Complies with privacy best practices

### Rate Limiting (TODO)
Future enhancement:
- Limit emails per user per day
- Throttle webhook requests
- Alert on unusual activity

## Troubleshooting

### Webhook not receiving emails

1. Check inbound.new dashboard for webhook delivery logs
2. Verify webhook URL is correct and accessible
3. Test webhook endpoint with curl
4. Check firewall/security settings

### Extraction failing

1. Check OpenRouter API key is valid
2. Verify email format is supported
3. Review LLM response in logs
4. Test with simpler booking email first

### Segments not appearing in itinerary

1. Check segment validation errors in logs
2. Verify user email matches sender
3. Check itinerary permissions
4. Review date validation (dates must be valid and in order)

### Common Log Messages

```bash
# Success
✅ [POST /import/email] Extracted bookings: segmentCount=2, confidence=0.95

# No bookings found
ℹ️  [POST /import/email] No bookings found in email

# Invalid API key
❌ [POST /import/email] Invalid API key

# Extraction failed
❌ [POST /import/email] Extraction failed: Invalid date format

# Segment validation failed
❌ [POST /import/email] Failed to add segment: Constraint violation
```

## Future Enhancements

### Priority 1
- [ ] **Smart itinerary routing**: Parse email subject for itinerary ID (e.g., `[ITN-123]`)
- [ ] **Attachment parsing**: Extract PDFs (boarding passes, vouchers)
- [ ] **Email threading**: Group related emails (confirmation → updates → cancellation)

### Priority 2
- [ ] **User confirmation flow**: Send email summary before adding segments
- [ ] **Duplicate detection**: Check for existing segments with same confirmation number
- [ ] **Calendar event creation**: Sync with user's calendar

### Priority 3
- [ ] **Multi-language support**: Extract from non-English emails
- [ ] **Custom extraction rules**: User-defined parsing patterns
- [ ] **Analytics dashboard**: Track extraction success rates

## Related Files

- **Service:** `src/services/email-import.service.ts`
- **Webhook:** `viewer-svelte/src/routes/api/v1/import/email/+server.ts`
- **Test script:** `test-email-import.mjs`
- **Types:** `src/domain/types/segment.ts`
- **Schema:** `src/domain/schemas/segment.schema.ts`

## Support

For issues or questions:
1. Check logs for error messages
2. Test with the included test script
3. Review inbound.new webhook logs
4. Verify environment variables are set correctly

---

**Ready to receive emails!** Forward any travel booking confirmation to your inbound.new address and watch it automatically populate your itinerary.

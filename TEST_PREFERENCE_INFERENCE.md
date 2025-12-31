# Test Scenarios: Preference Inference from Existing Bookings

## Test Case 1: Luxury Hotel Booking (Hotel L'Esplanade)

### Setup
1. Create new itinerary for St. Martin (Dec 29, 2025 - Jan 5, 2026)
2. Add accommodation segment:
   - Name: Hotel L'Esplanade
   - Location: Grand Case, St. Martin
   - Type: Boutique Hotel
   - Check-in: Dec 29, 2025
   - Check-out: Jan 5, 2026

### Expected Behavior
**AI should:**
- ✅ Call `get_itinerary()` first
- ✅ Detect Hotel L'Esplanade (luxury boutique)
- ✅ Infer: Luxury travel style
- ✅ Skip "What's your travel style?" question
- ✅ Acknowledge the booking: "I see you've booked Hotel L'Esplanade..."
- ✅ Suggest luxury-appropriate activities:
  - Fine dining in Grand Case
  - Private beach experiences
  - Luxury catamaran charters
  - Spa and wellness

**AI should NOT:**
- ❌ Ask "What's your preferred travel style?"
- ❌ Suggest budget activities (street food, hostels, public transport)
- ❌ Ignore the existing hotel booking

### Test Conversation Flow
```
User: "Help me plan activities for my St. Martin trip"

WRONG Response:
"What's your preferred travel style?
- Luxury
- Moderate
- Budget-friendly"

CORRECT Response:
"I see you've booked Hotel L'Esplanade in Grand Case - excellent choice! It's one of St. Martin's finest boutique hotels. Based on your accommodation choice, I'll focus on upscale dining and premium experiences to match your style. What interests you most?
- Fine Dining (Grand Case is the 'Gourmet Capital')
- Private Beach Experiences
- Luxury Catamaran Charter
- Spa & Wellness"
```

## Test Case 2: Mid-Range Hotel Booking (Marriott)

### Setup
1. Create new itinerary for San Diego (Jan 10-15, 2026)
2. Add accommodation segment:
   - Name: San Diego Marriott Mission Valley
   - Location: San Diego, CA
   - Type: Hotel
   - Check-in: Jan 10, 2026
   - Check-out: Jan 15, 2026

### Expected Behavior
**AI should:**
- ✅ Call `get_itinerary()` first
- ✅ Detect Marriott (mid-range chain)
- ✅ Infer: Moderate travel style
- ✅ Skip "travel style" question
- ✅ Suggest moderate activities:
  - Group tours
  - Popular restaurants
  - Standard attraction tickets

**AI should NOT:**
- ❌ Suggest only luxury experiences (private tours, Michelin dining)
- ❌ Suggest only budget options (hostels, street food)

## Test Case 3: Budget Accommodation (Hostel)

### Setup
1. Create new itinerary for Barcelona (Feb 1-7, 2026)
2. Add accommodation segment:
   - Name: Barcelona Central Hostel
   - Location: Barcelona, Spain
   - Type: Hostel
   - Check-in: Feb 1, 2026
   - Check-out: Feb 7, 2026

### Expected Behavior
**AI should:**
- ✅ Detect hostel → infer budget-friendly style
- ✅ Suggest budget activities:
  - Free walking tours
  - Street food markets
  - Public transport options
  - Free museum days

**AI should NOT:**
- ❌ Suggest expensive fine dining
- ❌ Suggest private tours or premium experiences

## Test Case 4: Business Class Flight

### Setup
1. Create new itinerary for London (Mar 1-8, 2026)
2. Add flight segment:
   - From: New York (JFK)
   - To: London (LHR)
   - Class: Business
   - Date: Mar 1, 2026

### Expected Behavior
**AI should:**
- ✅ Detect Business class → infer luxury style
- ✅ When suggesting hotels, focus on 4-5 star options
- ✅ Suggest premium dining and experiences

## Test Case 5: Blank Itinerary (No Segments)

### Setup
1. Create new itinerary with only dates and destination
2. No segments added yet

### Expected Behavior
**AI should:**
- ✅ Call `get_itinerary()` first
- ✅ Find no segments to infer from
- ✅ Proceed with normal discovery questions:
  1. "Who's traveling?"
  2. "What's your travel style?"
  3. "What interests you?"
- ✅ Use structured questions for each

**Fallback behavior:** When no bookings exist, revert to asking discovery questions.

## Test Case 6: Mixed Signals (Luxury Hotel + Budget Flight)

### Setup
1. Add Four Seasons Hotel (luxury)
2. Add Basic Economy flight (budget)

### Expected Behavior
**AI should:**
- ✅ Prioritize hotel tier over flight class (hotel shows stronger preference)
- ✅ Infer: Luxury style (hotel is a stronger signal)
- ✅ Suggest luxury activities
- ✅ Optionally mention: "I see you're mixing luxury accommodation with budget flights - smart way to save on travel costs while enjoying premium stays!"

**Reasoning:** Hotel choice shows where users want to spend time and money; flight is just transportation.

## Validation Checklist

For each test case, verify:
- [ ] AI calls `get_itinerary()` before asking questions
- [ ] AI correctly identifies hotel/flight tier
- [ ] AI infers appropriate travel style
- [ ] AI skips redundant "travel style" question
- [ ] AI suggests activities matching inferred style
- [ ] AI acknowledges existing bookings in response
- [ ] Structured questions match inferred preferences

## Manual Testing Steps

1. **Start Trip Designer session**
2. **Add hotel/flight segment manually** (via UI or API)
3. **Send message:** "Help me plan my trip"
4. **Verify AI response:**
   - Check if it mentions the existing booking
   - Check if it infers preferences correctly
   - Check if it skips redundant questions
   - Check if activity suggestions match hotel tier

## Automated Testing (Future)

```typescript
// Test: Luxury hotel inference
test('infers luxury style from Four Seasons booking', async () => {
  const itinerary = await createItinerary({
    title: "St. Martin Trip",
    startDate: "2026-01-01",
    endDate: "2026-01-07"
  });

  await addSegment(itinerary.id, {
    type: "accommodation",
    name: "Four Seasons Resort",
    location: "Grand Case, St. Martin",
    checkInDate: "2026-01-01",
    checkOutDate: "2026-01-07"
  });

  const response = await chat(itinerary.id, "Help me plan activities");

  expect(response.message).toContain("Four Seasons");
  expect(response.message).not.toContain("What's your travel style?");
  expect(response.structuredQuestions[0].options).toContainEqual(
    expect.objectContaining({ label: "Fine Dining" })
  );
});
```

## Edge Cases to Test

1. **Unknown hotel name:** AI can't determine tier → fallback to asking
2. **Vacation rental (Airbnb):** Could be luxury or budget → check price if available
3. **Multiple hotels of different tiers:** Use most recent or most expensive
4. **User explicitly contradicts inference:** Accept user's stated preference
5. **Hotel + Activities mismatch:** e.g., Ritz-Carlton + street food tour → respect existing choices

## Success Criteria

✅ **PASS:** AI acknowledges existing bookings and infers preferences intelligently
❌ **FAIL:** AI asks "What's your travel style?" when luxury hotel already booked
✅ **PASS:** Activity suggestions match inferred travel style
❌ **FAIL:** Suggests budget activities for luxury hotel guests
✅ **PASS:** Gracefully falls back to questions when no segments exist

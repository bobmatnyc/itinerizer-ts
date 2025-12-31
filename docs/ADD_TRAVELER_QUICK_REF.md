# Add Traveler Tool - Quick Reference

## Purpose

Capture traveler information when users mention who is traveling in conversation.

## When to Use

**Trigger phrases:**
- "my partner/wife/husband [name]"
- "traveling with [name]"
- "me and [name]"
- "family of 4"
- "bringing the kids"
- "[name], my [relationship]"

## Tool Call Syntax

```typescript
add_traveler({
  firstName: string,        // REQUIRED
  type: string,            // REQUIRED: 'adult', 'child', 'infant', 'senior'
  lastName?: string,
  middleName?: string,
  email?: string,
  phone?: string,
  age?: number,            // Important for children
  dateOfBirth?: string,    // YYYY-MM-DD
  relationship?: string,   // 'partner', 'spouse', 'child', 'friend', etc.
  isPrimary?: boolean      // true for the user themselves
})
```

## Common Scenarios

### 1. User mentions partner by name
```
User: "joanie, my partner and me"

AI Actions:
1. add_traveler({ firstName: "Joanie", type: "adult", relationship: "partner" })
2. add_traveler({ firstName: "[User]", type: "adult", isPrimary: true })

Response: "I've added Joanie (partner) and you to the trip!"
```

### 2. User mentions family with kids
```
User: "my wife Sarah and our kids ages 8 and 12"

AI Actions:
1. add_traveler({ firstName: "Sarah", type: "adult", relationship: "spouse" })
2. add_traveler({ firstName: "Child 1", type: "child", age: 8, relationship: "child" })
3. add_traveler({ firstName: "Child 2", type: "child", age: 12, relationship: "child" })

Response: "I've added Sarah and your two children to the trip!"
```

### 3. User mentions friend with contact info
```
User: "traveling with my friend Mike, mike@email.com"

AI Actions:
1. add_traveler({
     firstName: "Mike",
     type: "adult",
     relationship: "friend",
     email: "mike@email.com"
   })

Response: "I've added Mike (friend) to the trip!"
```

### 4. Solo traveler
```
User: "just me, solo trip"

AI Actions:
1. add_traveler({ firstName: "[User's name]", type: "adult", isPrimary: true })

Response: "Got it, planning a solo adventure for you!"
```

### 5. Count without names
```
User: "2 adults"

AI Actions:
1. add_traveler({ firstName: "Traveler 1", type: "adult" })
2. add_traveler({ firstName: "Traveler 2", type: "adult" })

Response: "I've added 2 adults to the trip. What are your names?"
```

## Important Rules

1. **Always capture the primary traveler** (the user) when processing companions
2. **Call once per person** - don't batch multiple travelers in one call
3. **Acknowledge the capture** - tell the user you've added them to the trip
4. **Ask for missing info** if important (e.g., names for children, ages for kids)
5. **Use placeholder names** if names not provided ("Child 1", "Traveler 1")

## Traveler Types

- **adult** - 18+ years old (default if age not specified)
- **child** - 2-17 years old (always capture age if mentioned)
- **infant** - Under 2 years old
- **senior** - 65+ years old

## Common Relationships

- partner
- spouse (wife/husband)
- child (son/daughter)
- friend
- parent (mother/father)
- sibling (brother/sister)
- colleague

## Response Format

Tool returns:
```json
{
  "success": true,
  "travelerId": "uuid-123...",
  "travelerName": "Joanie",
  "message": "Added Joanie (partner) to the trip"
}
```

## Best Practices

### DO ✅
- Capture travelers as soon as they're mentioned
- Include relationship when mentioned
- Mark the user as isPrimary: true
- Ask for ages when children are mentioned
- Use specific names when provided

### DON'T ❌
- Skip capturing travelers mentioned
- Assume relationships (ask if unclear)
- Forget to add the primary traveler
- Batch multiple travelers in one call
- Use generic names when actual names are provided

## Integration with Trip Planning

Once travelers are captured:
- Use count for flight searches (adults, children, infants)
- Consider ages for activity suggestions
- Account for relationships in room bookings
- Reference by name in planning ("Perfect for you and Joanie!")
- Use for pricing estimates (adult vs. child rates)

## Error Handling

Invalid type:
```typescript
// ❌ Will fail
add_traveler({ firstName: "Test", type: "teenager" })

// ✅ Correct
add_traveler({ firstName: "Test", type: "child", age: 13 })
```

Missing required fields:
```typescript
// ❌ Will fail (missing type)
add_traveler({ firstName: "Test" })

// ✅ Correct
add_traveler({ firstName: "Test", type: "adult" })
```

## Example Conversation Flow

```
User: "I want to plan a trip to Italy for me and my wife Maria"

AI (internal):
- update_itinerary({ title: "Trip to Italy" })
- add_traveler({ firstName: "Maria", type: "adult", relationship: "spouse" })
- add_traveler({ firstName: "User", type: "adult", isPrimary: true })

AI (message): "I've set up your Italy trip and added Maria and you to the traveler list! When are you planning to go?"

User: "January 15-25, 2026"

AI (internal):
- update_itinerary({ startDate: "2026-01-15", endDate: "2026-01-25" })

AI (message): "Perfect! I've saved your dates (January 15-25, 2026). What's your travel style?"
```

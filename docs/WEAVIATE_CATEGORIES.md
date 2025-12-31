# Weaviate Trip Categories Guide

## Overview

The Weaviate schema now supports faceted categorization of travel knowledge using seven key dimensions. This enables precise, context-aware knowledge retrieval for personalized trip planning.

## Category Dimensions

### 1. Trip Type (`tripType`)

**Values:** `leisure` | `business` | `adventure` | `cultural` | `relaxation`

Categorizes the nature of the trip:

- **Leisure**: Vacation and recreational travel
- **Business**: Work-related trips, conferences, meetings
- **Adventure**: Outdoor activities, hiking, safaris, extreme sports
- **Cultural**: Museums, heritage sites, cultural exploration
- **Relaxation**: Spa, wellness, beach resorts

**Null value**: Applicable to all trip types (e.g., general travel tips)

### 2. Luxury Level (`luxuryLevel`)

**Values:** `budget` | `moderate` | `luxury` | `ultra-luxury`

Based on daily budget per person:

| Level | Daily Budget | Characteristics |
|-------|--------------|-----------------|
| Budget | < $100 | Hostels, street food, public transport |
| Moderate | $100-300 | Mid-range hotels, local restaurants, some tours |
| Luxury | $300-800 | High-end hotels, fine dining, private tours |
| Ultra-luxury | $800+ | Five-star resorts, Michelin restaurants, private jets |

**Null value**: Applicable across all budget levels

### 3. Traveler Type (`travelerType`)

**Values:** `family` | `couple` | `solo` | `friends` | `group`

Who is traveling:

- **Family**: Parents with children
- **Couple**: Two adults (romantic or otherwise)
- **Solo**: Single traveler
- **Friends**: 3-5 people traveling together
- **Group**: 6+ people or organized tours

**Null value**: Applicable to all traveler types

### 4. Region (`region`)

**Values:** Free-text string (standardized)

Geographic regions:
- `Asia`
- `Europe`
- `North America`
- `South America`
- `Africa`
- `Oceania`
- `Middle East`

**Null value**: Not region-specific (e.g., universal travel tips)

### 5. Country (`country`)

**Values:** Free-text string (country name)

Specific country for the knowledge. Examples: `Japan`, `France`, `USA`

**Null value**: Multi-country or universal knowledge

### 6. Season (`season`)

**Values:** `spring` | `summer` | `fall` | `winter`

Seasonal relevance (hemisphere-aware):

| Season | Northern Hemisphere | Southern Hemisphere |
|--------|---------------------|---------------------|
| Spring | Mar-May | Sep-Nov |
| Summer | Jun-Aug | Dec-Feb |
| Fall | Sep-Nov | Mar-May |
| Winter | Dec-Feb | Jun-Aug |

**Null value**: Not seasonal (evergreen content)

### 7. Season Modifier (`seasonModifier`)

**Values:** `early` | `mid` | `late`

Fine-grained seasonal timing:

- **Early**: Days 1-10 of the month
- **Mid**: Days 11-20 of the month
- **Late**: Days 21-31 of the month

**Example**: "Cherry blossoms in Tokyo during early spring" = `season: 'spring', seasonModifier: 'early'`

## Usage Examples

### Auto-Categorizing Knowledge

```typescript
import {
  detectSeason,
  inferLuxuryLevel,
  inferTravelerType,
  inferTripType,
  detectRegion,
} from './domain/utils/categories.js';

// From itinerary data
const tripDate = new Date('2024-03-25');
const dailyBudget = 250;
const travelers = { count: 2, ages: [30, 32] };

// Auto-detect categories
const seasonInfo = detectSeason(tripDate, 'northern');
// => { season: 'spring', modifier: 'late' }

const luxuryLevel = inferLuxuryLevel(dailyBudget);
// => 'moderate'

const travelerType = inferTravelerType(travelers);
// => 'couple'

const tripType = inferTripType({
  activities: ['Temple visits', 'Tea ceremony'],
  keywords: ['cultural', 'heritage'],
});
// => 'cultural'

const region = detectRegion('Japan');
// => 'Asia'
```

### Creating Categorized Knowledge

```typescript
import type { TravelKnowledge } from './domain/types/weaviate.js';

const knowledge: Partial<TravelKnowledge> = {
  content: 'Cherry blossom viewing in [LOCATION] during [PERIOD]',
  rawContent: 'Cherry blossom viewing in Tokyo during late spring',
  category: 'activity',

  // Trip categories
  tripType: 'cultural',
  luxuryLevel: null, // Applicable to all budgets
  travelerType: null, // Popular with all traveler types
  region: 'Asia',
  country: 'Japan',
  season: 'spring',
  seasonModifier: 'late',

  // Temporal settings
  temporalType: 'seasonal',
  decayHalfLife: 365,
  baseRelevance: 1.0,
};
```

### Searching with Category Filters

```typescript
import { WeaviateStorage } from './storage/weaviate-storage.js';

const storage = new WeaviateStorage(config);

// Find luxury couple experiences in Europe during fall
const result = await storage.searchKnowledge('romantic activities', 10, {
  tripType: 'leisure',
  luxuryLevel: 'luxury',
  travelerType: 'couple',
  region: 'Europe',
  season: 'fall',
});

// Find family-friendly budget activities in Japan
const familyResult = await storage.searchKnowledge('kid-friendly attractions', 10, {
  travelerType: 'family',
  luxuryLevel: 'budget',
  country: 'Japan',
});

// Find adventure activities for any season
const adventureResult = await storage.searchKnowledge('outdoor activities', 10, {
  tripType: 'adventure',
  region: 'South America',
  // No season filter = matches all seasons
});
```

### Multi-Faceted Search

For complex queries combining multiple categories:

```typescript
import type { CategoryFilter } from './domain/types/weaviate.js';

const categoryFilter: CategoryFilter = {
  tripTypes: ['cultural', 'leisure'], // OR logic
  luxuryLevels: ['moderate', 'luxury'],
  travelerTypes: ['couple', 'solo'],
  regions: ['Asia', 'Europe'],
  seasons: ['spring', 'fall'],
  seasonModifiers: ['early', 'mid'],
};

// Implementation in future: searchWithCategories(query, categoryFilter)
```

## Anonymization Integration

All raw content is anonymized before storage:

```typescript
import { AnonymizerService } from './services/anonymizer.js';

const anonymizer = new AnonymizerService();

// Original content
const rawContent = 'Cherry blossom viewing in Tokyo during late spring';

// Anonymized for embedding
const anonymizedResult = await anonymizer.anonymize(rawContent);
// => { content: 'Cherry blossom viewing in [LOCATION] during [PERIOD]', ... }

const knowledge: TravelKnowledge = {
  content: anonymizedResult.content, // Anonymized
  rawContent, // Original (not embedded)
  // ... categories auto-detected
};
```

## Schema Design Principles

### 1. Null Semantics
- **Undefined/Null**: Knowledge applies to ALL values of that category
- **Specific Value**: Knowledge applies ONLY to that specific category

### 2. Multi-Category Tagging
Knowledge can be tagged with as many or as few categories as appropriate:

```typescript
// Highly specific
{
  tripType: 'adventure',
  luxuryLevel: 'luxury',
  travelerType: 'solo',
  region: 'South America',
  country: 'Chile',
  season: 'summer',
  seasonModifier: 'mid',
}

// Universal tip
{
  tripType: null,
  luxuryLevel: null,
  travelerType: null,
  region: null,
  country: null,
  season: null,
  seasonModifier: null,
}
```

### 3. Indexing Strategy
All category fields are indexed as text for efficient filtering:

```typescript
{ name: 'tripType', dataType: 'text' },
{ name: 'luxuryLevel', dataType: 'text' },
{ name: 'travelerType', dataType: 'text' },
{ name: 'region', dataType: 'text' },
{ name: 'country', dataType: 'text' },
{ name: 'season', dataType: 'text' },
{ name: 'seasonModifier', dataType: 'text' },
```

## Query Optimization

### Single-Category Queries (Fast)
```typescript
// Uses index scan
filter: { tripType: 'cultural' }
```

### Multi-Category Queries (Moderate)
```typescript
// Uses AND filter with multiple index scans
filter: {
  tripType: 'cultural',
  region: 'Asia',
  season: 'spring',
}
```

### Hybrid Search (Recommended)
Combines vector similarity with category filtering:

```typescript
// Weaviate hybrid search (vector + keyword + filters)
await collection.query.hybrid('temple visits', {
  limit: 10,
  filters: {
    operator: 'And',
    operands: [
      { path: ['tripType'], operator: 'Equal', valueText: 'cultural' },
      { path: ['country'], operator: 'Equal', valueText: 'Japan' },
    ],
  },
});
```

## Migration from Existing Data

For existing knowledge without categories:

```typescript
import { inferTripType, detectRegion } from './domain/utils/categories.js';

async function migrateKnowledge(existingKnowledge: TravelKnowledge[]) {
  for (const knowledge of existingKnowledge) {
    // Infer categories from content
    const tripType = inferTripType({
      activities: extractActivities(knowledge.content),
      keywords: extractKeywords(knowledge.content),
    });

    const region = knowledge.destinationName
      ? detectRegion(knowledge.destinationName)
      : undefined;

    // Update with categories
    await storage.upsertKnowledge([{
      ...knowledge,
      tripType,
      region,
      // Leave other categories as null for broad applicability
    }]);
  }
}
```

## Best Practices

### 1. Tag Granularity
- **Too specific**: Reduces discoverability
  ```typescript
  // BAD: Too restrictive
  { tripType: 'cultural', luxuryLevel: 'luxury', travelerType: 'couple',
    season: 'spring', seasonModifier: 'early' }
  ```

- **Just right**: Balance specificity with applicability
  ```typescript
  // GOOD: Specific where it matters
  { tripType: 'cultural', country: 'Japan', season: 'spring',
    seasonModifier: null, // Any time in spring works
    travelerType: null } // Good for any traveler type
  ```

### 2. Temporal Consistency
Match `season` with `temporalType`:

```typescript
// CORRECT
{ temporalType: 'seasonal', season: 'spring' }
{ temporalType: 'evergreen', season: null }

// WRONG
{ temporalType: 'evergreen', season: 'spring' } // Contradictory
```

### 3. Region Hierarchy
Use both region and country when specific:

```typescript
// GOOD: Hierarchical
{ region: 'Europe', country: 'France' }

// OK: Regional only
{ region: 'Asia', country: null }

// AVOID: Country without region (harder to query)
{ region: null, country: 'Japan' }
```

## Performance Metrics

Expected query performance:

| Query Type | Latency | Use Case |
|------------|---------|----------|
| Vector only | ~50ms | General semantic search |
| Category filter only | ~20ms | Browse by category |
| Hybrid (vector + categories) | ~80ms | Personalized search |
| Multi-category AND | ~100ms | Complex filtering |

## Future Enhancements

Planned improvements:

1. **Multi-value categories**: Support arrays for applicable categories
   ```typescript
   tripType: ['cultural', 'leisure'] // Both apply
   ```

2. **Category weights**: Indicate primary vs. secondary categories
   ```typescript
   categories: {
     cultural: 1.0, // Primary
     leisure: 0.5,  // Secondary
   }
   ```

3. **Auto-tagging ML**: Train model to auto-detect categories from content

4. **Category analytics**: Track which combinations are most searched

---

## Summary

The Weaviate category system enables:
- ✅ Precise, personalized knowledge retrieval
- ✅ Faceted search across 7 dimensions
- ✅ Flexible null semantics for broad applicability
- ✅ Hemisphere-aware seasonal detection
- ✅ Budget-based luxury level inference
- ✅ Automated category inference from trip data

**Key Files:**
- Types: `src/domain/types/weaviate.ts`
- Utilities: `src/domain/utils/categories.ts`
- Storage: `src/storage/weaviate-storage.ts`
- Examples: `src/domain/utils/categories.example.ts`

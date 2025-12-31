# Category System Integration Guide

## Quick Start

This guide shows how to integrate the new category system into your existing services.

## 1. Storing Knowledge with Auto-Categories

### From Itinerary Data

```typescript
import { WeaviateStorage } from './storage/weaviate-storage.js';
import { AnonymizerService } from './services/anonymizer.js';
import {
  detectSeason,
  inferLuxuryLevel,
  inferTravelerType,
  detectRegion,
  calculateDailyBudget,
} from './domain/utils/categories.js';
import type { TravelKnowledge } from './domain/types/weaviate.js';
import type { Itinerary } from './domain/types/itinerary.js';

async function extractKnowledgeFromItinerary(
  itinerary: Itinerary,
  content: string,
  storage: WeaviateStorage,
  anonymizer: AnonymizerService
): Promise<void> {
  // Anonymize content
  const anonymizedResult = await anonymizer.anonymize(content);

  // Calculate categories from itinerary metadata
  const dailyBudget = calculateDailyBudget(
    itinerary.budget?.amount || 0,
    itinerary.days.length,
    itinerary.travelers.length
  );

  const seasonInfo = detectSeason(
    itinerary.startDate,
    'northern' // TODO: Detect from destination coordinates
  );

  const travelerProfile = {
    count: itinerary.travelers.length,
    ages: itinerary.travelers.map((t) => t.age).filter(Boolean) as number[],
  };

  const region = itinerary.destination
    ? detectRegion(itinerary.destination)
    : undefined;

  // Create knowledge document
  const knowledge: TravelKnowledge = {
    id: crypto.randomUUID(),
    content: anonymizedResult.content,
    rawContent: content,
    category: 'activity', // Or infer from content
    source: 'trip_designer',
    sessionId: anonymizedResult.sessionId,
    itineraryId: itinerary.id,
    destinationName: itinerary.destination,
    createdAt: new Date(),
    temporalType: 'seasonal', // Or 'evergreen' based on content
    decayHalfLife: 365,
    baseRelevance: 1.0,

    // Auto-detected categories
    luxuryLevel: inferLuxuryLevel(dailyBudget),
    travelerType: inferTravelerType(travelerProfile),
    region,
    country: itinerary.destination?.split(',')[0], // Simple extraction
    season: seasonInfo.season,
    seasonModifier: seasonInfo.modifier,
    tripType: null, // Could infer from itinerary tags/description
  };

  // Store in Weaviate
  await storage.upsertKnowledge([knowledge]);
}
```

### From Trip Designer Chat

```typescript
import { inferTripType } from './domain/utils/categories.js';

async function extractKnowledgeFromChat(
  message: string,
  context: {
    destination?: string;
    budget?: number;
    travelers?: number;
    startDate?: Date;
  }
): Promise<Partial<TravelKnowledge>> {
  // Anonymize
  const anonymized = await anonymizer.anonymize(message);

  // Infer trip type from message content
  const tripType = inferTripType({
    activities: extractActivities(message), // Your extraction logic
    keywords: message.toLowerCase().split(/\s+/),
  });

  return {
    content: anonymized.content,
    rawContent: message,
    category: 'activity',
    source: 'trip_designer',
    tripType,
    luxuryLevel: context.budget ? inferLuxuryLevel(context.budget) : null,
    travelerType: context.travelers ? inferTravelerType({ count: context.travelers }) : null,
    region: context.destination ? detectRegion(context.destination) : undefined,
    season: context.startDate ? detectSeason(context.startDate).season : undefined,
    seasonModifier: context.startDate ? detectSeason(context.startDate).modifier : undefined,
  };
}
```

## 2. Searching with Categories

### Personalized Search

```typescript
import type { KnowledgeSearchFilter } from './domain/types/weaviate.js';

async function searchPersonalizedKnowledge(
  query: string,
  itinerary: Itinerary,
  storage: WeaviateStorage
): Promise<TravelKnowledge[]> {
  // Build filter from itinerary context
  const dailyBudget = calculateDailyBudget(
    itinerary.budget?.amount || 0,
    itinerary.days.length,
    itinerary.travelers.length
  );

  const seasonInfo = detectSeason(itinerary.startDate);

  const filter: KnowledgeSearchFilter = {
    // Match itinerary categories
    luxuryLevel: inferLuxuryLevel(dailyBudget),
    travelerType: inferTravelerType({
      count: itinerary.travelers.length,
      ages: itinerary.travelers.map((t) => t.age).filter(Boolean) as number[],
    }),
    country: itinerary.destination?.split(',')[0],
    season: seasonInfo.season,

    // Only recent/relevant knowledge
    relevantAt: itinerary.startDate,
    minRelevance: 0.7,
  };

  const result = await storage.searchKnowledge(query, 10, filter);

  return result.success ? result.data.knowledge : [];
}
```

### Browse by Category

```typescript
async function browseByCategory(
  category: {
    tripType?: TripType;
    region?: string;
    season?: Season;
  },
  storage: WeaviateStorage
): Promise<TravelKnowledge[]> {
  const result = await storage.searchKnowledge(
    '', // Empty query = browse mode
    50, // More results for browsing
    {
      tripType: category.tripType,
      region: category.region,
      season: category.season,
      // No other filters = show variety
    }
  );

  return result.success ? result.data.knowledge : [];
}
```

## 3. Trip Designer Integration

### Context-Aware Responses

```typescript
import type { TripDesignerContext } from './domain/types/trip-designer.js';

async function getTripDesignerContext(
  itinerary: Itinerary
): Promise<TripDesignerContext & { categoryFilter: KnowledgeSearchFilter }> {
  const dailyBudget = calculateDailyBudget(
    itinerary.budget?.amount || 0,
    itinerary.days.length,
    itinerary.travelers.length
  );

  const seasonInfo = detectSeason(itinerary.startDate);
  const travelerType = inferTravelerType({
    count: itinerary.travelers.length,
  });

  return {
    // Existing context
    itineraryId: itinerary.id,
    destination: itinerary.destination,
    startDate: itinerary.startDate,
    endDate: itinerary.endDate,
    budget: itinerary.budget,
    travelers: itinerary.travelers,

    // New category filter
    categoryFilter: {
      luxuryLevel: inferLuxuryLevel(dailyBudget),
      travelerType,
      region: detectRegion(itinerary.destination || ''),
      country: itinerary.destination?.split(',')[0],
      season: seasonInfo.season,
      seasonModifier: seasonInfo.modifier,
    },
  };
}
```

### Enhanced RAG with Categories

```typescript
async function enhancedRAG(
  query: string,
  context: TripDesignerContext & { categoryFilter: KnowledgeSearchFilter },
  storage: WeaviateStorage
): Promise<string> {
  // Search with both semantic similarity AND category filtering
  const knowledgeResult = await storage.searchKnowledge(
    query,
    5, // Top 5 most relevant
    context.categoryFilter
  );

  if (!knowledgeResult.success) {
    throw new Error('Knowledge search failed');
  }

  // Build enhanced prompt with categorized knowledge
  const relevantKnowledge = knowledgeResult.data.knowledge
    .map((k, i) => {
      const score = knowledgeResult.data.relevanceScores[i];
      return `[${score.toFixed(2)}] ${k.content}`;
    })
    .join('\n');

  const systemPrompt = `
You are a travel expert helping plan a ${context.categoryFilter.luxuryLevel}
${context.categoryFilter.travelerType} trip to ${context.categoryFilter.country}
during ${context.categoryFilter.seasonModifier} ${context.categoryFilter.season}.

Relevant knowledge:
${relevantKnowledge}

Provide personalized recommendations based on this context.
  `;

  // Call LLM with enhanced prompt
  // ... (your LLM call logic)

  return systemPrompt;
}
```

## 4. Migrating Existing Knowledge

### Backfill Script

```typescript
async function migrateExistingKnowledge(storage: WeaviateStorage) {
  const batchSize = 100;
  let offset = 0;

  while (true) {
    // Fetch batch
    const result = await storage.list('knowledge', batchSize, offset);
    if (!result.success || result.data.length === 0) break;

    // Process each knowledge document
    const updated: TravelKnowledge[] = [];

    for (const doc of result.data) {
      // Convert to TravelKnowledge (if needed)
      const knowledge = doc as unknown as TravelKnowledge;

      // Skip if already categorized
      if (knowledge.region || knowledge.tripType) {
        continue;
      }

      // Infer categories
      const region = knowledge.destinationName
        ? detectRegion(knowledge.destinationName)
        : undefined;

      const tripType = inferTripType({
        keywords: knowledge.content.toLowerCase().split(/\s+/),
      });

      // Update with inferred categories
      updated.push({
        ...knowledge,
        region,
        tripType,
        // Leave other categories as null for broad applicability
        luxuryLevel: null,
        travelerType: null,
        season: null,
        seasonModifier: null,
      });
    }

    // Batch update
    if (updated.length > 0) {
      await storage.upsertKnowledge(updated);
      console.log(`Migrated ${updated.length} knowledge documents`);
    }

    offset += batchSize;
  }

  console.log('Migration complete');
}
```

## 5. Testing Categories

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { detectSeason, inferLuxuryLevel } from './domain/utils/categories.js';

describe('Category utilities', () => {
  it('detects early spring correctly', () => {
    const result = detectSeason(new Date('2024-03-05'), 'northern');
    expect(result.season).toBe('spring');
    expect(result.modifier).toBe('early');
  });

  it('detects southern hemisphere seasons', () => {
    const result = detectSeason(new Date('2024-12-15'), 'southern');
    expect(result.season).toBe('summer');
    expect(result.modifier).toBe('mid');
  });

  it('infers luxury level from budget', () => {
    expect(inferLuxuryLevel(50)).toBe('budget');
    expect(inferLuxuryLevel(200)).toBe('moderate');
    expect(inferLuxuryLevel(500)).toBe('luxury');
    expect(inferLuxuryLevel(1000)).toBe('ultra-luxury');
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { WeaviateStorage } from './storage/weaviate-storage.js';
import type { TravelKnowledge } from './domain/types/weaviate.js';

describe('Weaviate category search', () => {
  let storage: WeaviateStorage;

  beforeAll(async () => {
    storage = new WeaviateStorage({
      url: process.env.WEAVIATE_URL!,
      apiKey: process.env.WEAVIATE_API_KEY!,
    });
    await storage.initialize();
  });

  it('filters by trip type', async () => {
    const result = await storage.searchKnowledge('activities', 10, {
      tripType: 'cultural',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      result.data.knowledge.forEach((k) => {
        // Should be cultural or null (universal)
        expect(k.tripType === 'cultural' || k.tripType === null).toBe(true);
      });
    }
  });

  it('filters by multiple categories', async () => {
    const result = await storage.searchKnowledge('restaurants', 10, {
      luxuryLevel: 'luxury',
      travelerType: 'couple',
      country: 'France',
    });

    expect(result.success).toBe(true);
  });
});
```

## 6. Performance Optimization

### Category Caching

```typescript
class CategoryCache {
  private cache = new Map<string, { region?: string; tripType?: TripType }>();

  getCachedCategories(content: string) {
    return this.cache.get(content);
  }

  setCachedCategories(
    content: string,
    categories: { region?: string; tripType?: TripType }
  ) {
    // LRU cache (limit size)
    if (this.cache.size > 10000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(content, categories);
  }
}
```

### Batch Categorization

```typescript
async function batchCategorize(
  knowledgeList: Partial<TravelKnowledge>[],
  itinerary: Itinerary
): Promise<TravelKnowledge[]> {
  // Compute shared categories once
  const sharedCategories = {
    luxuryLevel: inferLuxuryLevel(
      calculateDailyBudget(
        itinerary.budget?.amount || 0,
        itinerary.days.length,
        itinerary.travelers.length
      )
    ),
    travelerType: inferTravelerType({ count: itinerary.travelers.length }),
    region: detectRegion(itinerary.destination || ''),
    season: detectSeason(itinerary.startDate).season,
    seasonModifier: detectSeason(itinerary.startDate).modifier,
  };

  // Apply to all knowledge in batch
  return knowledgeList.map((k) => ({
    ...k,
    ...sharedCategories,
    // Individual categories (if any)
    tripType: k.tripType || inferTripType({ keywords: k.content?.split(/\s+/) || [] }),
  })) as TravelKnowledge[];
}
```

## 7. Analytics

### Category Usage Tracking

```typescript
interface CategorySearchMetrics {
  categoryUsage: Record<string, number>;
  topCombinations: Array<{ filter: KnowledgeSearchFilter; count: number }>;
}

async function trackCategorySearch(filter: KnowledgeSearchFilter) {
  // Track which categories are most used
  const categories = Object.entries(filter)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key]) => key);

  // Log to analytics
  analytics.track('category_search', {
    categories,
    combination: JSON.stringify(filter),
  });
}
```

## Summary

The category system integrates seamlessly with existing services:

1. **Auto-categorize** knowledge during storage
2. **Filter searches** by category for personalization
3. **Enhance RAG** with category-aware context
4. **Migrate existing** data with inference utilities
5. **Test thoroughly** with unit and integration tests
6. **Optimize** with caching and batching
7. **Track usage** for continuous improvement

All utilities are type-safe and follow the project's TypeScript best practices.

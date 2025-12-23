/**
 * Usage examples for category utilities
 * @module domain/utils/categories.example
 */

import type { TravelKnowledge } from '../types/weaviate.js';
import {
  detectSeason,
  inferLuxuryLevel,
  inferTravelerType,
  inferTripType,
  detectRegion,
  calculateDailyBudget,
} from './categories.js';

/**
 * Example: Creating a knowledge document with auto-detected categories
 */
export function exampleCherryBlossomKnowledge(): Partial<TravelKnowledge> {
  // Trip details
  const tripDate = new Date('2024-03-25'); // Late March
  const dailyBudget = 250; // Moderate budget
  const travelerCount = 2; // Couple

  // Detect categories
  const seasonInfo = detectSeason(tripDate, 'northern');
  const luxuryLevel = inferLuxuryLevel(dailyBudget);
  const travelerType = inferTravelerType({ count: travelerCount, ages: [30, 32] });
  const tripType = inferTripType({
    activities: ['Cherry blossom viewing', 'Temple visits', 'Tea ceremony'],
    purpose: 'Cultural exploration',
    keywords: ['cultural', 'heritage', 'traditional'],
  });
  const region = detectRegion('Japan');

  return {
    content: 'Cherry blossom viewing in [LOCATION] during [PERIOD]',
    rawContent: 'Cherry blossom viewing in Tokyo during late spring',
    category: 'activity',
    tripType,
    luxuryLevel,
    travelerType,
    region,
    country: 'Japan',
    season: seasonInfo.season,
    seasonModifier: seasonInfo.modifier,
    temporalType: 'seasonal',
  };
}

/**
 * Example: Budget-based luxury family trip to Europe
 */
export function exampleFamilyEuropeKnowledge(): Partial<TravelKnowledge> {
  const totalBudget = 15000; // Total trip budget
  const days = 14; // 2 weeks
  const travelers = 4; // 2 adults, 2 children

  const dailyBudget = calculateDailyBudget(totalBudget, days, travelers);
  const luxuryLevel = inferLuxuryLevel(dailyBudget); // ~$267/day = moderate
  const travelerType = inferTravelerType({
    count: travelers,
    ages: [38, 36, 10, 8],
    relationship: 'family',
  });

  return {
    content: 'Family-friendly [ACTIVITY] in [LOCATION]',
    rawContent: 'Family-friendly museums in Paris',
    category: 'activity',
    tripType: 'cultural',
    luxuryLevel,
    travelerType,
    region: 'Europe',
    country: 'France',
    temporalType: 'evergreen',
  };
}

/**
 * Example: Luxury solo adventure in South America
 */
export function exampleAdventurePatagoniaKnowledge(): Partial<TravelKnowledge> {
  const tripDate = new Date('2024-12-15'); // Mid December (summer in southern hemisphere)
  const dailyBudget = 850; // Luxury
  const seasonInfo = detectSeason(tripDate, 'southern'); // Southern hemisphere

  return {
    content: 'Glacier trekking in [LOCATION] during [PERIOD]',
    rawContent: 'Glacier trekking in Patagonia during mid summer',
    category: 'activity',
    tripType: 'adventure',
    luxuryLevel: inferLuxuryLevel(dailyBudget),
    travelerType: inferTravelerType({ count: 1 }),
    region: 'South America',
    country: 'Argentina',
    season: seasonInfo.season,
    seasonModifier: seasonInfo.modifier,
    temporalType: 'seasonal',
  };
}

/**
 * Example: Ultra-luxury couple relaxation in Maldives
 */
export function exampleLuxuryMaldivesKnowledge(): Partial<TravelKnowledge> {
  return {
    content: 'Overwater villa experience in [LOCATION]',
    rawContent: 'Overwater villa experience in Maldives',
    category: 'activity',
    tripType: 'relaxation',
    luxuryLevel: 'ultra-luxury',
    travelerType: 'couple',
    region: 'Asia',
    country: 'Maldives',
    temporalType: 'evergreen',
  };
}

/**
 * Example: Universal knowledge (applicable to all categories)
 */
export function exampleUniversalKnowledge(): Partial<TravelKnowledge> {
  return {
    content: 'Always carry a photocopy of your passport separately',
    rawContent: 'Always carry a photocopy of your passport separately',
    category: 'tip',
    tripType: undefined, // Applicable to all trip types
    luxuryLevel: undefined, // Applicable to all luxury levels
    travelerType: undefined, // Applicable to all traveler types
    region: undefined, // Universal tip
    country: undefined,
    temporalType: 'evergreen',
  };
}

/**
 * Example: Seasonal knowledge with multiple categories
 */
export function exampleSeasonalEventKnowledge(): Partial<TravelKnowledge> {
  const eventDate = new Date('2024-10-31'); // Late October

  return {
    content: 'Oktoberfest celebrations in [LOCATION] during [PERIOD]',
    rawContent: 'Oktoberfest celebrations in Munich during late fall',
    category: 'event',
    tripType: 'cultural', // Could also be leisure
    luxuryLevel: undefined, // Various budget options available
    travelerType: undefined, // Popular with all traveler types
    region: 'Europe',
    country: 'Germany',
    season: 'fall',
    seasonModifier: 'late',
    temporalType: 'event',
    relevantFrom: new Date('2024-09-21'),
    relevantUntil: new Date('2024-10-06'),
  };
}

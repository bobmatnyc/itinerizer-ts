/**
 * Trip type taxonomy and profile inference
 * @module domain/types/trip-taxonomy
 */

import type { Segment } from './segment.js';
import { isFlightSegment, isHotelSegment, isActivitySegment } from './segment.js';
import { CabinClass } from './common.js';

/**
 * Primary trip category classification
 */
export type TripCategory =
  | 'family'      // Kid-friendly, moderate pace
  | 'luxury'      // High-end, premium everything
  | 'business'    // Efficient, professional
  | 'budget'      // Cost-conscious
  | 'romantic'    // Couples, intimate experiences
  | 'adventure'   // Active, outdoor activities
  | 'cultural'    // Museums, historical sites
  | 'relaxation'  // Spa, beach, slow pace
  | 'solo'        // Independent travel
  | 'group';      // Large party coordination

/**
 * Budget level classification
 */
export type BudgetLevel = 'budget' | 'moderate' | 'premium' | 'luxury';

/**
 * Travel pace classification
 */
export type TravelPace = 'relaxed' | 'moderate' | 'active';

/**
 * Accommodation type preference
 */
export type AccommodationType = 'hostel' | 'hotel' | 'resort' | 'vacation-rental';

/**
 * Dining preference
 */
export type DiningPreference = 'local' | 'mixed' | 'fine-dining';

/**
 * Traveler composition
 */
export interface TravelerComposition {
  /** Number of adults */
  adults: number;
  /** Number of children (optional) */
  children?: number;
  /** Number of seniors (optional) */
  seniors?: number;
}

/**
 * Budget information
 */
export interface BudgetInfo {
  /** Budget level */
  level: BudgetLevel;
  /** Daily budget per person (optional) */
  dailyBudget?: number;
  /** Currency code (ISO 4217) */
  currency?: string;
}

/**
 * Trip planning preferences
 */
export interface TripPlanningPreferences {
  /** Travel pace */
  pace: TravelPace;
  /** Preferred accommodation type */
  accommodation: AccommodationType;
  /** Dining preferences */
  dining: DiningPreference;
  /** Activity interests */
  activities: string[];
}

/**
 * Complete trip profile for intelligent planning
 */
export interface TripProfile {
  /** Primary trip category */
  primaryType: TripCategory;
  /** Secondary trip categories (optional) */
  secondaryTypes?: TripCategory[];
  /** Traveler composition */
  travelers: TravelerComposition;
  /** Budget information (optional) */
  budget?: BudgetInfo;
  /** Trip planning preferences (optional) */
  preferences?: TripPlanningPreferences;
}

/**
 * Luxury brand indicators for hotels
 */
const LUXURY_HOTEL_BRANDS = [
  'four seasons',
  'ritz carlton',
  'st regis',
  'peninsula',
  'mandarin oriental',
  'aman',
  'rosewood',
  'bulgari',
  'park hyatt',
];

/**
 * Premium/upscale brand indicators
 */
const PREMIUM_HOTEL_BRANDS = [
  'marriott',
  'hilton',
  'hyatt',
  'intercontinental',
  'westin',
  'sheraton',
  'renaissance',
  'fairmont',
  'grand hyatt',
];

/**
 * Budget/economy brand indicators
 */
const BUDGET_HOTEL_BRANDS = [
  'holiday inn',
  'courtyard',
  'hampton inn',
  'comfort inn',
  'best western',
  'days inn',
  'la quinta',
  'super 8',
];

/**
 * Activity keywords for trip category classification
 */
const ACTIVITY_KEYWORDS: Record<TripCategory, string[]> = {
  family: ['kids', 'children', 'family', 'playground', 'theme park', 'aquarium', 'zoo'],
  luxury: ['spa', 'michelin', 'private', 'exclusive', 'vip', 'butler', 'concierge'],
  business: ['conference', 'meeting', 'convention', 'seminar', 'networking', 'presentation'],
  budget: ['hostel', 'budget', 'backpack', 'cheap', 'affordable', 'economy'],
  romantic: ['honeymoon', 'couples', 'romantic', 'anniversary', 'sunset', 'candlelight'],
  adventure: ['hiking', 'climbing', 'diving', 'safari', 'trek', 'mountain', 'kayak', 'surf'],
  cultural: ['museum', 'gallery', 'historic', 'heritage', 'temple', 'cathedral', 'ruins'],
  relaxation: ['beach', 'spa', 'massage', 'yoga', 'wellness', 'resort', 'relax'],
  solo: ['solo', 'backpack', 'independent', 'self-guided'],
  group: ['group', 'tour', 'party', 'reunion', 'wedding'],
};

/**
 * Infer trip profile from existing segments
 * @param segments - Array of segments to analyze
 * @returns Inferred trip profile
 */
export function inferTripProfile(segments: Segment[]): TripProfile {
  const flights = segments.filter(isFlightSegment);
  const hotels = segments.filter(isHotelSegment);
  const activities = segments.filter(isActivitySegment);

  // Infer budget level from flight cabin class and hotel brands
  const budget = inferBudgetLevel(flights, hotels);

  // Infer trip type from activities and segment content
  const tripTypes = inferTripTypes(segments);

  // Infer traveler composition (default to 1 adult for now)
  const travelers: TravelerComposition = {
    adults: 1, // Default - would need traveler data to determine accurately
  };

  // Infer pace from density of activities
  const pace = inferTravelPace(segments);

  // Infer accommodation preference from hotels
  const accommodation = inferAccommodationType(hotels);

  // Infer dining preference from budget level
  const dining = inferDiningPreference(budget.level);

  // Extract activity keywords
  const activityKeywords = extractActivityKeywords(activities);

  return {
    primaryType: tripTypes[0] || ('business' as TripCategory),
    secondaryTypes: tripTypes.slice(1),
    travelers,
    budget,
    preferences: {
      pace,
      accommodation,
      dining,
      activities: activityKeywords,
    },
  };
}

/**
 * Infer budget level from flights and hotels
 */
function inferBudgetLevel(
  flights: Segment[],
  hotels: Segment[]
): BudgetInfo {
  let budgetScore = 0;
  let count = 0;

  // Score flights based on cabin class
  for (const flight of flights) {
    if (!isFlightSegment(flight) || !flight.cabinClass) continue;

    switch (flight.cabinClass) {
      case CabinClass.FIRST:
        budgetScore += 4;
        break;
      case CabinClass.BUSINESS:
        budgetScore += 3;
        break;
      case CabinClass.PREMIUM_ECONOMY:
        budgetScore += 2;
        break;
      case CabinClass.ECONOMY:
        budgetScore += 1;
        break;
    }
    count++;
  }

  // Score hotels based on brand recognition
  for (const hotel of hotels) {
    if (!isHotelSegment(hotel)) continue;

    const propertyName = hotel.property.name.toLowerCase();

    if (LUXURY_HOTEL_BRANDS.some(brand => propertyName.includes(brand))) {
      budgetScore += 4;
      count++;
    } else if (PREMIUM_HOTEL_BRANDS.some(brand => propertyName.includes(brand))) {
      budgetScore += 2;
      count++;
    } else if (BUDGET_HOTEL_BRANDS.some(brand => propertyName.includes(brand))) {
      budgetScore += 1;
      count++;
    }
  }

  // Calculate average score
  const avgScore = count > 0 ? budgetScore / count : 1.5;

  // Map score to budget level
  let level: BudgetLevel;
  if (avgScore >= 3.5) {
    level = 'luxury';
  } else if (avgScore >= 2.5) {
    level = 'premium';
  } else if (avgScore >= 1.5) {
    level = 'moderate';
  } else {
    level = 'budget';
  }

  return { level };
}

/**
 * Infer trip categories from segment content
 */
function inferTripTypes(segments: Segment[]): TripCategory[] {
  const typeScores: Record<TripCategory, number> = {
    family: 0,
    luxury: 0,
    business: 0,
    budget: 0,
    romantic: 0,
    adventure: 0,
    cultural: 0,
    relaxation: 0,
    solo: 0,
    group: 0,
  };

  // Analyze each segment for keywords
  for (const segment of segments) {
    const segmentText = JSON.stringify(segment).toLowerCase();

    for (const [type, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (segmentText.includes(keyword)) {
          typeScores[type as TripCategory]++;
        }
      }
    }
  }

  // Sort by score and return top types
  const sortedTypes = (Object.entries(typeScores) as [TripCategory, number][])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);

  // Default to 'business' if no clear indicators
  return sortedTypes.length > 0 ? sortedTypes : ['business'];
}

/**
 * Infer travel pace from activity density
 */
function inferTravelPace(segments: Segment[]): TravelPace {
  if (segments.length === 0) return 'moderate';

  // Calculate activities per day
  const activities = segments.filter(isActivitySegment);

  // Estimate trip duration in days
  const dates = segments
    .map(s => s.startDatetime)
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length < 2) return 'moderate';

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  if (!firstDate || !lastDate) return 'moderate';

  const durationDays = Math.ceil(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (durationDays === 0) return 'moderate';

  const activitiesPerDay = activities.length / durationDays;

  if (activitiesPerDay >= 3) return 'active';
  if (activitiesPerDay >= 1.5) return 'moderate';
  return 'relaxed';
}

/**
 * Infer accommodation type from hotel segments
 */
function inferAccommodationType(hotels: Segment[]): AccommodationType {
  if (hotels.length === 0) return 'hotel';

  for (const hotel of hotels) {
    if (!isHotelSegment(hotel)) continue;

    const propertyName = hotel.property.name.toLowerCase();

    if (propertyName.includes('hostel')) return 'hostel';
    if (propertyName.includes('resort')) return 'resort';
    if (propertyName.includes('apartment') || propertyName.includes('rental')) {
      return 'vacation-rental';
    }
  }

  return 'hotel';
}

/**
 * Infer dining preference from budget level
 */
function inferDiningPreference(budgetLevel: BudgetLevel): DiningPreference {
  switch (budgetLevel) {
    case 'luxury':
      return 'fine-dining';
    case 'premium':
      return 'mixed';
    case 'moderate':
      return 'mixed';
    case 'budget':
      return 'local';
  }
}

/**
 * Extract activity keywords from activity segments
 */
function extractActivityKeywords(activities: Segment[]): string[] {
  const keywords = new Set<string>();

  for (const activity of activities) {
    if (!isActivitySegment(activity)) continue;

    const activityText = (activity.name + ' ' + (activity.description || '')).toLowerCase();

    // Extract meaningful words (filter out common words)
    const words = activityText.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word)) {
        keywords.add(word);
      }
    }
  }

  return Array.from(keywords).slice(0, 10); // Return top 10 keywords
}

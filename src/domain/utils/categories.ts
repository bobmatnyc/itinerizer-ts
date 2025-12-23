/**
 * Category utilities for trip categorization
 * @module domain/utils/categories
 */

import type {
  TripType,
  LuxuryLevel,
  TravelerType,
  Season,
  SeasonModifier,
} from '../types/weaviate.js';
import { Season as SeasonEnum, SeasonModifier as SeasonModifierEnum } from '../types/weaviate.js';

/**
 * Season detection result
 */
export interface SeasonInfo {
  season: Season;
  modifier: SeasonModifier;
}

/**
 * Hemisphere for season detection
 */
export type Hemisphere = 'northern' | 'southern';

/**
 * Detect season from a date with modifier
 * @param date - Date to detect season from
 * @param hemisphere - Northern or southern hemisphere (default: northern)
 * @returns Season and modifier (early/mid/late)
 */
export function detectSeason(date: Date, hemisphere: Hemisphere = 'northern'): SeasonInfo {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  // Determine modifier: early (1-10), mid (11-20), late (21-31)
  const modifier: SeasonModifier =
    day <= 10 ? SeasonModifierEnum.EARLY : day <= 20 ? SeasonModifierEnum.MID : SeasonModifierEnum.LATE;

  // Northern hemisphere seasons
  if (hemisphere === 'northern') {
    // Spring: March, April, May (months 2, 3, 4)
    if (month >= 2 && month <= 4) {
      return { season: SeasonEnum.SPRING, modifier };
    }
    // Summer: June, July, August (months 5, 6, 7)
    if (month >= 5 && month <= 7) {
      return { season: SeasonEnum.SUMMER, modifier };
    }
    // Fall: September, October, November (months 8, 9, 10)
    if (month >= 8 && month <= 10) {
      return { season: SeasonEnum.FALL, modifier };
    }
    // Winter: December, January, February (months 11, 0, 1)
    return { season: SeasonEnum.WINTER, modifier };
  } else {
    // Southern hemisphere (opposite seasons)
    // Fall: March, April, May
    if (month >= 2 && month <= 4) {
      return { season: SeasonEnum.FALL, modifier };
    }
    // Winter: June, July, August
    if (month >= 5 && month <= 7) {
      return { season: SeasonEnum.WINTER, modifier };
    }
    // Spring: September, October, November
    if (month >= 8 && month <= 10) {
      return { season: SeasonEnum.SPRING, modifier };
    }
    // Summer: December, January, February
    return { season: SeasonEnum.SUMMER, modifier };
  }
}

/**
 * Infer luxury level from daily budget
 * @param dailyBudget - Daily budget per person in USD
 * @returns Luxury level
 */
export function inferLuxuryLevel(dailyBudget: number): LuxuryLevel {
  if (dailyBudget < 100) {
    return 'budget';
  }
  if (dailyBudget < 300) {
    return 'moderate';
  }
  if (dailyBudget < 800) {
    return 'luxury';
  }
  return 'ultra-luxury';
}

/**
 * Traveler profile for type inference
 */
export interface TravelerProfile {
  /** Number of travelers */
  count: number;
  /** Ages of travelers (if known) */
  ages?: number[];
  /** Relationship (if known) */
  relationship?: 'family' | 'couple' | 'friends';
}

/**
 * Infer traveler type from traveler count and profile
 * @param profile - Traveler profile
 * @returns Traveler type
 */
export function inferTravelerType(profile: TravelerProfile): TravelerType {
  // Explicit relationship
  if (profile.relationship === 'family') {
    return 'family';
  }
  if (profile.relationship === 'couple') {
    return 'couple';
  }
  if (profile.relationship === 'friends') {
    return 'friends';
  }

  // Infer from count
  if (profile.count === 1) {
    return 'solo';
  }
  if (profile.count === 2) {
    // Check ages to determine if likely couple
    if (profile.ages && profile.ages.length === 2) {
      const ageDiff = Math.abs(profile.ages[0] - profile.ages[1]);
      // If ages are close (within 10 years) and both adults, likely couple
      if (ageDiff <= 10 && profile.ages.every((age) => age >= 18)) {
        return 'couple';
      }
    }
    // Default to couple for 2 travelers
    return 'couple';
  }

  // Check if family (presence of children)
  if (profile.ages && profile.ages.some((age) => age < 18)) {
    return 'family';
  }

  // 3-5 people likely friends
  if (profile.count >= 3 && profile.count <= 5) {
    return 'friends';
  }

  // 6+ people is a group
  return 'group';
}

/**
 * Trip characteristics for type inference
 */
export interface TripCharacteristics {
  /** Primary activities */
  activities?: string[];
  /** Purpose of trip */
  purpose?: string;
  /** Keywords from trip description */
  keywords?: string[];
}

/**
 * Infer trip type from characteristics
 * @param characteristics - Trip characteristics
 * @returns Trip type (or null if cannot infer)
 */
export function inferTripType(characteristics: TripCharacteristics): TripType | null {
  const allText = [
    ...(characteristics.activities || []),
    characteristics.purpose || '',
    ...(characteristics.keywords || []),
  ]
    .join(' ')
    .toLowerCase();

  // Business indicators
  if (
    /\b(business|conference|meeting|work|corporate|professional)\b/.test(allText)
  ) {
    return 'business';
  }

  // Adventure indicators
  if (
    /\b(adventure|hiking|climbing|safari|trekking|diving|rafting|outdoor|extreme)\b/.test(
      allText
    )
  ) {
    return 'adventure';
  }

  // Cultural indicators
  if (
    /\b(cultural|museum|heritage|history|temple|monument|art|gallery|historic)\b/.test(
      allText
    )
  ) {
    return 'cultural';
  }

  // Relaxation indicators
  if (
    /\b(relaxation|spa|wellness|beach|resort|retreat|zen|meditation|peaceful)\b/.test(
      allText
    )
  ) {
    return 'relaxation';
  }

  // Leisure (default for vacation-like terms)
  if (/\b(leisure|vacation|holiday|sightseeing|tourism|tour)\b/.test(allText)) {
    return 'leisure';
  }

  // Cannot determine
  return null;
}

/**
 * Detect region from country name
 * @param country - Country name
 * @returns Geographic region
 */
export function detectRegion(country: string): string | undefined {
  const countryLower = country.toLowerCase();

  // Asia
  if (
    /\b(japan|china|korea|thailand|vietnam|indonesia|malaysia|singapore|philippines|india|nepal|pakistan|bangladesh|sri lanka|cambodia|laos|myanmar|taiwan|hong kong|mongolia)\b/.test(
      countryLower
    )
  ) {
    return 'Asia';
  }

  // Europe
  if (
    /\b(france|germany|italy|spain|portugal|uk|united kingdom|england|scotland|wales|ireland|greece|netherlands|belgium|switzerland|austria|poland|czech|hungary|norway|sweden|denmark|finland|iceland|croatia|romania|bulgaria)\b/.test(
      countryLower
    )
  ) {
    return 'Europe';
  }

  // North America
  if (
    /\b(usa|united states|america|canada|mexico|panama|costa rica|guatemala|belize|honduras|nicaragua|el salvador)\b/.test(
      countryLower
    )
  ) {
    return 'North America';
  }

  // South America
  if (
    /\b(brazil|argentina|chile|peru|colombia|venezuela|ecuador|bolivia|paraguay|uruguay|guyana|suriname)\b/.test(
      countryLower
    )
  ) {
    return 'South America';
  }

  // Africa
  if (
    /\b(egypt|morocco|south africa|kenya|tanzania|ethiopia|nigeria|ghana|senegal|tunisia|algeria|uganda|rwanda|zimbabwe|botswana|namibia|zambia)\b/.test(
      countryLower
    )
  ) {
    return 'Africa';
  }

  // Oceania
  if (
    /\b(australia|new zealand|fiji|samoa|tonga|papua new guinea|solomon islands|vanuatu)\b/.test(
      countryLower
    )
  ) {
    return 'Oceania';
  }

  // Middle East
  if (
    /\b(uae|dubai|emirates|qatar|saudi arabia|bahrain|kuwait|oman|jordan|israel|lebanon|turkey|iran)\b/.test(
      countryLower
    )
  ) {
    return 'Middle East';
  }

  return undefined;
}

/**
 * Calculate daily budget from total budget and duration
 * @param totalBudget - Total trip budget
 * @param days - Number of days
 * @param travelers - Number of travelers
 * @returns Daily budget per person
 */
export function calculateDailyBudget(
  totalBudget: number,
  days: number,
  travelers: number
): number {
  if (days <= 0 || travelers <= 0) {
    return 0;
  }
  return totalBudget / days / travelers;
}

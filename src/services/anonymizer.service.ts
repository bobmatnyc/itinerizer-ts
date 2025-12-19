/**
 * Content anonymization service for PII removal
 * @module services/anonymizer
 */

import { createHash } from 'node:crypto';
import { ok, err } from '../core/result.js';
import type { Result } from '../core/result.js';
import { createValidationError } from '../core/errors.js';
import type { ValidationError } from '../core/errors.js';
import type {
  AnonymizationResult,
  AnonymizationConfig,
  PIIType,
  BudgetCategory,
} from '../domain/types/knowledge.js';

/**
 * Default anonymization configuration
 */
const DEFAULT_CONFIG: Required<AnonymizationConfig> = {
  removeNames: true,
  removeEmails: true,
  removePhones: true,
  removeAddresses: true,
  generalizeDates: true,
  generalizeLocations: true,
  categorizeBudgets: true,
};

/**
 * Service for anonymizing content before storage in knowledge graph
 */
export class AnonymizerService {
  private config: Required<AnonymizationConfig>;

  constructor(config?: AnonymizationConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Anonymize text content, removing PII and generalizing sensitive information
   */
  anonymize(text: string): Result<AnonymizationResult, ValidationError> {
    if (!text || text.trim().length === 0) {
      return err(createValidationError('INVALID_DATA', 'Text cannot be empty', 'text'));
    }

    let anonymized = text;
    const piiTypes = new Set<PIIType>();
    let piiCount = 0;

    // Generate hash of original content
    const originalHash = this.hashContent(text);

    // 1. Remove email addresses
    if (this.config.removeEmails) {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emailMatches = anonymized.match(emailRegex);
      if (emailMatches && emailMatches.length > 0) {
        anonymized = anonymized.replace(emailRegex, '[EMAIL]');
        piiTypes.add('email');
        piiCount += emailMatches.length;
      }
    }

    // 2. Remove phone numbers (various formats) - must be BEFORE credit card removal
    if (this.config.removePhones) {
      // Match phone numbers but not credit cards (phone numbers have separators or parentheses)
      const phoneRegex =
        /(\+?\d{1,3}[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}|\b\d{3}-\d{3}-\d{4}\b/g;
      const phoneMatches = anonymized.match(phoneRegex);
      if (phoneMatches && phoneMatches.length > 0) {
        anonymized = anonymized.replace(phoneRegex, '[PHONE]');
        piiTypes.add('phone');
        piiCount += phoneMatches.length;
      }
    }

    // 3. Remove credit card numbers
    const ccRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
    const ccMatches = anonymized.match(ccRegex);
    if (ccMatches && ccMatches.length > 0) {
      anonymized = anonymized.replace(ccRegex, '[CARD]');
      piiTypes.add('credit_card');
      piiCount += ccMatches.length;
    }

    // 4. Remove SSN patterns
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    const ssnMatches = anonymized.match(ssnRegex);
    if (ssnMatches && ssnMatches.length > 0) {
      anonymized = anonymized.replace(ssnRegex, '[SSN]');
      piiTypes.add('ssn');
      piiCount += ssnMatches.length;
    }

    // 5. Generalize specific addresses
    if (this.config.removeAddresses) {
      // Street addresses with numbers
      const addressRegex = /\b\d+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi;
      const addressMatches = anonymized.match(addressRegex);
      if (addressMatches && addressMatches.length > 0) {
        anonymized = anonymized.replace(addressRegex, '[ADDRESS]');
        piiTypes.add('address');
        piiCount += addressMatches.length;
      }
    }

    // 6. Remove common name patterns (with "my wife/husband/friend [Name]" or "I'm/I am [Name]")
    if (this.config.removeNames) {
      // Pattern: "my wife/husband/partner/friend [Name]" - must come FIRST
      const relationshipNameRegex =
        /\b(my|our)\s+(wife|husband|partner|friend|colleague|son|daughter|mother|father|parent|child)\s+([A-Z][a-z]+)\b/gi;
      if (relationshipNameRegex.test(anonymized)) {
        anonymized = anonymized.replace(
          relationshipNameRegex,
          (match, possessive, relation, name) => {
            piiTypes.add('name');
            piiCount++;
            return `${possessive} ${relation}`;
          }
        );
      }

      // Pattern: "[Name] and I" or "me and [Name]"
      const coupleTravelRegex = /\b([A-Z][a-z]+)\s+and\s+(I|me)\b/g;
      if (coupleTravelRegex.test(anonymized)) {
        anonymized = anonymized.replace(coupleTravelRegex, (match, name, pronoun) => {
          piiTypes.add('name');
          piiCount++;
          return `my travel companion and ${pronoun}`;
        });
      }

      // Pattern: "I'm [Name]" or "I am [Name]"
      const selfIntroRegex = /\b(I'm|I am)\s+([A-Z][a-z]+)\b/g;
      if (selfIntroRegex.test(anonymized)) {
        anonymized = anonymized.replace(selfIntroRegex, () => {
          piiTypes.add('name');
          piiCount++;
          return 'I';
        });
      }
    }

    // 7. Generalize specific dates to periods
    if (this.config.generalizeDates) {
      anonymized = this.generalizeDates(anonymized, piiTypes);
    }

    // 8. Generalize locations to region level when in personal context
    if (this.config.generalizeLocations) {
      anonymized = this.generalizeLocations(anonymized, piiTypes);
    }

    // 9. Categorize budget amounts
    if (this.config.categorizeBudgets) {
      anonymized = this.categorizeBudgets(anonymized);
    }

    return ok({
      anonymized: anonymized.trim(),
      piiRemoved: piiCount,
      piiTypes: Array.from(piiTypes),
      originalHash,
    });
  }

  /**
   * Generalize dates to time periods
   */
  private generalizeDates(text: string, piiTypes: Set<PIIType>): string {
    let result = text;

    // Month day, year format (e.g., "March 15, 2025")
    const monthDayYearRegex =
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g;
    if (monthDayYearRegex.test(result)) {
      result = result.replace(monthDayYearRegex, (match) => {
        const monthMatch = match.match(/^([A-Z][a-z]+)/);
        const month = monthMatch ? monthMatch[1] : 'a month';
        const dayNum = parseInt(match.match(/\d{1,2}/)?.[0] || '15', 10);

        let period: string;
        if (dayNum <= 10) {
          period = `early ${month}`;
        } else if (dayNum <= 20) {
          period = `mid-${month}`;
        } else {
          period = `late ${month}`;
        }

        piiTypes.add('date');
        return period;
      });
    }

    // Numeric date formats (MM/DD/YYYY or DD/MM/YYYY)
    const numericDateRegex = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
    if (numericDateRegex.test(result)) {
      result = result.replace(numericDateRegex, (match, p1, p2, p3) => {
        const month = parseInt(p1, 10);
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        const monthName = monthNames[month - 1] || 'a month';
        piiTypes.add('date');
        return monthName;
      });
    }

    // ISO date formats (YYYY-MM-DD)
    const isoDateRegex = /\b\d{4}-\d{2}-\d{2}\b/g;
    if (isoDateRegex.test(result)) {
      result = result.replace(isoDateRegex, () => {
        piiTypes.add('date');
        return 'a specific date';
      });
    }

    return result;
  }

  /**
   * Generalize locations to region level when in personal context
   */
  private generalizeLocations(text: string, piiTypes: Set<PIIType>): string {
    let result = text;

    // Personal address patterns (e.g., "from 123 Main St, Boston")
    // Note: This runs AFTER address removal, so it catches remaining location context
    const personalAddressRegex =
      /\b(from|at|live|living|staying|based)\s+\[ADDRESS\],?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    if (personalAddressRegex.test(result)) {
      result = result.replace(
        personalAddressRegex,
        (match, preposition, city) => {
          piiTypes.add('location');
          return `${preposition} ${city} area`;
        }
      );
    }

    // Airport codes are okay to keep as they're not personally identifiable
    // Destination cities are okay to keep as they're the point of travel planning

    return result;
  }

  /**
   * Categorize budget amounts into ranges
   */
  private categorizeBudgets(text: string): string {
    let result = text;

    // Pattern: "$X,XXX" or "$X" or "X dollars"
    const budgetRegex = /\$(\d{1,}(?:,\d{3})*(?:\.\d{2})?)|(\d{1,}(?:,\d{3})*)\s*dollars?/gi;

    result = result.replace(budgetRegex, (match, dollarAmount, numberAmount) => {
      const numStr = dollarAmount || numberAmount;
      if (!numStr) return match;

      const amount = parseInt(numStr.replace(/,/g, ''), 10);
      const category = this.categorizeAmount(amount);
      return `${category} budget`;
    });

    return result;
  }

  /**
   * Categorize a dollar amount into a budget category
   */
  private categorizeAmount(amount: number): BudgetCategory {
    if (amount < 2000) {
      return 'budget';
    } else if (amount < 5000) {
      return 'mid-range';
    } else if (amount < 10000) {
      return 'luxury';
    } else {
      return 'ultra-luxury';
    }
  }

  /**
   * Hash content for tracking
   */
  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Batch anonymize multiple texts
   */
  async anonymizeBatch(
    texts: string[]
  ): Promise<Result<AnonymizationResult[], ValidationError>> {
    const results: AnonymizationResult[] = [];

    for (const text of texts) {
      const result = this.anonymize(text);
      if (!result.success) {
        return result;
      }
      results.push(result.value);
    }

    return ok(results);
  }
}

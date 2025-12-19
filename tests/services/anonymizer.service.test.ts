/**
 * Tests for AnonymizerService
 */

import { describe, it, expect } from 'vitest';
import { AnonymizerService } from '../../src/services/anonymizer.service.js';

describe('AnonymizerService', () => {
  const anonymizer = new AnonymizerService();

  describe('Email Removal', () => {
    it('should remove email addresses', () => {
      const text = 'Contact me at john.doe@example.com for details';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).toBe('Contact me at [EMAIL] for details');
        expect(result.value.piiTypes).toContain('email');
        expect(result.value.piiRemoved).toBeGreaterThan(0);
      }
    });

    it('should remove multiple email addresses', () => {
      const text = 'Email john@example.com or jane@example.org';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).toBe('Email [EMAIL] or [EMAIL]');
        expect(result.value.piiRemoved).toBe(2);
      }
    });
  });

  describe('Phone Number Removal', () => {
    it('should remove phone numbers in various formats', () => {
      const formats = [
        '555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        // Note: Plain 10-digit numbers without separators are not detected
        // to avoid false positives with other numeric data
      ];

      for (const phone of formats) {
        const result = anonymizer.anonymize(`Call me at ${phone}`);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.anonymized).toContain('[PHONE]');
          expect(result.value.piiTypes).toContain('phone');
        }
      }
    });
  });

  describe('Name Removal', () => {
    it('should remove names in "Sarah and I" pattern', () => {
      const text = 'Sarah and I want to visit Paris';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).not.toContain('Sarah');
        expect(result.value.anonymized).toBe('my travel companion and I want to visit Paris');
        expect(result.value.piiTypes).toContain('name');
      }
    });

    it('should remove names in relationship context', () => {
      const text = 'My wife Sarah wants to visit Paris';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).not.toContain('Sarah');
        expect(result.value.anonymized).toBe('My wife wants to visit Paris');
        expect(result.value.piiTypes).toContain('name');
      }
    });

    it('should remove self-introduction names', () => {
      const text = "I'm John";
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).not.toContain('John');
        expect(result.value.anonymized).toBe('I');
      }
    });

    it('should remove couple travel names', () => {
      const text = 'Sarah and me are traveling together';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).not.toContain('Sarah');
        expect(result.value.anonymized).toContain('travel companion');
      }
    });
  });

  describe('Address Removal', () => {
    it('should remove street addresses and generalize location', () => {
      const text = 'I live at 123 Main Street, Boston';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).not.toContain('123 Main Street');
        // Address is removed AND location is generalized to "Boston area"
        expect(result.value.anonymized).toContain('Boston area');
        expect(result.value.piiTypes).toContain('address');
        expect(result.value.piiTypes).toContain('location');
      }
    });

    it('should remove various address formats', () => {
      const addresses = [
        '456 Oak Avenue',
        '789 Park Rd',
        '321 Elm Boulevard',
        '555 Pine Lane',
      ];

      for (const address of addresses) {
        const result = anonymizer.anonymize(address);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.anonymized).toContain('[ADDRESS]');
        }
      }
    });
  });

  describe('Credit Card Removal', () => {
    it('should remove credit card numbers', () => {
      const text = 'My card is 1234 5678 9012 3456';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).toBe('My card is [CARD]');
        expect(result.value.piiTypes).toContain('credit_card');
      }
    });

    it('should handle various credit card formats', () => {
      const formats = [
        '1234-5678-9012-3456',
        '1234567890123456',
        '1234 5678 9012 3456',
      ];

      for (const cc of formats) {
        const result = anonymizer.anonymize(cc);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.anonymized).toContain('[CARD]');
        }
      }
    });
  });

  describe('Date Generalization', () => {
    it('should generalize specific dates to periods', () => {
      const text = 'We want to travel on March 15, 2025';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).not.toContain('March 15, 2025');
        expect(result.value.anonymized).toContain('mid-March');
        expect(result.value.piiTypes).toContain('date');
      }
    });

    it('should handle early, mid, and late month periods', () => {
      const cases = [
        { date: 'March 5, 2025', expected: 'early March' },
        { date: 'March 15, 2025', expected: 'mid-March' },
        { date: 'March 25, 2025', expected: 'late March' },
      ];

      for (const { date, expected } of cases) {
        const result = anonymizer.anonymize(`Travel on ${date}`);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.anonymized).toContain(expected);
        }
      }
    });

    it('should generalize numeric date formats', () => {
      const text = 'Departing on 03/15/2025';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).not.toContain('03/15/2025');
        expect(result.value.anonymized).toContain('March');
      }
    });
  });

  describe('Location Generalization', () => {
    it('should generalize personal addresses to region', () => {
      const text = 'Flying from 123 Airport Road, Boston';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).not.toContain('123 Airport Road');
        expect(result.value.anonymized).toContain('Boston area');
        expect(result.value.piiTypes).toContain('location');
      }
    });

    it('should preserve destination cities', () => {
      const text = 'I want to visit Paris and Rome';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).toContain('Paris');
        expect(result.value.anonymized).toContain('Rome');
      }
    });
  });

  describe('Budget Categorization', () => {
    it('should categorize budget amounts', () => {
      const cases = [
        { input: 'Our budget is $1500', amount: '$1500', expected: 'budget budget' },
        { input: 'Budget of $3,500', amount: '$3,500', expected: 'mid-range budget' },
        { input: 'Around $7500', amount: '$7500', expected: 'luxury budget' },
        { input: '$15,000 total', amount: '$15,000', expected: 'ultra-luxury budget' },
      ];

      for (const { input, amount, expected } of cases) {
        const result = anonymizer.anonymize(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.anonymized).toContain(expected);
          expect(result.value.anonymized).not.toContain(amount);
        }
      }
    });

    it('should handle comma-separated amounts', () => {
      const text = 'Budget of $5,000 for the trip';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).toContain('luxury budget');
        expect(result.value.anonymized).not.toContain('5,000');
      }
    });
  });

  describe('Complex Scenarios', () => {
    it('should anonymize multiple PII types in one text', () => {
      const text = 'Sarah and I (john@example.com) want to visit Paris on March 15, 2025. Budget: $5,000. Call 555-123-4567.';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        // Should not contain any PII
        expect(result.value.anonymized).not.toContain('Sarah');
        expect(result.value.anonymized).not.toContain('john@example.com');
        expect(result.value.anonymized).not.toContain('March 15, 2025');
        expect(result.value.anonymized).not.toContain('$5,000');
        expect(result.value.anonymized).not.toContain('555-123-4567');

        // Should contain anonymized versions
        expect(result.value.anonymized).toContain('[EMAIL]');
        expect(result.value.anonymized).toContain('[PHONE]');
        expect(result.value.anonymized).toContain('mid-March');
        expect(result.value.anonymized).toContain('luxury budget');

        // Should have detected multiple PII types (at least 3)
        expect(result.value.piiTypes.length).toBeGreaterThanOrEqual(3);
        expect(result.value.piiRemoved).toBeGreaterThanOrEqual(3);
      }
    });

    it('should preserve travel-relevant information', () => {
      const text = 'Looking for romantic hotels in Paris near Eiffel Tower for a couple';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).toContain('romantic');
        expect(result.value.anonymized).toContain('hotels');
        expect(result.value.anonymized).toContain('Paris');
        expect(result.value.anonymized).toContain('Eiffel Tower');
        expect(result.value.anonymized).toContain('couple');
      }
    });
  });

  describe('Batch Anonymization', () => {
    it('should anonymize multiple texts in batch', async () => {
      const texts = [
        'Sarah and I want to visit Paris',
        'Email me at john@example.com',
        'Budget is $5,000',
      ];

      const result = await anonymizer.anonymizeBatch(texts);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(3);

        expect(result.value[0]?.anonymized).not.toContain('Sarah');
        expect(result.value[1]?.anonymized).toContain('[EMAIL]');
        expect(result.value[2]?.anonymized).toContain('luxury budget');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const result = anonymizer.anonymize('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_DATA');
      }
    });

    it('should handle text with no PII', () => {
      const text = 'I want to visit Paris and see the Eiffel Tower';
      const result = anonymizer.anonymize(text);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.anonymized).toBe(text);
        expect(result.value.piiRemoved).toBe(0);
        expect(result.value.piiTypes).toHaveLength(0);
      }
    });

    it('should generate consistent hashes for same content', () => {
      const text = 'Same content';
      const result1 = anonymizer.anonymize(text);
      const result2 = anonymizer.anonymize(text);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result1.value.originalHash).toBe(result2.value.originalHash);
      }
    });

    it('should generate different hashes for different content', () => {
      const result1 = anonymizer.anonymize('Content A');
      const result2 = anonymizer.anonymize('Content B');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result1.value.originalHash).not.toBe(result2.value.originalHash);
      }
    });
  });
});

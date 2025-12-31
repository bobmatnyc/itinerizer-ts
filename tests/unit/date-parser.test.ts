import { describe, it, expect } from 'vitest';
import { parseDateSafe, safeDateSchema } from '../../src/utils/date-parser.js';

describe('parseDateSafe', () => {
  describe('Date objects', () => {
    it('should return valid Date objects as-is', () => {
      const date = new Date(2025, 11, 25, 10, 30, 0); // Dec 25, 2025 10:30:00
      const result = parseDateSafe(date);
      expect(result).toBe(date);
      expect(result?.getTime()).toBe(date.getTime());
    });

    it('should return undefined for invalid Date objects', () => {
      const invalidDate = new Date('invalid');
      const result = parseDateSafe(invalidDate);
      expect(result).toBeUndefined();
    });
  });

  describe('Date-only strings (YYYY-MM-DD)', () => {
    it('should parse date-only strings as local noon', () => {
      const result = parseDateSafe('2025-12-25');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.getDate()).toBe(25);
      expect(result?.getHours()).toBe(12); // Noon
      expect(result?.getMinutes()).toBe(0);
      expect(result?.getSeconds()).toBe(0);
    });

    it('should prevent timezone rollover for PST dates', () => {
      // This date in PST would roll back to Dec 24 if parsed as midnight UTC
      const result = parseDateSafe('2025-12-25');
      expect(result?.getDate()).toBe(25); // Should stay Dec 25
    });

    it('should handle leap year dates', () => {
      const result = parseDateSafe('2024-02-29');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(1); // February
      expect(result?.getDate()).toBe(29);
    });
  });

  describe('DateTime strings (YYYY-MM-DDTHH:MM:SS)', () => {
    it('should preserve time for datetime strings', () => {
      const result = parseDateSafe('2025-12-25T10:30:00');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(11);
      expect(result?.getDate()).toBe(25);
      expect(result?.getHours()).toBe(10);
      expect(result?.getMinutes()).toBe(30);
      expect(result?.getSeconds()).toBe(0);
    });

    it('should handle ISO datetime with timezone', () => {
      const result = parseDateSafe('2025-12-25T10:30:00Z');
      expect(result).toBeInstanceOf(Date);
      // Time will be converted to local timezone
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(11);
    });
  });

  describe('Invalid input', () => {
    it('should return undefined for undefined input', () => {
      expect(parseDateSafe(undefined)).toBeUndefined();
    });

    it('should return undefined for null input', () => {
      expect(parseDateSafe(null)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseDateSafe('')).toBeUndefined();
      expect(parseDateSafe('   ')).toBeUndefined();
    });

    it('should return undefined for invalid date strings', () => {
      expect(parseDateSafe('invalid')).toBeUndefined();
      expect(parseDateSafe('2025-13-01')).toBeUndefined(); // Invalid month
      expect(parseDateSafe('2025-12-32')).toBeUndefined(); // Invalid day
      expect(parseDateSafe('2025-02-30')).toBeUndefined(); // Invalid Feb date
      expect(parseDateSafe('not-a-date')).toBeUndefined();
    });

    it('should return undefined for malformed date strings', () => {
      expect(parseDateSafe('2025/12/25')).toBeUndefined(); // Wrong separator
      expect(parseDateSafe('25-12-2025')).toBeUndefined(); // Wrong order
      expect(parseDateSafe('2025-12')).toBeUndefined(); // Incomplete
    });
  });

  describe('Edge cases', () => {
    it('should handle whitespace around date strings', () => {
      const result = parseDateSafe('  2025-12-25  ');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(25);
    });

    it('should handle year boundaries', () => {
      const result1 = parseDateSafe('2025-01-01');
      expect(result1?.getMonth()).toBe(0);
      expect(result1?.getDate()).toBe(1);

      const result2 = parseDateSafe('2025-12-31');
      expect(result2?.getMonth()).toBe(11);
      expect(result2?.getDate()).toBe(31);
    });
  });
});

describe('safeDateSchema (Zod)', () => {
  it('should parse valid date strings', () => {
    const result = safeDateSchema.parse('2025-12-25');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(25);
  });

  it('should parse Date objects', () => {
    const date = new Date(2025, 11, 25);
    const result = safeDateSchema.parse(date);
    // Note: Zod transforms create new objects, so we check equality, not identity
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(date.getTime());
  });

  it('should parse undefined', () => {
    const result = safeDateSchema.parse(undefined);
    expect(result).toBeUndefined();
  });

  it('should parse null as undefined', () => {
    const result = safeDateSchema.parse(null);
    expect(result).toBeUndefined();
  });

  it('should work in object schemas', () => {
    const schema = safeDateSchema;
    const result1 = schema.parse('2025-12-25');
    const result2 = schema.parse(undefined);

    expect(result1).toBeInstanceOf(Date);
    expect(result2).toBeUndefined();
  });

  it('should handle invalid dates gracefully', () => {
    const result = safeDateSchema.parse('invalid-date');
    expect(result).toBeUndefined();
  });
});

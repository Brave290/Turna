import { describe, it, expect } from 'vitest';
import {
  toMinorUnits,
  fromMinorUnits,
  formatMoney,
  parseMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  isValidAmount,
  assertValidAmount,
} from '../money';

describe('Money Utilities', () => {
  describe('toMinorUnits', () => {
    it('converts naira to kobo', () => {
      expect(toMinorUnits(1000)).toBe(100000n);
    });

    it('handles decimals', () => {
      expect(toMinorUnits(1000.50)).toBe(100050n);
    });

    it('handles zero', () => {
      expect(toMinorUnits(0)).toBe(0n);
    });
  });

  describe('fromMinorUnits', () => {
    it('converts kobo to naira', () => {
      expect(fromMinorUnits(100000n)).toBe(1000);
    });

    it('handles zero', () => {
      expect(fromMinorUnits(0n)).toBe(0);
    });
  });

  describe('formatMoney', () => {
    it('formats kobo to naira string', () => {
      const result = formatMoney(100000n);
      expect(result).toContain('1,000');
    });

    it('handles zero', () => {
      const result = formatMoney(0n);
      expect(result).toContain('0');
    });
  });

  describe('parseMoney', () => {
    it('parses naira string to kobo', () => {
      expect(parseMoney('1000')).toBe(100000n);
    });

    it('parses with decimal', () => {
      expect(parseMoney('1000.50')).toBe(100050n);
    });
  });

  describe('addMoney', () => {
    it('adds two amounts', () => {
      expect(addMoney(100n, 200n)).toBe(300n);
    });
  });

  describe('subtractMoney', () => {
    it('subtracts two amounts', () => {
      expect(subtractMoney(300n, 100n)).toBe(200n);
    });

    it('throws on insufficient funds', () => {
      expect(() => subtractMoney(100n, 200n)).toThrow('Insufficient funds');
    });
  });

  describe('multiplyMoney', () => {
    it('multiplies by factor', () => {
      expect(multiplyMoney(100n, 2)).toBe(200n);
    });
  });

  describe('divideMoney', () => {
    it('divides by divisor', () => {
      expect(divideMoney(100n, 2)).toBe(50n);
    });

    it('throws on division by zero', () => {
      expect(() => divideMoney(100n, 0)).toThrow('Division by zero');
    });
  });

  describe('isValidAmount', () => {
    it('returns true for positive', () => {
      expect(isValidAmount(100n)).toBe(true);
    });

    it('returns false for zero', () => {
      expect(isValidAmount(0n)).toBe(false);
    });

    it('returns false for negative', () => {
      expect(isValidAmount(-100n)).toBe(false);
    });
  });

  describe('assertValidAmount', () => {
    it('does not throw for valid', () => {
      expect(() => assertValidAmount(100n)).not.toThrow();
    });

    it('throws for invalid', () => {
      expect(() => assertValidAmount(0n)).toThrow();
    });
  });
});
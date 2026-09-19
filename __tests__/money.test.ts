import { describe, it, expect } from 'vitest';

// ── Money Utilities (from @turna/core/src/money.ts) ──

const MINOR_UNITS_PER_MAJOR = 100;

function toMinorUnits(major: number, decimals = 2): bigint {
  const factor = 10 ** decimals;
  return BigInt(Math.round(major * factor));
}

function fromMinorUnits(minor: bigint, decimals = 2): number {
  const factor = 10 ** decimals;
  return Number(minor) / factor;
}

function formatMoney(minor: bigint, currency = 'NGN', decimals = 2): string {
  const major = fromMinorUnits(minor, decimals);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

function parseMoney(input: string): bigint {
  const cleaned = input.replace(/[^\d.,-]/g, '');
  const parts = cleaned.split(/[.,]/);
  if (parts.length === 1) return BigInt(parts[0]) * 100n;
  const major = BigInt(parts[0]);
  const minorStr = parts[1].padEnd(2, '0').slice(0, 2);
  return major * 100n + BigInt(minorStr);
}

function addMoney(a: bigint, b: bigint): bigint { return a + b; }
function subtractMoney(a: bigint, b: bigint): bigint {
  if (a < b) throw new Error('Insufficient funds');
  return a - b;
}
function multiplyMoney(amount: bigint, factor: number): bigint {
  return amount * BigInt(Math.round(factor * 10000)) / 10000n;
}
function divideMoney(amount: bigint, divisor: number): bigint {
  if (divisor === 0) throw new Error('Division by zero');
  return amount / BigInt(divisor);
}
function isValidAmount(minor: bigint): boolean { return minor > 0n; }
function assertValidAmount(minor: bigint, label = 'Amount'): void {
  if (!isValidAmount(minor)) throw new Error(`${label} must be positive`);
}

describe('Money Utilities', () => {
  it('converts naira to kobo', () => { expect(toMinorUnits(1000)).toBe(100000n); });
  it('handles decimals', () => { expect(toMinorUnits(1000.50)).toBe(100050n); });
  it('converts kobo to naira', () => { expect(fromMinorUnits(100000n)).toBe(1000); });
  it('formats money', () => { expect(formatMoney(100000n)).toContain('1,000'); });
  it('parses money string', () => { expect(parseMoney('1000')).toBe(100000n); });
  it('adds money', () => { expect(addMoney(100n, 200n)).toBe(300n); });
  it('subtracts money', () => { expect(subtractMoney(300n, 100n)).toBe(200n); });
  it('throws on insufficient funds', () => { expect(() => subtractMoney(100n, 200n)).toThrow('Insufficient funds'); });
  it('multiplies money', () => { expect(multiplyMoney(100n, 2)).toBe(200n); });
  it('divides money', () => { expect(divideMoney(100n, 2)).toBe(50n); });
  it('throws on division by zero', () => { expect(() => divideMoney(100n, 0)).toThrow('Division by zero'); });
  it('validates amount', () => { expect(isValidAmount(100n)).toBe(true); expect(isValidAmount(0n)).toBe(false); });
  it('asserts valid amount', () => { expect(() => assertValidAmount(100n)).not.toThrow(); expect(() => assertValidAmount(0n)).toThrow(); });
});
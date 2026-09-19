export const MINOR_UNITS_PER_MAJOR = 100;

export function toMinorUnits(major: number, decimals = 2): bigint {
  const factor = 10 ** decimals;
  return BigInt(Math.round(major * factor));
}

export function fromMinorUnits(minor: bigint, decimals = 2): number {
  const factor = 10 ** decimals;
  return Number(minor) / factor;
}

export function formatMoney(minor: bigint, currency = 'NGN', decimals = 2): string {
  const major = fromMinorUnits(minor, decimals);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

export function parseMoney(input: string, currency = 'NGN'): bigint {
  const cleaned = input.replace(/[^\d.,-]/g, '');
  const parts = cleaned.split(/[.,]/);
  if (parts.length === 1) {
    return BigInt(parts[0]) * 100n;
  }
  const major = BigInt(parts[0]);
  const minorStr = parts[1].padEnd(2, '0').slice(0, 2);
  return major * 100n + BigInt(minorStr);
}

export function addMoney(a: bigint, b: bigint): bigint {
  return a + b;
}

export function subtractMoney(a: bigint, b: bigint): bigint {
  if (a < b) throw new Error('Insufficient funds');
  return a - b;
}

export function multiplyMoney(amount: bigint, factor: number): bigint {
  return amount * BigInt(Math.round(factor * 10000)) / 10000n;
}

export function divideMoney(amount: bigint, divisor: number): bigint {
  if (divisor === 0) throw new Error('Division by zero');
  return amount / BigInt(divisor);
}

export function isValidAmount(minor: bigint): boolean {
  return minor > 0n;
}

export function assertValidAmount(minor: bigint, label = 'Amount'): void {
  if (!isValidAmount(minor)) {
    throw new Error(`${label} must be positive`);
  }
}
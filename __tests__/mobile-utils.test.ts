import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatCurrency } from '../apps/mobile/src/lib/format';
import { isAdminEmail } from '../apps/mobile/src/lib/config';

// Mock the clipboard module before importing otp-clipboard
vi.mock('@react-native-clipboard/clipboard', () => ({
  default: {
    getString: vi.fn(),
  },
}));

import Clipboard from '@react-native-clipboard/clipboard';
import { clipboardOtp } from '../apps/mobile/src/lib/otp-clipboard';

describe('formatCurrency', () => {
  it('formats NGN amounts correctly', () => {
    expect(formatCurrency(100000)).toContain('1,000');
    expect(formatCurrency(50000)).toContain('500');
    expect(formatCurrency(0)).toContain('0');
  });

  it('handles non-finite values', () => {
    expect(formatCurrency(NaN)).toBe('₦0');
    expect(formatCurrency(Infinity)).toBe('₦0');
  });

  it('divides by 100 (kobo to naira)', () => {
    expect(formatCurrency(100)).toContain('1');
    expect(formatCurrency(200)).toContain('2');
  });
});

describe('isAdminEmail', () => {
  it('returns true for admin email', () => {
    expect(isAdminEmail('support.turna@gmail.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAdminEmail('Support.Turna@Gmail.com')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(isAdminEmail('  support.turna@gmail.com  ')).toBe(true);
  });

  it('returns false for non-admin emails', () => {
    expect(isAdminEmail('user@example.com')).toBe(false);
  });

  it('returns false for null/undefined/empty', () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });
});

describe('clipboardOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts a 6-digit code from clipboard text', async () => {
    (Clipboard.getString as ReturnType<typeof vi.fn>).mockResolvedValue('Your code is 123456');
    const result = await clipboardOtp();
    expect(result).toBe('123456');
  });

  it('returns null when no 6-digit code is found', async () => {
    (Clipboard.getString as ReturnType<typeof vi.fn>).mockResolvedValue('No code here');
    const result = await clipboardOtp();
    expect(result).toBeNull();
  });

  it('returns null on clipboard error', async () => {
    (Clipboard.getString as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('denied'));
    const result = await clipboardOtp();
    expect(result).toBeNull();
  });

  it('finds code embedded in longer text', async () => {
    (Clipboard.getString as ReturnType<typeof vi.fn>).mockResolvedValue('Turna code: 987654. Valid for 10 minutes.');
    const result = await clipboardOtp();
    expect(result).toBe('987654');
  });
});

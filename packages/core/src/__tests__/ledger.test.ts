import { describe, it, expect } from 'vitest';

function generateEventHash(event: Record<string, any>): string {
  const data = JSON.stringify(event);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function verifyChain(events: Record<string, any>[]): boolean {
  for (let i = 1; i < events.length; i++) {
    if (events[i].previous_event_hash !== events[i - 1].event_hash) {
      return false;
    }
  }
  return true;
}

describe('Ledger Hash Chain', () => {
  describe('generateEventHash', () => {
    it('generates consistent hash', () => {
      const event = { type: 'contribution', amount: 1000 };
      const hash1 = generateEventHash(event);
      const hash2 = generateEventHash(event);
      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different data', () => {
      const hash1 = generateEventHash({ amount: 1000 });
      const hash2 = generateEventHash({ amount: 2000 });
      expect(hash1).not.toBe(hash2);
    });

    it('returns 8-character hex string', () => {
      const hash = generateEventHash({ test: true });
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('verifyChain', () => {
    it('validates correct chain', () => {
      const events = [
        { event_hash: 'abc12345', previous_event_hash: null },
        { event_hash: 'def67890', previous_event_hash: 'abc12345' },
        { event_hash: 'ghi11223', previous_event_hash: 'def67890' },
      ];
      expect(verifyChain(events)).toBe(true);
    });

    it('detects broken chain', () => {
      const events = [
        { event_hash: 'abc12345', previous_event_hash: null },
        { event_hash: 'def67890', previous_event_hash: 'WRONG_HASH' },
        { event_hash: 'ghi11223', previous_event_hash: 'def67890' },
      ];
      expect(verifyChain(events)).toBe(false);
    });

    it('handles single event', () => {
      const events = [{ event_hash: 'abc12345', previous_event_hash: null }];
      expect(verifyChain(events)).toBe(true);
    });

    it('handles empty array', () => {
      expect(verifyChain([])).toBe(true);
    });
  });
});
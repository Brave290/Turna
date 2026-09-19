import { describe, it, expect } from 'vitest';

// ── Ledger Hash Chain ──

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
    if (events[i].previous_event_hash !== events[i - 1].event_hash) return false;
  }
  return true;
}

describe('Ledger Hash Chain', () => {
  it('generates consistent hash', () => {
    const e = { type: 'contribution', amount: 1000 };
    expect(generateEventHash(e)).toBe(generateEventHash(e));
  });

  it('different data → different hash', () => {
    expect(generateEventHash({ amount: 1000 })).not.toBe(generateEventHash({ amount: 2000 }));
  });

  it('returns 8-char hex', () => {
    expect(generateEventHash({ test: true })).toMatch(/^[0-9a-f]{8}$/);
  });

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
      { event_hash: 'def67890', previous_event_hash: 'WRONG' },
    ];
    expect(verifyChain(events)).toBe(false);
  });

  it('handles single event', () => {
    expect(verifyChain([{ event_hash: 'abc', previous_event_hash: null }])).toBe(true);
  });

  it('handles empty array', () => {
    expect(verifyChain([])).toBe(true);
  });
});
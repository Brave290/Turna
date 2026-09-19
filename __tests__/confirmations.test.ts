import { describe, it, expect } from 'vitest';

// ── Two-Party Confirmation ──

type ConfirmationStatus = 'pending' | 'confirmed' | 'disputed';

interface TwoPartyConfirmation {
  reporterId: string;
  reporterConfirmed: boolean;
  treasurerId: string;
  treasurerConfirmed: boolean;
  status: ConfirmationStatus;
  disputeReason?: string;
}

function createConfirmation(reporterId: string, treasurerId: string): TwoPartyConfirmation {
  return { reporterId, reporterConfirmed: false, treasurerId, treasurerConfirmed: false, status: 'pending' };
}

function confirmByReporter(conf: TwoPartyConfirmation): TwoPartyConfirmation {
  if (conf.status !== 'pending') throw new Error('Can only confirm pending');
  const reporterConfirmed = true;
  return { ...conf, reporterConfirmed, status: reporterConfirmed && conf.treasurerConfirmed ? 'confirmed' : 'pending' };
}

function confirmByTreasurer(conf: TwoPartyConfirmation): TwoPartyConfirmation {
  if (conf.status !== 'pending') throw new Error('Can only confirm pending');
  const treasurerConfirmed = true;
  return { ...conf, treasurerConfirmed, status: conf.reporterConfirmed && treasurerConfirmed ? 'confirmed' : 'pending' };
}

function dispute(conf: TwoPartyConfirmation, reason: string): TwoPartyConfirmation {
  if (conf.status === 'confirmed') throw new Error('Cannot dispute confirmed');
  return { ...conf, status: 'disputed', disputeReason: reason };
}

function isFullyConfirmed(conf: TwoPartyConfirmation): boolean {
  return conf.reporterConfirmed && conf.treasurerConfirmed;
}

describe('Two-Party Confirmation', () => {
  it('creates pending confirmation', () => {
    const c = createConfirmation('u1', 'u2');
    expect(c.status).toBe('pending');
    expect(c.reporterConfirmed).toBe(false);
  });

  it('reporter confirms → still pending', () => {
    const c = confirmByReporter(createConfirmation('u1', 'u2'));
    expect(c.reporterConfirmed).toBe(true);
    expect(c.status).toBe('pending');
  });

  it('both confirm → confirmed', () => {
    let c = createConfirmation('u1', 'u2');
    c = confirmByReporter(c);
    c = confirmByTreasurer(c);
    expect(c.status).toBe('confirmed');
    expect(isFullyConfirmed(c)).toBe(true);
  });

  it('double confirm does not throw (idempotent)', () => {
    let c = confirmByReporter(createConfirmation('u1', 'u2'));
    expect(() => confirmByReporter(c)).not.toThrow();
  });

  it('dispute marks disputed', () => {
    const c = dispute(createConfirmation('u1', 'u2'), 'Amount mismatch');
    expect(c.status).toBe('disputed');
    expect(c.disputeReason).toBe('Amount mismatch');
  });

  it('cannot dispute confirmed', () => {
    let c = createConfirmation('u1', 'u2');
    c = confirmByReporter(c);
    c = confirmByTreasurer(c);
    expect(() => dispute(c, 'late')).toThrow();
  });

  it('isFullyConfirmed', () => {
    let c = createConfirmation('u1', 'u2');
    expect(isFullyConfirmed(c)).toBe(false);
    c = confirmByReporter(c);
    expect(isFullyConfirmed(c)).toBe(false);
    c = confirmByTreasurer(c);
    expect(isFullyConfirmed(c)).toBe(true);
  });
});
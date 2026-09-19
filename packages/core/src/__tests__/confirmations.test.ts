import { describe, it, expect } from 'vitest';

type ConfirmationStatus = 'pending' | 'confirmed' | 'disputed' | 'expired';

interface TwoPartyConfirmation {
  reporterId: string;
  reporterConfirmed: boolean;
  treasurerId: string;
  treasurerConfirmed: boolean;
  status: ConfirmationStatus;
  disputeReason?: string;
}

function createConfirmation(reporterId: string, treasurerId: string): TwoPartyConfirmation {
  return {
    reporterId,
    reporterConfirmed: false,
    treasurerId,
    treasurerConfirmed: false,
    status: 'pending',
  };
}

function confirmByReporter(confirmation: TwoPartyConfirmation): TwoPartyConfirmation {
  if (confirmation.status !== 'pending' || confirmation.reporterConfirmed) {
    throw new Error('Can only confirm pending transactions');
  }
  return { ...confirmation, reporterConfirmed: true, status: getOverallStatus(true, confirmation.treasurerConfirmed) };
}

function confirmByTreasurer(confirmation: TwoPartyConfirmation): TwoPartyConfirmation {
  if (confirmation.status !== 'pending') {
    throw new Error('Can only confirm pending transactions');
  }
  return { ...confirmation, treasurerConfirmed: true, status: getOverallStatus(confirmation.reporterConfirmed, true) };
}

function dispute(confirmation: TwoPartyConfirmation, reason: string): TwoPartyConfirmation {
  if (confirmation.status === 'confirmed') {
    throw new Error('Cannot dispute confirmed transactions');
  }
  return { ...confirmation, status: 'disputed', disputeReason: reason };
}

function getOverallStatus(reporterConfirmed: boolean, treasurerConfirmed: boolean): ConfirmationStatus {
  if (reporterConfirmed && treasurerConfirmed) return 'confirmed';
  return 'pending';
}

function isFullyConfirmed(confirmation: TwoPartyConfirmation): boolean {
  return confirmation.reporterConfirmed && confirmation.treasurerConfirmed;
}

describe('Two-Party Confirmation', () => {
  describe('createConfirmation', () => {
    it('creates pending confirmation', () => {
      const conf = createConfirmation('user1', 'user2');
      expect(conf.status).toBe('pending');
      expect(conf.reporterConfirmed).toBe(false);
      expect(conf.treasurerConfirmed).toBe(false);
    });

    it('sets correct IDs', () => {
      const conf = createConfirmation('reporter', 'treasurer');
      expect(conf.reporterId).toBe('reporter');
      expect(conf.treasurerId).toBe('treasurer');
    });
  });

  describe('confirmByReporter', () => {
    it('marks reporter as confirmed', () => {
      const conf = createConfirmation('user1', 'user2');
      const updated = confirmByReporter(conf);
      expect(updated.reporterConfirmed).toBe(true);
      expect(updated.status).toBe('pending');
    });

    it('completes confirmation when both confirm', () => {
      let conf = createConfirmation('user1', 'user2');
      conf = confirmByReporter(conf);
      conf = confirmByTreasurer(conf);
      expect(conf.status).toBe('confirmed');
      expect(isFullyConfirmed(conf)).toBe(true);
    });

    it('throws if already confirmed', () => {
      let conf = createConfirmation('user1', 'user2');
      conf = confirmByReporter(conf);
      expect(() => confirmByReporter(conf)).toThrow();
    });
  });

  describe('confirmByTreasurer', () => {
    it('marks treasurer as confirmed', () => {
      const conf = createConfirmation('user1', 'user2');
      const updated = confirmByTreasurer(conf);
      expect(updated.treasurerConfirmed).toBe(true);
      expect(updated.status).toBe('pending');
    });
  });

  describe('dispute', () => {
    it('marks as disputed with reason', () => {
      const conf = createConfirmation('user1', 'user2');
      const disputed = dispute(conf, 'Amount mismatch');
      expect(disputed.status).toBe('disputed');
      expect(disputed.disputeReason).toBe('Amount mismatch');
    });

    it('throws if already confirmed', () => {
      let conf = createConfirmation('user1', 'user2');
      conf = confirmByReporter(conf);
      conf = confirmByTreasurer(conf);
      expect(() => dispute(conf, 'Late dispute')).toThrow();
    });
  });

  describe('isFullyConfirmed', () => {
    it('returns false when only reporter confirms', () => {
      const conf = confirmByReporter(createConfirmation('u1', 'u2'));
      expect(isFullyConfirmed(conf)).toBe(false);
    });

    it('returns true when both confirm', () => {
      let conf = createConfirmation('u1', 'u2');
      conf = confirmByReporter(conf);
      conf = confirmByTreasurer(conf);
      expect(isFullyConfirmed(conf)).toBe(true);
    });
  });
});

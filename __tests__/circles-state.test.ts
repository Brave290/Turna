import { describe, it, expect } from 'vitest';

// ── Circle State Machine ──

type CircleStatus = 'draft' | 'recruiting' | 'active' | 'completed' | 'cancelled';

const VALID_TRANSITIONS: Record<CircleStatus, CircleStatus[]> = {
  draft: ['recruiting', 'cancelled'],
  recruiting: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function canTransition(from: CircleStatus, to: CircleStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

function getValidTransitions(status: CircleStatus): CircleStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

describe('Circle State Machine', () => {
  it('allows draft → recruiting', () => { expect(canTransition('draft', 'recruiting')).toBe(true); });
  it('allows draft → cancelled', () => { expect(canTransition('draft', 'cancelled')).toBe(true); });
  it('allows recruiting → active', () => { expect(canTransition('recruiting', 'active')).toBe(true); });
  it('allows active → completed', () => { expect(canTransition('active', 'completed')).toBe(true); });
  it('rejects draft → active', () => { expect(canTransition('draft', 'active')).toBe(false); });
  it('rejects completed → any', () => { expect(canTransition('completed', 'active')).toBe(false); });
  it('rejects cancelled → any', () => { expect(canTransition('cancelled', 'active')).toBe(false); });
  it('rejects backwards transitions', () => { expect(canTransition('active', 'recruiting')).toBe(false); });
  it('returns correct transitions for draft', () => { expect(getValidTransitions('draft')).toEqual(['recruiting', 'cancelled']); });
  it('returns correct transitions for active', () => { expect(getValidTransitions('active')).toEqual(['completed', 'cancelled']); });
  it('returns empty for completed', () => { expect(getValidTransitions('completed')).toEqual([]); });
});
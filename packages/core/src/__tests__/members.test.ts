import { describe, it, expect } from 'vitest';

type MemberRole = 'owner' | 'treasurer' | 'member';

const ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  owner: [
    'circle.create',
    'circle.update',
    'circle.delete',
    'circle.activate',
    'member.invite',
    'member.view',
    'member.remove',
    'member.update_role',
    'contribution.confirm',
    'payout.initiate',
    'ledger.view',
    'settings.manage',
  ],
  treasurer: [
    'contribution.report',
    'contribution.confirm',
    'payout.confirm',
    'payout.send',
    'ledger.view',
    'member.view',
  ],
  member: [
    'contribution.report',
    'contribution.view_own',
    'payout.view_own',
    'member.view',
  ],
};

function hasPermission(role: MemberRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

function getPermissions(role: MemberRole): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

describe('Member Role Permissions', () => {
  describe('hasPermission', () => {
    it('owner has all permissions', () => {
      expect(hasPermission('owner', 'circle.create')).toBe(true);
      expect(hasPermission('owner', 'circle.delete')).toBe(true);
      expect(hasPermission('owner', 'member.invite')).toBe(true);
      expect(hasPermission('owner', 'payout.initiate')).toBe(true);
    });

    it('treasurer has financial permissions', () => {
      expect(hasPermission('treasurer', 'contribution.report')).toBe(true);
      expect(hasPermission('treasurer', 'contribution.confirm')).toBe(true);
      expect(hasPermission('treasurer', 'payout.confirm')).toBe(true);
    });

    it('treasurer cannot delete circle', () => {
      expect(hasPermission('treasurer', 'circle.delete')).toBe(false);
    });

    it('member has limited permissions', () => {
      expect(hasPermission('member', 'contribution.report')).toBe(true);
      expect(hasPermission('member', 'member.view')).toBe(true);
    });

    it('member cannot confirm contributions', () => {
      expect(hasPermission('member', 'contribution.confirm')).toBe(false);
    });

    it('member cannot initiate payout', () => {
      expect(hasPermission('member', 'payout.initiate')).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('owner has most permissions', () => {
      expect(getPermissions('owner').length).toBeGreaterThan(getPermissions('treasurer').length);
    });

    it('treasurer has more permissions than member', () => {
      expect(getPermissions('treasurer').length).toBeGreaterThan(getPermissions('member').length);
    });

    it('all roles can view members', () => {
      expect(hasPermission('owner', 'member.view')).toBe(true);
      expect(hasPermission('treasurer', 'member.view')).toBe(true);
      expect(hasPermission('member', 'member.view')).toBe(true);
    });
  });

  describe('role hierarchy', () => {
    it('owner > treasurer > member', () => {
      const ownerPerms = getPermissions('owner').length;
      const treasurerPerms = getPermissions('treasurer').length;
      const memberPerms = getPermissions('member').length;
      
      expect(ownerPerms).toBeGreaterThan(treasurerPerms);
      expect(treasurerPerms).toBeGreaterThan(memberPerms);
    });
  });
});

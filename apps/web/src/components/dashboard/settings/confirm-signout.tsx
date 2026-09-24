'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth-actions';
import { SettingsRow } from '@/components/dashboard/settings/shell';
import { useConfirm } from '@/components/ui';

/** Log out row with confirmation modal (not immediate sign-out). */
export function DangerSignOut() {
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const ok = await confirm(
      'Are you sure you want to log out of your Turna account?',
      { title: 'Log out?', confirmLabel: 'Log out', danger: false }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SettingsRow
        type="button"
        onClick={() => void onClick()}
        icon={LogOut}
        label={busy ? 'Signing out…' : 'Log out'}
        description="Sign out on this device"
      />
      {dialog}
    </>
  );
}

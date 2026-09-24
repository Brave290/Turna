import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SettingsGroup, SettingsPanel } from '@/components/dashboard/settings/shell';
import { PrefToggle } from '@/components/dashboard/settings/pref-controls';
import type { UserPreferences } from '@/lib/settings-types';

export const dynamic = 'force-dynamic';

const DEFAULTS: Partial<UserPreferences> = {
  push_notifications: true,
  email_notifications: true,
  contribution_reminders: true,
  payout_reminders: true,
  circle_activity: true,
  security_alerts: true,
  marketing: false,
};

export default async function NotificationsSettingsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const p = { ...DEFAULTS, ...(data ?? {}) } as Partial<UserPreferences> &
    Record<string, unknown>;

  return (
    <div>
      <SettingsPanel
        title="Notifications"
        description="Choose how Turna keeps you in the loop."
      >
        <SettingsGroup>
          <PrefToggle
            name="push_notifications"
            label="Push notifications"
            description="Receive important updates on this device"
            defaultChecked={p.push_notifications !== false}
          />
          <PrefToggle
            name="email_notifications"
            label="Email notifications"
            description="Account and money updates by email"
            defaultChecked={p.email_notifications !== false}
          />
          <PrefToggle
            name="contribution_reminders"
            label="Contribution reminders"
            description="When a contribution is coming up"
            defaultChecked={p.contribution_reminders !== false}
          />
          <PrefToggle
            name="payout_reminders"
            label="Payout reminders"
            description="When a payout is approaching"
            defaultChecked={p.payout_reminders !== false}
          />
          <PrefToggle
            name="circle_activity"
            label="Circle activity"
            description="Joins, role changes, and cycle updates"
            defaultChecked={p.circle_activity !== false}
          />
          <PrefToggle
            name="security_alerts"
            label="Security alerts"
            description="Login, password, and account events"
            defaultChecked
            disabled
            mandatoryNote="Always on — security events cannot be disabled."
          />
          <PrefToggle
            name="marketing"
            label="Marketing & announcements"
            description="Product news and offers"
            defaultChecked={p.marketing === true}
          />
        </SettingsGroup>
      </SettingsPanel>
    </div>
  );
}

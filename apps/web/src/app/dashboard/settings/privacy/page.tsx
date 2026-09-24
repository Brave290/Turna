import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SettingsGroup, SettingsPanel, SettingsRow } from '@/components/dashboard/settings/shell';
import { PrefRadio, PrefToggle } from '@/components/dashboard/settings/pref-controls';
import { Lock, Download, Trash2, Users } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
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

  const profileVis = (data?.profile_visibility as string) || 'members';
  const activityVis = (data?.activity_visibility as string) || 'members';

  return (
    <div>
      <SettingsPanel
        title="Privacy"
        description="Turna only collects what is needed to run circles, track contributions, secure your account, and meet legal requirements."
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2 px-1">
          Profile visibility
        </p>
        <SettingsGroup>
          <PrefRadio
            name="profile_visibility"
            value="members"
            label="Circle members only"
            checked={profileVis === 'members'}
          />
          <PrefRadio
            name="profile_visibility"
            value="private"
            label="Only me"
            checked={profileVis === 'private'}
          />
        </SettingsGroup>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2 px-1">
          Activity visibility
        </p>
        <SettingsGroup>
          <PrefRadio
            name="activity_visibility"
            value="members"
            label="Circle members"
            checked={activityVis === 'members'}
          />
          <PrefRadio
            name="activity_visibility"
            value="private"
            label="Only me"
            checked={activityVis === 'private'}
          />
        </SettingsGroup>

        <SettingsGroup>
          <PrefToggle
            name="data_sharing"
            label="Data sharing"
            description="Share anonymous product analytics to improve Turna"
            defaultChecked={data?.data_sharing === true}
          />
        </SettingsGroup>
      </SettingsPanel>

      <SettingsGroup title="Your data">
        <SettingsRow
          href="/dashboard/settings/delete"
          icon={Trash2}
          label="Delete account"
          description="Remove personal data (ledger may be retained)"
          danger
        />
        <SettingsRow
          href="#export"
          icon={Download}
          label="Download my data"
          description="Request an export of your profile data"
        />
        <SettingsRow
          href="/dashboard/ledger"
          icon={Lock}
          label="Ledger is append-only"
          description="Corrections create new events — history is never rewritten"
        />
      </SettingsGroup>

      <p className="text-xs text-muted px-1 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        Circle-level permissions are managed inside each circle.
      </p>
      <span className="sr-only">
        <Link href="/dashboard/settings">Settings</Link>
      </span>
    </div>
  );
}

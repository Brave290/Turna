import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ChangePasswordPanel } from '@/components/dashboard/change-password';
import { SettingsPanel, SettingsGroup, SettingsRow } from '@/components/dashboard/settings/shell';
import { SignOutOtherDevices } from '@/components/dashboard/settings/sign-out-others';
import { KeyRound, Mail, Smartphone, MonitorSmartphone, Cloud, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const identities = (user.app_metadata?.identities ?? []) as {
    provider?: string;
  }[];
  const googleConnected = identities.some((i) => i.provider === 'google');

  return (
    <div>
      <SettingsGroup title="Sign-in methods">
        <SettingsRow
          icon={KeyRound}
          label="Password"
          description="Change your password (email OTP required)"
        />
        <SettingsRow
          icon={Mail}
          label="Email OTP"
          description="Used for secure verification in Turna"
          value="On"
        />
        <SettingsRow
          icon={Cloud}
          label="Google"
          description={
            googleConnected
              ? 'Connected to your Google account'
              : 'Not connected'
          }
          value={googleConnected ? 'Connected' : 'Not connected'}
        />
      </SettingsGroup>

      <SettingsPanel
        title="Change password"
        description="We email you a one-time code first — no reset links inside the app."
      >
        <ChangePasswordPanel />
      </SettingsPanel>

      <SettingsPanel
        title="Active sessions"
        description="Devices currently signed into your account. Supabase keeps one session per browser profile."
      >
        <ul className="divide-y divide-border text-sm mb-4">
          <li className="py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <MonitorSmartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-forest">This browser</p>
                <p className="text-xs text-muted break-all">
                  Current session · signed in as {user.email}
                </p>
                <p className="text-[11px] text-muted mt-1 font-mono break-all">
                  {user.id}
                </p>
              </div>
            </div>
            <span className="badge badge-active shrink-0">Active now</span>
          </li>
          <li className="py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-forest">Turna mobile app</p>
                <p className="text-xs text-muted">
                  Native Android app shares the same account when you sign in there.
                </p>
              </div>
            </div>
            <span className="badge bg-forest/10 text-forest shrink-0">If installed</span>
          </li>
        </ul>
        <SignOutOtherDevices />
      </SettingsPanel>

      <SettingsPanel
        title="Re-authentication"
        description="Sensitive actions (payout order, account deletion) may ask for your password or email OTP again."
      >
        <p className="text-sm text-muted flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Email OTP and password re-auth are enabled for high-risk changes.
        </p>
      </SettingsPanel>

      <SettingsPanel title="Two-step verification">
        <p className="text-sm text-muted">
          Coming later. Email OTP already protects sensitive actions.
        </p>
      </SettingsPanel>
      <span className="sr-only">
        <Smartphone className="hidden" />
        <Cloud className="hidden" />
      </span>
    </div>
  );
}

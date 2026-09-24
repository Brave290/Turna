import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getDashboardData } from '@/lib/dashboard-data';
import { getInitials, formatDate } from '@/lib/utils';
import { AvatarUploader } from '@/components/dashboard/avatar-uploader';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { OfflineBanner } from '@/components/offline-banner';
import { SignOutOtherDevices } from '@/components/dashboard/settings/sign-out-others';
import {
  Settings,
  Users,
  Shield,
  Bell,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Palette,
  FileText,
} from 'lucide-react';
import { signOut } from '@/lib/auth-actions';
import { SettingsGroup, SettingsRow } from '@/components/dashboard/settings/shell';

export const dynamic = 'force-dynamic';

/**
 * Profile hub — avatar opens this page.
 * Edit profile + shortcuts into Settings / Security / Help.
 */
export default async function ProfilePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { profile, stats } = await getDashboardData();
  const { data: row } = await supabase
    .from('profiles')
    .select(
      'display_name, email, date_of_birth, phone, bio, city, country, avatar_url, avatar_version'
    )
    .eq('id', user.id)
    .maybeSingle();

  const displayName = row?.display_name || profile.display_name || user.email || 'Turna';
  const email = row?.email || user.email || '';
  const avatarUrl = row?.avatar_url ?? null;
  const avatarVersion =
    typeof row?.avatar_version === 'number' ? row.avatar_version : null;
  const initials = getInitials(displayName || email || 'TU');

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl" data-no-swipe>
      <OfflineBanner />

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          Profile
        </h1>
        <p className="text-muted mt-1">
          Your identity across circles. Members only see a masked version.
        </p>
      </div>

      {/* Identity header */}
      <section className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <AvatarUploader
            displayName={displayName}
            email={email}
            avatarUrl={avatarUrl}
            avatarVersion={avatarVersion}
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold text-forest truncate">
              {displayName}
            </p>
            <p className="text-sm text-muted truncate">{email}</p>
            <p className="text-xs text-muted mt-2">
              Member since {formatDate(profile.created_at || user.created_at)} ·{' '}
              {stats.circleCount} circle{stats.circleCount === 1 ? '' : 's'}
            </p>
            <span className="sr-only">{initials}</span>
          </div>
          <Link
            href="/dashboard/settings/profile"
            className="btn-outline btn-sm shrink-0 self-start sm:self-center"
          >
            Edit profile
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <SettingsGroup title="Account">
        <SettingsRow
          href="/dashboard/settings"
          icon={Settings}
          label="Settings"
          description="Account, preferences, privacy"
        />
        <SettingsRow
          href="/dashboard/circles"
          icon={Users}
          label="My circles"
          description={`${stats.activeCount} active`}
        />
        <SettingsRow
          href="/dashboard/settings/security"
          icon={Shield}
          label="Security"
          description="Password, sessions, OTP"
        />
        <SettingsRow
          href="/dashboard/settings/notifications"
          icon={Bell}
          label="Notifications"
          description="Email and in-app alerts"
        />
        <SettingsRow
          href="/dashboard/settings/appearance"
          icon={Palette}
          label="Appearance"
          description="Theme and motion"
        />
        <SettingsRow
          href="/dashboard/ledger"
          icon={FileText}
          label="Ledger"
          description="Append-only contribution history"
        />
        <SettingsRow
          href="/dashboard/settings/help"
          icon={LifeBuoy}
          label="Help & support"
          description="Guides and contact"
        />
      </SettingsGroup>

      <section className="card">
        <h2 className="font-semibold text-forest mb-1">Edit details</h2>
        <p className="text-sm text-muted mb-5">
          Name, contact info, and short bio visible to you.
        </p>
        <ProfileForm
          initial={{
            display_name: displayName,
            email,
            date_of_birth: row?.date_of_birth ?? null,
            phone: row?.phone ?? null,
            bio: row?.bio ?? null,
            city: row?.city ?? null,
            country: row?.country ?? 'NG',
          }}
        />
      </section>

      <SignOutOtherDevices />

      <div className="flex flex-col gap-3">
        <form action={signOut}>
          <button
            type="submit"
            className="btn-outline w-full text-muted hover:text-error hover:border-error/40"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </form>
        <Link
          href="/dashboard/settings/delete"
          className="text-center text-sm text-error/90 hover:text-error font-medium"
        >
          Delete account
        </Link>
      </div>
    </div>
  );
}

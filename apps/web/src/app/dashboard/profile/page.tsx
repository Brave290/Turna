import Link from 'next/link';
import { getDashboardData } from '@/lib/dashboard-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { AvatarUploader } from '@/components/dashboard/avatar-uploader';
import { ChangePasswordPanel } from '@/components/dashboard/change-password';
import { ArrowLeft, UserRound, CalendarDays, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Profile page — reached from the avatar in the top-left of the dashboard.
 * Picture upload, name, DOB, phone, bio, location, OTP password change.
 */
export default async function ProfilePage() {
  const { profile, user, stats } = await getDashboardData();
  const supabase = createServerSupabaseClient();
  const { data: row } = await supabase
    .from('profiles')
    .select(
      'display_name, email, date_of_birth, phone, bio, city, country, avatar_url, avatar_version'
    )
    .eq('id', user.id)
    .maybeSingle();

  const displayName = row?.display_name || profile.display_name || user.email || 'Turna';
  const avatarUrl = row?.avatar_url ?? null;
  const avatarVersion =
    typeof row?.avatar_version === 'number' ? row.avatar_version : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Overview
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          Profile
        </h1>
        <p className="text-muted mt-1">
          Your identity across circles. Members only see a masked version.
        </p>
      </div>

      {/* Fintech identity card + avatar upload */}
      <section className="card overflow-hidden relative">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(0,194,168,0.12), transparent 55%)',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <AvatarUploader
            displayName={displayName}
            email={profile.email}
            avatarUrl={avatarUrl}
            avatarVersion={avatarVersion}
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold text-forest truncate">
              {displayName}
            </p>
            <p className="text-sm text-muted truncate">{profile.email}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted">
              {row?.date_of_birth && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {formatDate(row.date_of_birth)}
                </span>
              )}
              {(row?.city || row?.country) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[row?.city, row?.country].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <UserRound className="w-3.5 h-3.5" />
                Member since {formatDate(profile.created_at || user.created_at)}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted">Circles</p>
            <p className="font-display text-2xl font-bold text-forest">
              {stats.circleCount}
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold text-forest mb-5">Edit details</h2>
        <ProfileForm
          initial={{
            display_name: displayName,
            email: profile.email,
            date_of_birth: row?.date_of_birth ?? null,
            phone: row?.phone ?? null,
            bio: row?.bio ?? null,
            city: row?.city ?? null,
            country: row?.country ?? 'NG',
          }}
        />
      </section>

      <ChangePasswordPanel />
    </div>
  );
}

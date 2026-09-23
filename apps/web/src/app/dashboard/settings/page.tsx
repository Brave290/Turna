import { getDashboardData } from '@/lib/dashboard-data';
import { formatDate } from '@/lib/utils';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { DeleteAccountPanel } from '@/components/dashboard/delete-account';
import { ThemeToggle } from '@/components/theme-toggle';
import { signOut } from '@/lib/auth-actions';
import { User, Shield, Palette, Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { profile, user, stats } = await getDashboardData();

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Settings
          </h1>
          <p className="text-muted mt-1">Profile, appearance, and account.</p>
        </div>
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted hidden sm:block" />
          <ThemeToggle />
        </div>
      </div>

      <section className="card">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-forest">Profile</h2>
        </div>
        <ProfileForm initialName={profile.display_name} email={profile.email} />
      </section>

      <section className="card">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-forest">Account</h2>
        </div>
        <dl className="space-y-3.5 text-sm">
          <div className="flex justify-between gap-4 items-center py-1">
            <dt className="text-muted">Member since</dt>
            <dd className="text-forest font-medium">
              {formatDate(profile.created_at || user.created_at)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 items-center py-1 border-t border-border/50 pt-3">
            <dt className="text-muted">Circles</dt>
            <dd className="text-forest font-medium">
              {stats.circleCount} total · {stats.ownedCount} owned
            </dd>
          </div>
          <div className="flex justify-between gap-4 items-center py-1 border-t border-border/50 pt-3">
            <dt className="text-muted flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Account ID
            </dt>
            <dd className="text-forest font-mono text-xs break-all text-right">
              {user.id}
            </dd>
          </div>
        </dl>
        <div className="mt-6 pt-5 border-t border-border/50">
          <form action={signOut}>
            <button type="submit" className="btn-outline w-full sm:w-auto">
              Sign out
            </button>
          </form>
        </div>
      </section>

      <DeleteAccountPanel />
    </div>
  );
}

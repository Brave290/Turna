import { getDashboardData } from '@/lib/dashboard-data';
import { formatDate } from '@/lib/utils';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { signOut } from '@/lib/auth-actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { profile, user, stats } = await getDashboardData();

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          Settings
        </h1>
        <p className="text-muted mt-1">Profile and account preferences.</p>
      </div>

      <section className="card">
        <h2 className="font-semibold text-forest mb-4">Profile</h2>
        <ProfileForm
          initialName={profile.display_name}
          email={profile.email}
        />
      </section>

      <section className="card">
        <h2 className="font-semibold text-forest mb-4">Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Member since</dt>
            <dd className="text-forest font-medium">
              {formatDate(profile.created_at || user.created_at)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Circles</dt>
            <dd className="text-forest font-medium">
              {stats.circleCount} total · {stats.ownedCount} owned
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">User ID</dt>
            <dd className="text-forest font-mono text-xs break-all">{user.id}</dd>
          </div>
        </dl>
        <form action={signOut} className="mt-6">
          <button type="submit" className="btn-outline">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}

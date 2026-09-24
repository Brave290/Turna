import { getDashboardData } from '@/lib/dashboard-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { BankAccountForm } from '@/components/dashboard/bank-account-form';
import { DeleteAccountPanel } from '@/components/dashboard/delete-account';
import { ThemeToggle } from '@/components/theme-toggle';
import { signOut } from '@/lib/auth-actions';
import { User, Shield, Palette, Activity, Landmark } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { profile, user, stats } = await getDashboardData();

  const supabase = createServerSupabaseClient();
  const { data: bank } = await supabase
    .from('bank_accounts')
    .select('id, bank_code, bank_name, account_number, account_name, is_default')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Settings
          </h1>
          <p className="text-muted mt-1">Profile, payouts, appearance, account.</p>
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
        <ProfileForm
          initial={{
            display_name: profile.display_name,
            email: profile.email,
            date_of_birth: (profile as { date_of_birth?: string | null }).date_of_birth ?? null,
            phone: (profile as { phone?: string | null }).phone ?? null,
            bio: (profile as { bio?: string | null }).bio ?? null,
            city: (profile as { city?: string | null }).city ?? null,
            country: (profile as { country?: string | null }).country ?? 'NG',
          }}
        />
      </section>

      <section className="card">
        <div className="flex items-center gap-2 mb-2">
          <Landmark className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-forest">Payout account</h2>
        </div>
        <p className="text-sm text-muted mb-5">
          Add the bank account where circle payouts are sent. We verify the
          account name with Paystack Resolve before saving.
        </p>
        <BankAccountForm
          initialAccount={
            bank
              ? {
                  id: bank.id,
                  bank_code: bank.bank_code,
                  bank_name: bank.bank_name,
                  account_number: bank.account_number,
                  account_name: bank.account_name,
                  is_default: bank.is_default,
                }
              : null
          }
        />
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

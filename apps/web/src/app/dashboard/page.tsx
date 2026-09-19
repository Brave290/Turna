import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  const profile = profileData as { display_name: string } | null;

  const { data: membershipData } = await supabase
    .from('circle_members')
    .select(`
      *,
      circles (
        id,
        name,
        contribution_amount_minor,
        status,
        frequency
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');
  const memberships = (membershipData ?? []) as Array<{
    id: string;
    circles: {
      id: string;
      name: string;
      contribution_amount: number;
      status: string;
      frequency: string;
    } | null;
  }>;

  const { data: contributionData } = await supabase
    .from('contributions')
    .select('*, circles(name)')
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);
  const recentContributions = (contributionData ?? []) as Array<{
    reported_amount: number | null;
    expected_amount: number;
  }>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">
                Turna<span className="text-primary">.</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                  {getInitials(profile?.display_name ?? user.email ?? 'U')}
                </div>
                <span className="text-sm text-text-secondary hidden sm:block">
                  {profile?.display_name ?? user.email}
                </span>
              </div>
              <form action="/api/auth/signout" method="post">
                <button type="submit" className="text-sm text-text-secondary hover:text-text-primary">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Welcome back, {profile?.display_name?.split(' ')[0] ?? 'there'}
          </h2>
          <p className="text-text-secondary mt-1">
            Here&apos;s your savings overview
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <p className="text-sm text-text-secondary">Total Saved</p>
            <p className="text-3xl font-bold text-white mt-1">
              {formatCurrency(
                recentContributions.reduce((sum, c) => sum + (c.reported_amount ?? c.expected_amount), 0)
              )}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-text-secondary">Active Circles</p>
            <p className="text-3xl font-bold text-white mt-1">
              {memberships?.length ?? 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-text-secondary">Next Payout</p>
            <p className="text-3xl font-bold text-white mt-1">—</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Your Circles</h3>
          {memberships && memberships.length > 0 ? (
            <div className="space-y-4">
              {memberships.map((m) => {
                const circle = m.circles;
                if (!circle) return null;
                return (
                  <div key={m.id} className="flex items-center justify-between p-4 bg-background rounded-xl border border-border hover:border-primary/30 transition-colors">
                    <div>
                      <h4 className="font-medium text-white">{circle.name}</h4>
                      <p className="text-sm text-text-secondary">
                        {formatCurrency(circle.contribution_amount)} · {circle.frequency}
                      </p>
                    </div>
                    <span className={`badge ${circle.status === 'active' ? 'badge-active' : 'badge-completed'}`}>
                      {circle.status}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">No circles yet</p>
              <a href="/circles/new" className="btn-primary mt-4 inline-flex">
                Create your first circle
              </a>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-text-muted">
          <p>Built by Akanji Mus&lsquo;ab · Brave hx Technology · Founda Technologies</p>
        </div>
      </main>
    </div>
  );
}

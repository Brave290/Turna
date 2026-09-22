import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { DashboardNav } from '@/components/dashboard/nav';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/dashboard');
  }

  let displayName =
    (user.user_metadata?.display_name as string) ||
    (user.email ?? 'Member').split('@')[0];

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.display_name) {
    displayName = profile.display_name;
  }

  return (
    <div className="min-h-screen bg-cream">
      <DashboardNav
        user={{
          email: user.email ?? null,
          displayName,
        }}
      />
      <main className="lg:pl-64 pt-14 lg:pt-0 pb-24 lg:pb-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { DashboardNav } from '@/components/dashboard/nav';
import { PageEnter } from '@/components/page-enter';
import type { Notification } from '@turna/types';

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

  const [profileRes, notifRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (profileRes?.data?.display_name) {
    displayName = profileRes.data.display_name;
  }

  const notifications = (notifRes.data ?? []) as Notification[];
  const unreadCount = notifications.filter((n) => n.status !== 'read').length;

  return (
    <div className="min-h-screen bg-cream app-bg">
      <DashboardNav
        user={{
          email: user.email ?? null,
          displayName,
        }}
        notifications={notifications}
        unreadCount={unreadCount}
      />
      <main className="lg:pl-64 pt-14 lg:pt-0 pb-24 lg:pb-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <PageEnter>
            {children}
          </PageEnter>
        </div>
      </main>
    </div>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { DashboardNav, SwipeRouter } from '@/components/dashboard/nav';
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

  // Onboarding gate — first-time users see branded motion intro
  const seenOnboarding =
    typeof user.user_metadata?.onboarded === 'boolean'
      ? (user.user_metadata.onboarded as boolean)
      : false;
  if (!seenOnboarding) {
    redirect('/auth/onboarding');
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

  const { data: notifList } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12);

  const notifications = (notifList ?? []) as Notification[];
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
          <SwipeRouter>
            <PageEnter>{children}</PageEnter>
          </SwipeRouter>
        </div>
      </main>
    </div>
  );
}

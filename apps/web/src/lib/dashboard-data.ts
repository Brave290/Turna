import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type {
  Circle,
  CircleMember,
  Contribution,
  ContributionCycle,
  Invitation,
  LedgerEvent,
  Notification,
  Payout,
  Profile,
} from '@turna/types';

export async function requireUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  return { supabase, user };
}

export async function getDashboardData() {
  const { supabase, user } = await requireUser();

  const [profileRes, circlesRes, notificationsRes, membersRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('circles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('circle_members')
      .select('*, circles(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(50),
  ]);

  const profile: Profile =
    (profileRes.data as Profile | null) ??
    ({
      id: user.id,
      email: user.email ?? '',
      display_name:
        (user.user_metadata?.display_name as string) ||
        (user.email ?? 'Member').split('@')[0],
      avatar_url: (user.user_metadata?.avatar_url as string | null) ?? null,
      created_at: user.created_at,
      updated_at: user.updated_at ?? user.created_at,
    } satisfies Profile);

  const circles = (circlesRes.data ?? []) as Circle[];
  const notifications = (notificationsRes.data ?? []) as Notification[];
  const memberships = (membersRes.data ?? []) as (CircleMember & { circles: Circle | null })[];

  // Active circles where user is member or owner
  const activeCircles = circles.filter((c) => c.status === 'active');
  const ownedCircles = circles.filter((c) => c.owner_id === user.id);

  let pendingContributions = 0;
  let pendingPayouts = 0;
  let totalContributed = 0;

  if (circles.length > 0) {
    const ids = circles.map((c) => c.id);

    const [cyclesRes, contribRes, payoutRes] = await Promise.all([
      supabase
        .from('contribution_cycles')
        .select('id, circle_id, status, expected_amount, due_date, cycle_number')
        .in('circle_id', ids)
        .order('due_date', { ascending: false })
        .limit(100),
      supabase
        .from('contributions')
        .select('id, status, reported_amount, expected_amount, cycle_id, member_id, contribution_cycles!inner(circle_id)')
        .in('contribution_cycles.circle_id', ids)
        .limit(200),
      supabase
        .from('payouts')
        .select('id, status, expected_amount, actual_amount, cycle_id, contribution_cycles!inner(circle_id)')
        .in('contribution_cycles.circle_id', ids)
        .limit(200),
    ]);

    const myMemberIds = new Set(memberships.map((m) => m.id));
    const contributions = (contribRes.data ?? []) as unknown as (Contribution & {
      contribution_cycles?: { circle_id: string };
    })[];
    const payouts = (payoutRes.data ?? []) as unknown as (Payout & {
      contribution_cycles?: { circle_id: string };
    })[];

    pendingContributions = contributions.filter(
      (c) =>
        myMemberIds.has(c.member_id) &&
        (c.status === 'pending' || c.status === 'reported')
    ).length;

    pendingPayouts = payouts.filter(
      (p) => p.status === 'pending' || p.status === 'initiated' || p.status === 'sent'
    ).length;

    totalContributed = contributions
      .filter((c) => c.status === 'confirmed' && myMemberIds.has(c.member_id))
      .reduce((sum, c) => sum + (c.reported_amount ?? c.expected_amount ?? 0), 0);

    void cyclesRes;
  }

  return {
    user,
    profile,
    circles,
    ownedCircles,
    activeCircles,
    memberships,
    notifications,
    stats: {
      circleCount: circles.length,
      activeCount: activeCircles.length,
      ownedCount: ownedCircles.length,
      memberCount: memberships.length,
      pendingContributions,
      pendingPayouts,
      totalContributed,
      unreadNotifications: notifications.filter((n) => n.status !== 'read').length,
    },
  };
}

export async function getCircleDetail(circleId: string) {
  const { supabase, user } = await requireUser();

  const [circleRes, membersRes, cyclesRes, invitesRes, ledgerRes] = await Promise.all([
    supabase.from('circles').select('*').eq('id', circleId).maybeSingle(),
    supabase
      .from('circle_members')
      .select('*, profiles(id, display_name, email, avatar_url)')
      .eq('circle_id', circleId)
      .order('payout_position', { ascending: true }),
    supabase
      .from('contribution_cycles')
      .select('*')
      .eq('circle_id', circleId)
      .order('cycle_number', { ascending: false })
      .limit(50),
    supabase
      .from('invitations')
      .select('*')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ledger_events')
      .select('*')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const circle = circleRes.data as Circle | null;
  if (!circle) {
    redirect('/dashboard/circles');
  }

  const members = (membersRes.data ?? []) as unknown as (CircleMember & {
    profiles: Pick<Profile, 'id' | 'display_name' | 'email' | 'avatar_url'> | null;
  })[];

  const isOwner = circle.owner_id === user.id;
  const isMember = members.some((m) => m.user_id === user.id && m.status === 'active');

  if (!isOwner && !isMember) {
    redirect('/dashboard/circles');
  }

  const cycleIds = ((cyclesRes.data ?? []) as ContributionCycle[]).map((c) => c.id);
  let contributions: Contribution[] = [];
  let payouts: Payout[] = [];

  if (cycleIds.length > 0) {
    const [cRes, pRes] = await Promise.all([
      supabase
        .from('contributions')
        .select('*, circle_members!inner(id, user_id, payout_position, profiles(display_name, email))')
        .in('cycle_id', cycleIds)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('payouts')
        .select('*, circle_members!inner(id, user_id, payout_position, profiles(display_name, email))')
        .in('cycle_id', cycleIds)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    contributions = (cRes.data ?? []) as unknown as Contribution[];
    payouts = (pRes.data ?? []) as unknown as Payout[];
  }

  return {
    user,
    circle,
    members,
    cycles: (cyclesRes.data ?? []) as ContributionCycle[],
    invitations: (invitesRes.data ?? []) as Invitation[],
    ledger: (ledgerRes.data ?? []) as LedgerEvent[],
    contributions,
    payouts,
    isOwner,
    isMember,
  };
}

export async function getNotifications() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data ?? []) as Notification[];
}

export async function getLedgerFeed(circleId?: string) {
  const { supabase, user } = await requireUser();
  let query = supabase
    .from('ledger_events')
    .select('*, circles(id, name)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (circleId) {
    query = query.eq('circle_id', circleId);
  }
  const { data, error } = await query;
  if (error) return [];
  void user;
  return (data ?? []) as unknown as (LedgerEvent & { circles: { id: string; name: string } | null })[];
}

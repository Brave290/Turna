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
  try {
    return await loadDashboardData();
  } catch (e) {
    console.error('[getDashboardData]', e);
    const fallbackUser = { id: '', email: '', created_at: new Date().toISOString(), updated_at: null } as never;
    void fallbackUser;
    // Re-throw as a controlled failure the page can catch
    throw e;
  }
}

async function loadDashboardData() {
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
      date_of_birth: null,
      phone: null,
      bio: null,
      city: null,
      country: 'NG',
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

    try {
      const [contribRes, payoutRes] = await Promise.all([
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
    } catch (statsErr) {
      console.error('[getDashboardData] stats failed:', statsErr);
    }
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
      wallets: await loadWallets(supabase, user.id),
    },
  };
}

async function loadWallets(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  try {
    const { data } = await supabase
      .from('wallet_balances')
      .select('circle_id, paid_amount, expected_amount, circles(name, currency)')
      .eq('user_id', userId)
      .limit(50);
    return (data ?? []) as unknown as {
      circle_id: string;
      paid_amount: number;
      expected_amount: number;
      circles: { name: string; currency: string } | null;
    }[];
  } catch {
    return [];
  }
}

export async function getCircleDetail(circleId: string) {
  const { supabase, user } = await requireUser();

  const [circleRes, membersRes, cyclesRes, invitesRes, ledgerRes, swapsRes, walletsRes, annRes, pollRes, agrRes] =
    await Promise.all([
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
      supabase
        .from('payout_swap_requests')
        .select('*')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('wallet_balances').select('*').eq('circle_id', circleId),
      supabase
        .from('circle_announcements')
        .select('*, profiles:author_id(display_name)')
        .eq('circle_id', circleId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('circle_polls')
        .select('*')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('circle_agreement_acceptances')
        .select('rules_version')
        .eq('circle_id', circleId)
        .eq('user_id', user.id)
        .maybeSingle(),
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
  let myContribution: Contribution | null = null;
  let collectingCycle: ContributionCycle | null = null;

  const cycles = (cyclesRes.data ?? []) as ContributionCycle[];
  collectingCycle =
    cycles.find((c) => c.status === 'collecting') ??
    cycles.find((c) => c.status === 'pending') ??
    null;

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

    const myMember = members.find((m) => m.user_id === user.id);
    if (myMember && collectingCycle) {
      myContribution =
        contributions.find(
          (c) =>
            c.cycle_id === collectingCycle.id && c.member_id === myMember.id
        ) ?? null;
    }
  }

  const announcementsRaw =
    ((annRes.data ?? []) as {
      id: string;
      title: string;
      body: string;
      pinned: boolean;
      created_at: string;
      profiles?: { display_name: string } | { display_name: string }[] | null;
    }[]) ?? [];
  const announcements = announcementsRaw.map((a) => {
    const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      created_at: a.created_at,
      author_name: p?.display_name ?? null,
    };
  });

  const pollsRaw =
    ((pollRes.data ?? []) as {
      id: string;
      question: string;
      options: string[] | unknown;
      status: string;
      created_at: string;
    }[]) ?? [];
  let pollVotes: { poll_id: string; option_index: number; voter_id: string }[] = [];
  if (pollsRaw.length > 0) {
    const { data: votes } = await supabase
      .from('circle_poll_votes')
      .select('poll_id, option_index, voter_id')
      .in(
        'poll_id',
        pollsRaw.map((p) => p.id)
      );
    pollVotes = (votes ?? []) as typeof pollVotes;
  }
  const polls = pollsRaw.map((p) => {
    const options = (Array.isArray(p.options) ? p.options : []).map(String);
    const counts = options.map(
      () => pollVotes.filter((v) => v.poll_id === p.id).length
    );
    const myCounts = options.map(
      (_, i) => pollVotes.filter((v) => v.poll_id === p.id && v.option_index === i).length
    );
    // fix: counts per option
    const realCounts = options.map(
      (_, i) => pollVotes.filter((v) => v.poll_id === p.id && v.option_index === i).length
    );
    void myCounts;
    void counts;
    const mine = pollVotes.find(
      (v) => v.poll_id === p.id && v.voter_id === user.id
    );
    return {
      id: p.id,
      question: p.question,
      options,
      status: p.status,
      created_at: p.created_at,
      total_votes: pollVotes.filter((v) => v.poll_id === p.id).length,
      my_vote: mine?.option_index ?? null,
      counts: realCounts,
    };
  });

  const myAgreementVersion = (agrRes.data as { rules_version?: number } | null)
    ?.rules_version;

  return {
    user,
    circle,
    members,
    cycles,
    invitations: (invitesRes.data ?? []) as Invitation[],
    ledger: (ledgerRes.data ?? []) as LedgerEvent[],
    contributions,
    payouts,
    isOwner,
    isMember,
    myContribution,
    collectingCycle,
    announcements,
    polls,
    myAgreementVersion,
    swaps: (swapsRes.data ?? []) as {
      id: string;
      circle_id: string;
      requester_member_id: string;
      target_member_id: string;
      status: string;
      reason: string | null;
      created_at: string;
    }[],
    wallets: (walletsRes.data ?? []) as {
      user_id: string;
      circle_id: string;
      paid_amount: number;
      expected_amount: number;
    }[],
  };
}

export async function getMemberLedger(circleId: string) {
  const { supabase, user } = await requireUser();

  const circleRes = await supabase
    .from('circles')
    .select('*')
    .eq('id', circleId)
    .maybeSingle();
  const circle = circleRes.data as Circle | null;
  if (!circle) redirect('/dashboard/circles');
  if (circle.owner_id !== user.id) redirect(`/dashboard/circles/${circleId}`);

  const [membersRes, cyclesRes, walletsRes] = await Promise.all([
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
      .limit(20),
    supabase.from('wallet_balances').select('*').eq('circle_id', circleId),
  ]);

  const members = (membersRes.data ?? []) as unknown as (CircleMember & {
    profiles: Pick<Profile, 'id' | 'display_name' | 'email' | 'avatar_url'> | null;
  })[];
  const cycles = (cyclesRes.data ?? []) as ContributionCycle[];
  const collecting =
    cycles.find((c) => c.status === 'collecting') ??
    cycles.find((c) => c.status === 'pending') ??
    null;

  let currentContribs: Contribution[] = [];
  if (collecting) {
    const { data } = await supabase
      .from('contributions')
      .select('*')
      .eq('cycle_id', collecting.id);
    currentContribs = (data ?? []) as Contribution[];
  }

  const wallets = (walletsRes.data ?? []) as {
    user_id: string;
    circle_id: string;
    paid_amount: number;
    expected_amount: number;
  }[];

  const rows = members.map((m) => {
    const contrib =
      currentContribs.find((c) => c.member_id === m.id) ?? null;
    const wallet = wallets.find((w) => w.user_id === m.user_id) ?? null;
    return {
      member: m,
      contribution: contrib,
      paidAmount: Number(wallet?.paid_amount || 0),
      expectedAmount: Number(wallet?.expected_amount || 0),
    };
  });

  const collected = rows.reduce(
    (s, r) =>
      s +
      (r.contribution?.status === 'confirmed'
        ? Number(r.contribution.reported_amount ?? r.contribution.expected_amount)
        : 0),
    0
  );
  const pending = rows.filter(
    (r) =>
      r.member.status === 'active' &&
      r.member.role !== 'owner' &&
      (!r.contribution ||
        r.contribution.status === 'pending' ||
        r.contribution.status === 'reported')
  ).length;
  const refunded = rows.filter((r) => r.contribution?.status === 'refunded').length;

  return {
    user,
    circle,
    rows,
    collectingCycle: collecting,
    cycles,
    summary: {
      total: rows.filter((r) => r.member.status === 'active').length,
      collected,
      pending,
      refunded,
      currency: circle.currency,
      contributionAmount: Number(circle.contribution_amount || 0),
    },
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

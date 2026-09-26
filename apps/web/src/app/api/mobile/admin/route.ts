import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { emailTemplates, sendEmail } from '@/lib/email';
import { isAdminEmail } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const ACTIONS = ['overview', 'kyc', 'contribution', 'broadcast', 'deleteUser'] as const;
type Action = (typeof ACTIONS)[number];

function flatten<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

async function overview(admin: AdminClient) {
  const [userCount, circleCount, memberCount, kycRes, pendingContribRes, usersRes, circlesRes, kycQueue] =
    await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('circles').select('id', { count: 'exact', head: true }),
      admin.from('circle_members').select('id', { count: 'exact', head: true }),
      admin
        .from('kyc_records')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      admin
        .from('contributions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'reported']),
      admin
        .from('profiles')
        .select('id, email, display_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('circles')
        .select('id, name, status, contribution_amount, currency, owner_id, created_at')
        .order('created_at', { ascending: false })
        .limit(30),
      admin
        .from('kyc_records')
        .select(
          'id, user_id, document_type, document_number, full_legal_name, status, rejection_reason, created_at, profiles(email, display_name)'
        )
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  // Pending contributions mirror the web admin queue: newest first, joined to
  // the circle so the app can show who reported what and where.
  const pendingContrib = await admin
    .from('contributions')
    .select(
      'id, status, reported_amount, expected_amount, created_at, member_id, contribution_cycles(circle_id, circles(name, owner_id))'
    )
    .in('status', ['pending', 'reported'])
    .order('created_at', { ascending: false })
    .limit(50);

  const contribRows = (pendingContrib.data ?? []) as unknown as {
    id: string;
    status: string;
    reported_amount: number | null;
    expected_amount: number;
    created_at: string;
    member_id: string;
    contribution_cycles: unknown;
  }[];

  // Resolve member → user → profile for the pending queue (explicit queries
  // instead of a deep join so the shape cannot silently break).
  const memberIds = Array.from(new Set(contribRows.map((c) => c.member_id))).filter(Boolean);
  const memberRows =
    memberIds.length > 0
      ? (
          (
            await admin.from('circle_members').select('id, user_id').in('id', memberIds)
          ).data ?? []
        )
      : [];
  const userIds = Array.from(new Set(memberRows.map((m) => m.user_id))).filter(Boolean);
  const profileRows =
    userIds.length > 0
      ? (
          (
            await admin
              .from('profiles')
              .select('id, email, display_name')
              .in('id', userIds)
          ).data ?? []
        )
      : [];
  const memberByUser = new Map(memberRows.map((m) => [m.id, m.user_id]));
  const profileById = new Map(profileRows.map((pr) => [pr.id, pr]));

  const contributions = contribRows.map((c) => {
    const cycleRel = flatten<{ circle_id?: string; circles?: unknown }>(
      c.contribution_cycles as never
    );
    const circle = flatten<{ name?: string; owner_id?: string }>(cycleRel?.circles as never);
    const userId = memberByUser.get(c.member_id) ?? '';
    const profile = profileById.get(userId);
    return {
      id: c.id,
      status: c.status,
      amount: Number(c.reported_amount ?? c.expected_amount ?? 0),
      created_at: c.created_at,
      circle_id: cycleRel?.circle_id ?? '',
      circle_name: circle?.name ?? '—',
      member_email: profile?.email ?? '—',
      member_name: profile?.display_name ?? 'Unknown member',
    };
  });

  return {
    counts: {
      users: userCount.count ?? 0,
      circles: circleCount.count ?? 0,
      memberships: memberCount.count ?? 0,
      pendingKyc: kycRes.count ?? 0,
      pendingContributions: pendingContribRes.count ?? 0,
    },
    recentUsers: (usersRes.data ?? []) as unknown as {
      id: string;
      email: string;
      display_name: string;
      avatar_url: string | null;
      created_at: string;
    }[],
    recentCircles: (circlesRes.data ?? []) as unknown as {
      id: string;
      name: string;
      status: string;
      contribution_amount: number;
      currency: string;
      owner_id: string;
      created_at: string;
    }[],
    kycQueue: (kycQueue.data ?? []) as unknown as {
      id: string;
      user_id: string;
      document_type: string;
      document_number: string;
      full_legal_name: string;
      status: string;
      rejection_reason: string | null;
      created_at: string;
      profiles: unknown;
    }[],
    pendingContributions: contributions,
  };
}

async function decideKyc(
  admin: AdminClient,
  actorId: string,
  body: Record<string, unknown>
) {
  const id = String(body.id ?? '');
  const decision = String(body.decision ?? '');
  if (!id || !['approved', 'rejected'].includes(decision)) {
    return bad('id and decision (approved|rejected) required');
  }

  const update: Record<string, unknown> = {
    status: decision,
    reviewed_by: actorId,
    reviewed_at: new Date().toISOString(),
    rejection_reason:
      decision === 'rejected'
        ? String(body.reason ?? 'Rejected by admin').slice(0, 300)
        : null,
  };

  const { data, error } = await admin
    .from('kyc_records')
    .update(update)
    .eq('id', id)
    .select('id, user_id, status')
    .maybeSingle();

  if (error || !data) {
    return bad(error?.message || 'KYC record not found', 404);
  }

  await admin.from('notifications').insert({
    user_id: data.user_id,
    channel: 'in_app',
    title: decision === 'approved' ? 'Identity verified' : 'KYC needs attention',
    body:
      decision === 'approved'
        ? 'Your identity verification was approved.'
        : `Your identity verification was rejected: ${update.rejection_reason}`,
    data: { event: 'KYC_REVIEW', status: decision, sender: 'admin' } as never,
    status: 'delivered',
    delivered_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, status: decision });
}

/**
 * Contribution decisions from the platform admin — same ledger-chain +
 * wallet-credit + member-bell writes as `/api/mobile/contribution`, but the
 * authorization is the ADMIN_EMAILS allowlist instead of circle ownership.
 */
async function decideContribution(
  admin: AdminClient,
  actorId: string,
  body: Record<string, unknown>
) {
  const contributionId = String(body.contribution_id ?? '');
  const decision = String(body.decision ?? '');
  if (!contributionId) return bad('Contribution required');
  if (!['confirmed', 'rejected'].includes(decision)) {
    return bad('Invalid decision');
  }

  const { data: contribution } = await admin
    .from('contributions')
    .select('*, contribution_cycles(circle_id, circles(owner_id, name))')
    .eq('id', contributionId)
    .maybeSingle();
  if (!contribution) return bad('Not found', 404);

  const cycleRel = contribution.contribution_cycles as
    | { circle_id: string; circles: { owner_id: string; name: string } | { owner_id: string; name: string }[] }
    | null;
  const cycle = Array.isArray(cycleRel) ? cycleRel[0] : cycleRel;
  const circleRel = cycle?.circles ?? null;
  const circle = Array.isArray(circleRel) ? circleRel[0] : circleRel;
  const circleId = cycle?.circle_id ?? '';
  if (!circleId || !circle) return bad('Circle not found', 404);

  const updates: Record<string, unknown> = { status: decision };
  if (decision === 'confirmed') {
    updates.confirmed_at = new Date().toISOString();
    if (!contribution.receipt_code) {
      updates.receipt_code = `TRN-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
    }
  }

  const { error: updateErr } = await admin
    .from('contributions')
    .update(updates)
    .eq('id', contributionId);
  if (updateErr) return bad('Could not update contribution');

  const eventType = decision === 'confirmed' ? 'CONTRIBUTION_CONFIRMED' : 'CONTRIBUTION_REJECTED';
  const amount = Number(contribution.reported_amount ?? contribution.expected_amount ?? 0);

  try {
    const { data: last } = await admin
      .from('ledger_events')
      .select('id')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    await admin.from('ledger_events').insert({
      circle_id: circleId,
      actor_id: actorId,
      event_type: eventType,
      entity_type: 'contribution',
      entity_id: contributionId,
      payload: { amount },
      previous_event_id: last?.id ?? null,
    });

    const { data: member } = await admin
      .from('circle_members')
      .select('user_id, circle_id')
      .eq('id', contribution.member_id)
      .maybeSingle();
    if (member) {
      if (decision === 'confirmed') {
        const { data: wallet } = await admin
          .from('wallet_balances')
          .select('paid_amount')
          .eq('user_id', member.user_id)
          .eq('circle_id', member.circle_id)
          .maybeSingle();
        const current = Number(wallet?.paid_amount || 0);
        const wasConfirmed = contribution.status === 'confirmed';
        const nextPaid = wasConfirmed ? current : current + amount;
        await admin.from('wallet_balances').upsert(
          {
            user_id: member.user_id,
            circle_id: member.circle_id,
            paid_amount: nextPaid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,circle_id', ignoreDuplicates: false }
        );
      }

      if (member.user_id && member.user_id !== actorId) {
        await admin.from('notifications').insert({
          user_id: member.user_id,
          circle_id: circleId,
          channel: 'in_app',
          title: decision === 'confirmed' ? 'Contribution confirmed' : 'Contribution rejected',
          body:
            decision === 'confirmed'
              ? `Your contribution was confirmed for "${circle.name}".`
              : `Your contribution was rejected for "${circle.name}".`,
          data: { circle_id: circleId, event: eventType, sender: 'admin' } as never,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.error('[mobile admin] privileged contribution writes failed:', e);
  }

  return NextResponse.json({ ok: true, decision });
}

/**
 * Broadcast — one in-app notification row per user (sender metadata in the
 * `data` JSONB column, `sent_at` set on the row) plus one email per user
 * through the shared email service. Returns how many users were reached.
 */
async function broadcast(admin: AdminClient, body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim().slice(0, 120);
  const message = String(body.body ?? '').trim().slice(0, 2000);
  if (!title || !message) return bad('title and body are required');

  const all: { id: string; email: string; display_name: string }[] = [];
  for (let from = 0; from < 5000; from += 500) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .order('created_at', { ascending: true })
      .range(from, from + 499);
    if (error) return bad('Could not read users');
    const rows = (data ?? []) as { id: string; email: string; display_name: string }[];
    all.push(...rows);
    if (rows.length < 500) break;
  }
  if (all.length === 0) return NextResponse.json({ count: 0, emails: 0 });

  const now = new Date().toISOString();
  const rows = all.map((u) => ({
    user_id: u.id,
    channel: 'in_app' as const,
    title,
    body: message,
    data: { sender: 'admin', sent_at: now } as never,
    status: 'delivered' as const,
    sent_at: now,
    delivered_at: now,
  }));

  let inApp = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await admin.from('notifications').insert(rows.slice(i, i + 200));
    if (error) {
      console.error('[mobile admin] broadcast insert failed:', error.message);
      break;
    }
    inApp += Math.min(200, rows.length - i);
  }

  const tpl = emailTemplates.adminBroadcast(title, message);
  let emails = 0;
  for (const u of all) {
    const res = await sendEmail({
      to: u.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
    if (res.success) emails += 1;
  }

  return NextResponse.json({ count: all.length, inApp, emails });
}

/**
 * Admin account deletion — same cascade as `/api/mobile/delete-account`
 * (leave circles, clear notifications/invitations, anonymize profile) run for
 * any user, then remove the auth user.
 */
async function deleteUser(admin: AdminClient, body: Record<string, unknown>, actorId: string) {
  const userId = String(body.user_id ?? '');
  if (!userId) return bad('user_id required');
  if (userId === actorId) return bad('You cannot delete your own admin account', 409);

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return bad('User not found', 404);

  const { data: owned } = await admin.from('circles').select('id').eq('owner_id', userId);
  if (owned && owned.length > 0) {
    return NextResponse.json(
      {
        error:
          'This user owns circles. Transfer ownership or delete them before deleting the account.',
      },
      { status: 409 }
    );
  }

  const { data: memberships } = await admin
    .from('circle_members')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (memberships && memberships.length > 0) {
    await admin
      .from('circle_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .in(
        'id',
        memberships.map((m) => m.id)
      );
  }

  await admin.from('notifications').delete().eq('user_id', userId);
  await admin.from('invitations').delete().eq('inviter_id', userId);

  const { error: anonErr } = await admin
    .from('profiles')
    .update({
      email: `deleted+${userId}@deleted.turna.invalid`,
      display_name: 'Deleted user',
      avatar_url: null,
    })
    .eq('id', userId);
  if (anonErr) {
    console.error('[mobile admin] anonymize failed:', anonErr.message);
    return bad('Could not delete account', 500);
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[mobile admin] admin delete failed:', error.message);
    return bad('Could not delete account', 500);
  }

  return NextResponse.json({ ok: true });
}

/**
 * In-app admin dashboard API — bearer-authenticated like `/api/mobile/invite`,
 * authorized by the ADMIN_EMAILS allowlist, privileged writes on the
 * service-role client.
 *
 * POST { action, ... } → 200 { ... } | 4xx { error }
 *   overview     → counts + recent users/circles + KYC queue + pending contributions
 *   kyc          → { id, decision: 'approved'|'rejected', reason? }
 *   contribution → { contribution_id, decision: 'confirmed'|'rejected' }
 *   broadcast    → { title, body }
 *   deleteUser   → { user_id }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return bad('Not signed in', 401);
    if (!isAdminEmail(user.email)) return bad('Forbidden', 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '') as Action;
    if (!ACTIONS.includes(action)) return bad('Unknown action');

    const admin = createAdminSupabaseClient();

    switch (action) {
      case 'overview':
        return NextResponse.json(await overview(admin));
      case 'kyc':
        return await decideKyc(admin, user.id, body);
      case 'contribution':
        return await decideContribution(admin, user.id, body);
      case 'broadcast':
        return await broadcast(admin, body);
      case 'deleteUser':
        return await deleteUser(admin, body, user.id);
    }
    return bad('Unknown action');
  } catch (e) {
    console.error('[mobile admin]', e);
    return bad('Request failed. Try again.', 400);
  }
}

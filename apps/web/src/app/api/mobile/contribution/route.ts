import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DECISIONS = ['confirmed', 'disputed', 'rejected', 'refunded'] as const;
type Decision = (typeof DECISIONS)[number];

/**
 * Mobile contribution decisions — same rules as the `decideContribution`
 * server action, authenticated with `Authorization: Bearer <token>` like
 * `/api/mobile/invite`.
 *
 * Authorization runs on the caller's session (RLS + owner/self checks). The
 * privileged writes that RLS cannot express for a caller — crediting the
 * reporting member's wallet row, the chained ledger event, and their bell —
 * run on the service-role client after those checks pass.
 *
 * POST { action: 'decide', contribution_id, decision }
 *   → 200 { success } | 4xx { error }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'decide');
    const contributionId = String(body.contribution_id ?? '');
    const decision = String(body.decision ?? '') as Decision;

    if (action !== 'decide') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    if (!contributionId) {
      return NextResponse.json({ error: 'Contribution required' }, { status: 400 });
    }
    if (!DECISIONS.includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const { data: contribution } = await supabase
      .from('contributions')
      .select('*, contribution_cycles(circle_id, circles(owner_id, name))')
      .eq('id', contributionId)
      .maybeSingle();
    if (!contribution) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const cycleRel = contribution.contribution_cycles as
      | { circle_id: string; circles: { owner_id: string; name: string } | { owner_id: string; name: string }[] }
      | null;
    const cycle = Array.isArray(cycleRel) ? cycleRel[0] : cycleRel;
    const circleRel = cycle?.circles ?? null;
    const circle = Array.isArray(circleRel) ? circleRel[0] : circleRel;
    const circleId = cycle?.circle_id ?? '';
    if (!circleId || !circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }

    const isOwner = circle.owner_id === user.id;
    const { data: myMember } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle();
    const isSelf = Boolean(myMember && myMember.id === contribution.member_id);

    if (decision === 'disputed') {
      if (!isSelf && !isOwner) {
        return NextResponse.json(
          { error: 'Not authorized' },
          { status: 403 }
        );
      }
    } else if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the circle admin can confirm/reject' },
        { status: 403 }
      );
    }

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

    const { error: updateErr } = await supabase
      .from('contributions')
      .update(updates)
      .eq('id', contributionId);
    if (updateErr) {
      return NextResponse.json(
        { error: 'Could not update contribution' },
        { status: 400 }
      );
    }

    const eventType =
      decision === 'confirmed'
        ? 'CONTRIBUTION_CONFIRMED'
        : decision === 'disputed'
          ? 'CONTRIBUTION_DISPUTED'
          : decision === 'refunded'
            ? 'CONTRIBUTION_REFUNDED'
            : 'CONTRIBUTION_REJECTED';
    const amount = Number(
      contribution.reported_amount ?? contribution.expected_amount ?? 0
    );

    // Service-role: ledger chain, wallet credit, member bell.
    try {
      const admin = createAdminSupabaseClient();

      const { data: last } = await admin
        .from('ledger_events')
        .select('id')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      await admin.from('ledger_events').insert({
        circle_id: circleId,
        actor_id: user.id,
        event_type: eventType,
        entity_type: 'contribution',
        entity_id: contributionId,
        payload: { amount },
        previous_event_id: last?.id ?? null,
      });

      if (decision === 'confirmed' || decision === 'refunded') {
        const { data: member } = await admin
          .from('circle_members')
          .select('user_id, circle_id')
          .eq('id', contribution.member_id)
          .maybeSingle();
        if (member) {
          const { data: wallet } = await admin
            .from('wallet_balances')
            .select('paid_amount')
            .eq('user_id', member.user_id)
            .eq('circle_id', member.circle_id)
            .maybeSingle();
          const current = Number(wallet?.paid_amount || 0);
          const wasConfirmed = contribution.status === 'confirmed';
          let nextPaid = current;
          if (decision === 'confirmed' && !wasConfirmed) {
            nextPaid = current + amount;
          } else if (decision === 'refunded' && wasConfirmed) {
            nextPaid = Math.max(0, current - amount);
          }
          await admin.from('wallet_balances').upsert(
            {
              user_id: member.user_id,
              circle_id: member.circle_id,
              paid_amount: nextPaid,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,circle_id', ignoreDuplicates: false }
          );

          if (member.user_id && member.user_id !== user.id) {
            await admin.from('notifications').insert({
              user_id: member.user_id,
              circle_id: circleId,
              channel: 'in_app',
              title:
                decision === 'confirmed'
                  ? 'Contribution confirmed'
                  : 'Contribution refunded',
              body:
                decision === 'confirmed'
                  ? `Your contribution was confirmed for "${circle.name}".`
                  : `Your contribution was refunded for "${circle.name}".`,
              data: { circle_id: circleId, event: eventType } as never,
              status: 'delivered',
              delivered_at: new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.error('[mobile contribution] privileged writes failed:', e);
    }

    return NextResponse.json({ success: `Contribution ${decision}` });
  } catch (e) {
    console.error('[mobile contribution]', e);
    return NextResponse.json(
      { error: 'Request failed. Try again.' },
      { status: 400 }
    );
  }
}

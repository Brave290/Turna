'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';

export type ActionState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

async function requireUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  return { supabase, user };
}

async function notify(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  opts: {
    userId: string;
    circleId?: string | null;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from('notifications').insert({
      user_id: opts.userId,
      circle_id: opts.circleId ?? null,
      channel: 'in_app',
      title: opts.title,
      body: opts.body,
      data: (opts.data ?? {}) as never,
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[notify]', e);
  }
}

async function ledger(
  circleId: string,
  actorId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown> = {}
) {
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
      actor_id: actorId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      payload: payload as never,
      previous_event_id: last?.id ?? null,
    });
  } catch (e) {
    console.error('[ledger]', e);
  }
}

// ─── SWAP REQUESTS ───────────────────────────────────────────

export async function requestPayoutSwap(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const circleId = String(formData.get('circle_id') ?? '');
  const targetMemberId = String(formData.get('target_member_id') ?? '');
  const reason = String(formData.get('reason') ?? '').slice(0, 500);
  if (!circleId || !targetMemberId) {
    return { error: { form: ['Select a member to swap with'] } };
  }

  const { data: me } = await supabase
    .from('circle_members')
    .select('id, payout_position, role')
    .eq('circle_id', circleId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!me) return { error: { form: ['You are not an active member'] } };
  if (me.id === targetMemberId) {
    return { error: { form: ['Cannot swap with yourself'] } };
  }

  const { data: existing } = await supabase
    .from('payout_swap_requests')
    .select('id')
    .eq('circle_id', circleId)
    .eq('requester_member_id', me.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return { error: { form: ['You already have a pending swap request'] } };
  }

  const { error } = await supabase.from('payout_swap_requests').insert({
    circle_id: circleId,
    requester_member_id: me.id,
    target_member_id: targetMemberId,
    status: 'pending',
    reason: reason || null,
  });

  if (error) {
    console.error('[requestPayoutSwap]', error.message);
    return { error: { form: ['Could not send swap request'] } };
  }

  const { data: target } = await supabase
    .from('circle_members')
    .select('user_id, payout_position, profiles(display_name, email)')
    .eq('id', targetMemberId)
    .maybeSingle();

  if (target?.user_id) {
    await notify(supabase, {
      userId: target.user_id,
      circleId,
      title: 'Payout swap request',
      body: `A member wants to swap payout position with you${reason ? `: ${reason}` : ''}.`,
      data: { circle_id: circleId, event: 'SWAP_REQUESTED' },
    });
  }

  const { data: circle } = await supabase
    .from('circles')
    .select('name, owner_id')
    .eq('id', circleId)
    .maybeSingle();

  if (circle?.owner_id && circle.owner_id !== user.id && target?.user_id) {
    await notify(supabase, {
      userId: circle.owner_id,
      circleId,
      title: 'Swap needs approval',
      body: 'A member requested a payout position swap. Review it on the circle page.',
      data: { circle_id: circleId, event: 'SWAP_REQUESTED' },
    });
  }

  revalidatePath(`/dashboard/circles/${circleId}`);
  return { success: 'Swap request sent' };
}

export async function decidePayoutSwap(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const swapId = String(formData.get('swap_id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (!swapId || !['approved', 'rejected', 'cancelled'].includes(decision)) {
    return { error: { form: ['Invalid decision'] } };
  }

  const { data: swap } = await supabase
    .from('payout_swap_requests')
    .select(
      '*, circles(id, name, owner_id), circle_members!payout_swap_requests_requester_member_id_fkey(user_id, payout_position, profiles(display_name)), circle_members!payout_swap_requests_target_member_id_fkey(user_id, payout_position, profiles(display_name))'
    )
    .eq('id', swapId)
    .maybeSingle();

  if (!swap || swap.status !== 'pending') {
    return { error: { form: ['Request not found or already decided'] } };
  }

  const requester = Array.isArray(swap.circle_members)
    ? swap.circle_members[0]
    : (swap.circle_members as Record<string, unknown> | null);
  // Supabase returns aliases; fetch cleanly:
  const [reqRes, tgtRes] = await Promise.all([
    supabase
      .from('circle_members')
      .select('id, user_id, payout_position, profiles(display_name, email)')
      .eq('id', swap.requester_member_id)
      .maybeSingle(),
    supabase
      .from('circle_members')
      .select('id, user_id, payout_position, profiles(display_name, email)')
      .eq('id', swap.target_member_id)
      .maybeSingle(),
  ]);
  const req = reqRes.data;
  const tgt = tgtRes.data;
  void requester;

  const isOwner = swap.circles?.owner_id === user.id;
  const isTarget = tgt?.user_id === user.id;
  const isRequester = req?.user_id === user.id;

  if (decision === 'cancelled') {
    if (!isRequester) return { error: { form: ['Only the requester can cancel'] } };
  } else {
    // Target can approve/reject; owner can also approve/reject (override)
    if (!isTarget && !isOwner) {
      return { error: { form: ['Not authorized to decide this swap'] } };
    }
  }

  if (decision === 'approved') {
    if (!req || !tgt) return { error: { form: ['Members not found'] } };

    // Only swap before the cycle starts collecting for this position's cycle
    const { data: circle } = await supabase
      .from('circles')
      .select('id, status, current_cycle')
      .eq('id', swap.circle_id)
      .maybeSingle();

    if (circle?.status === 'completed' || circle?.status === 'cancelled') {
      return { error: { form: ['Circle is closed — cannot swap'] } };
    }

    // Atomic-ish swap of payout positions (bypass unique via temp)
    const admin = createAdminSupabaseClient();
    let swapErr: { message?: string } | null = null;
    try {
      // Direct updates with temporary positions to satisfy unique constraint
      const { error: e1 } = await admin
        .from('circle_members')
        .update({ payout_position: -1 })
        .eq('id', req.id);
      if (e1) throw e1;
      const { error: e2 } = await admin
        .from('circle_members')
        .update({ payout_position: req.payout_position })
        .eq('id', tgt.id);
      if (e2) throw e2;
      const { error: e3 } = await admin
        .from('circle_members')
        .update({ payout_position: tgt.payout_position })
        .eq('id', req.id);
      if (e3) throw e3;
    } catch (e) {
      swapErr = e as { message?: string };
    }

    if (swapErr) {
      console.error('[decidePayoutSwap]', swapErr);
      return { error: { form: ['Could not swap positions'] } };
    }
  }

  const { error } = await supabase
    .from('payout_swap_requests')
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', swapId)
    .eq('status', 'pending');

  if (error) {
    console.error('[decidePayoutSwap]', error.message);
    return { error: { form: ['Could not update request'] } };
  }

  if (decision === 'approved' && req && tgt) {
    await ledger(
      swap.circle_id,
      user.id,
      'PAYOUT_ORDER_CHANGED',
      'payout_swap',
      swapId,
      {
        from: { member: req.id, pos: req.payout_position },
        to: { member: tgt.id, pos: tgt.payout_position },
      }
    );
  }

  for (const uid of [req?.user_id, tgt?.user_id]) {
    if (!uid) continue;
    await notify(supabase, {
      userId: uid,
      circleId: swap.circle_id,
      title: `Swap ${decision}`,
      body:
        decision === 'approved'
          ? 'Your payout position swap was approved.'
          : decision === 'rejected'
            ? 'Your payout swap request was rejected.'
            : 'Payout swap request cancelled.',
      data: { circle_id: swap.circle_id, event: 'SWAP_DECIDED', decision },
    });
  }

  revalidatePath(`/dashboard/circles/${swap.circle_id}`);
  return { success: `Swap ${decision}` };
}

// ─── LIFECYCLE: start / pause / resume / complete ────────────

export async function setCircleLifecycle(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const circleId = String(formData.get('circle_id') ?? '');
  const action = String(formData.get('action') ?? '');

  const { data: circle } = await supabase
    .from('circles')
    .select('id, owner_id, status, name, current_cycle, start_date')
    .eq('id', circleId)
    .maybeSingle();

  if (!circle || circle.owner_id !== user.id) {
    return { error: { form: ['Only the owner can manage lifecycle'] } };
  }

  const allowed: Record<string, string[]> = {
    start: ['draft', 'paused'],
    pause: ['active'],
    resume: ['paused'],
    complete: ['active', 'paused'],
  };
  if (!allowed[action]?.includes(circle.status)) {
    return {
      error: { form: [`Cannot ${action} a ${circle.status} circle`] },
    };
  }

  if (action === 'start') {
    // Create first cycle if none
    const { data: existing } = await supabase
      .from('contribution_cycles')
      .select('id')
      .eq('circle_id', circleId)
      .limit(1);

    if (!existing || existing.length === 0) {
      const { data: cycleId, error: rpcErr } = await supabase.rpc(
        'create_next_cycle',
        { p_circle_id: circleId }
      );
      if (rpcErr) {
        console.error('[start] rpc', rpcErr.message);
        return { error: { form: ['Could not create first cycle'] } };
      }
      void cycleId;
    }

    const { error } = await supabase
      .from('circles')
      .update({
        status: 'active',
        start_date: circle.start_date ?? new Date().toISOString(),
      })
      .eq('id', circleId);
    if (error) return { error: { form: ['Could not start circle'] } };
  } else if (action === 'complete') {
    const { error } = await supabase
      .from('circles')
      .update({ status: 'completed' })
      .eq('id', circleId);
    if (error) return { error: { form: ['Could not complete circle'] } };
    await supabase
      .from('contribution_cycles')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('circle_id', circleId)
      .in('status', ['collecting', 'pending', 'payout_pending']);
  } else {
    const next = action === 'pause' ? 'paused' : 'active';
    const { error } = await supabase
      .from('circles')
      .update({ status: next })
      .eq('id', circleId);
    if (error) return { error: { form: ['Could not update circle'] } };
  }

  await ledger(circleId, user.id, 'SETTINGS_CHANGED', 'circle', circleId, {
    lifecycle: action,
  });

  // Notify members
  const { data: members } = await supabase
    .from('circle_members')
    .select('user_id')
    .eq('circle_id', circleId)
    .eq('status', 'active');
  for (const m of members ?? []) {
    if (m.user_id === user.id) continue;
    await notify(supabase, {
      userId: m.user_id,
      circleId,
      title: `Circle ${action}d`,
      body: `"${circle.name}" is now ${action === 'start' ? 'active' : action + 'ed'}.`,
      data: { circle_id: circleId, event: 'SETTINGS_CHANGED' },
    });
  }

  revalidatePath(`/dashboard/circles/${circleId}`);
  return { success: `Circle ${action === 'start' ? 'started' : action + 'ed'}` };
}

export async function advanceCycle(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const circleId = String(formData.get('circle_id') ?? '');
  const action = String(formData.get('action') ?? '');

  const { data: circle } = await supabase
    .from('circles')
    .select('id, owner_id, status, name, current_cycle')
    .eq('id', circleId)
    .maybeSingle();
  if (!circle || circle.owner_id !== user.id) {
    return { error: { form: ['Only the owner can manage cycles'] } };
  }

  if (action === 'close') {
    // Mark current collecting cycle → payout_pending
    const { data: cy } = await supabase
      .from('contribution_cycles')
      .select('id, cycle_number, payout_member_id')
      .eq('circle_id', circleId)
      .eq('status', 'collecting')
      .maybeSingle();
    if (!cy) return { error: { form: ['No collecting cycle to close'] } };

    const { error } = await supabase
      .from('contribution_cycles')
      .update({ status: 'payout_pending' })
      .eq('id', cy.id);
    if (error) return { error: { form: ['Could not close cycle'] } };

    // Ensure payout row exists
    if (cy.payout_member_id) {
      const { data: existingPayout } = await supabase
        .from('payouts')
        .select('id')
        .eq('cycle_id', cy.id)
        .maybeSingle();
      if (!existingPayout) {
        const { data: cyFull } = await supabase
          .from('contribution_cycles')
          .select('expected_amount')
          .eq('id', cy.id)
          .maybeSingle();
        await supabase.from('payouts').insert({
          cycle_id: cy.id,
          recipient_member_id: cy.payout_member_id,
          expected_amount: cyFull?.expected_amount ?? circle.current_cycle,
          status: 'pending',
        });
      }
    }

    await ledger(circleId, user.id, 'PAYOUT_INITIATED', 'cycle', cy.id, {
      cycle_number: cy.cycle_number,
    });
  } else if (action === 'next') {
    const { data: cycleId, error } = await supabase.rpc('create_next_cycle', {
      p_circle_id: circleId,
    });
    if (error) return { error: { form: ['Could not open next cycle'] } };
    void cycleId;
  } else {
    return { error: { form: ['Unknown cycle action'] } };
  }

  revalidatePath(`/dashboard/circles/${circleId}`);
  return {
    success: action === 'close' ? 'Cycle closed — ready for payout' : 'Next cycle opened',
  };
}

// ─── LEAVE / REMOVE MEMBER ───────────────────────────────────

export async function leaveCircle(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const circleId = String(formData.get('circle_id') ?? '');
  if (!circleId) return { error: { form: ['Circle required'] } };

  const { data: circle } = await supabase
    .from('circles')
    .select('id, owner_id, name')
    .eq('id', circleId)
    .maybeSingle();
  if (circle?.owner_id === user.id) {
    return {
      error: { form: ['Owners cannot leave — delete the circle instead'] },
    };
  }

  const { error } = await supabase
    .from('circle_members')
    .update({ status: 'left', left_at: new Date().toISOString() })
    .eq('circle_id', circleId)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) return { error: { form: ['Could not leave circle'] } };

  if (circle?.owner_id) {
    await notify(supabase, {
      userId: circle.owner_id,
      circleId,
      title: 'Member left',
      body: `A member left "${circle.name}".`,
      data: { circle_id: circleId, event: 'MEMBER_LEFT' },
    });
  }

  revalidatePath('/dashboard/circles');
  redirect('/dashboard/circles');
}

export async function removeMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const circleId = String(formData.get('circle_id') ?? '');
  const memberId = String(formData.get('member_id') ?? '');
  if (!circleId || !memberId) return { error: { form: ['Missing fields'] } };

  const { data: circle } = await supabase
    .from('circles')
    .select('id, owner_id, name')
    .eq('id', circleId)
    .maybeSingle();
  if (!circle || circle.owner_id !== user.id) {
    return { error: { form: ['Only the owner can remove members'] } };
  }

  const { data: member } = await supabase
    .from('circle_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('circle_id', circleId)
    .maybeSingle();
  if (!member) return { error: { form: ['Member not found'] } };
  if (member.role === 'owner') {
    return { error: { form: ['Cannot remove the owner'] } };
  }

  const { error } = await supabase
    .from('circle_members')
    .update({ status: 'removed', left_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) return { error: { form: ['Could not remove member'] } };

  await notify(supabase, {
    userId: member.user_id,
    circleId,
    title: 'Removed from circle',
    body: `You were removed from "${circle.name}".`,
    data: { circle_id: circleId, event: 'MEMBER_REMOVED' },
  });

  revalidatePath(`/dashboard/circles/${circleId}`);
  return { success: 'Member removed' };
}

// ─── CONTRIBUTION REPORT / CONFIRM / DISPUTE ─────────────────

export async function reportContribution(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const cycleId = String(formData.get('cycle_id') ?? '');
  const amountKobo = Number(formData.get('amount_kobo') ?? 0);
  const paymentMethod = String(formData.get('payment_method') ?? 'bank_transfer').slice(0, 40);
  const paymentReference = String(formData.get('payment_reference') ?? '').trim().slice(0, 80);
  const proofNote = String(formData.get('proof_note') ?? '').trim().slice(0, 500);
  if (!cycleId || amountKobo <= 0) {
    return { error: { form: ['Valid amount required'] } };
  }

  const { data: member } = await supabase
    .from('circle_members')
    .select('id, circle_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!member) return { error: { form: ['No active membership'] } };

  const { data: cycle } = await supabase
    .from('contribution_cycles')
    .select('id, circle_id, expected_amount, status')
    .eq('id', cycleId)
    .maybeSingle();
  if (!cycle || cycle.circle_id !== member.circle_id) {
    return { error: { form: ['Cycle not found'] } };
  }
  if (cycle.status !== 'collecting') {
    return { error: { form: ['Cycle is not collecting contributions'] } };
  }

  const { data: existing } = await supabase
    .from('contributions')
    .select('id, status, receipt_code')
    .eq('cycle_id', cycleId)
    .eq('member_id', member.id)
    .maybeSingle();

  if (existing && existing.status === 'confirmed') {
    return { error: { form: ['Already confirmed'] } };
  }

  if (existing) {
    const { error } = await supabase
      .from('contributions')
      .update({
        reported_amount: Math.floor(amountKobo),
        status: 'reported',
        reported_at: new Date().toISOString(),
        payment_method: paymentMethod,
        payment_method_preferred: paymentMethod,
        payment_reference: paymentReference || null,
        proof_note: proofNote || null,
        receipt_code:
          existing.receipt_code ||
          `TRN-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36)
            .slice(2, 6)
            .toUpperCase()}`,
      })
      .eq('id', existing.id);
    if (error) return { error: { form: ['Could not report'] } };
  } else {
    const receiptCode = `TRN-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const { error } = await supabase.from('contributions').insert({
      cycle_id: cycleId,
      member_id: member.id,
      expected_amount: cycle.expected_amount,
      reported_amount: Math.floor(amountKobo),
      status: 'reported',
      reported_at: new Date().toISOString(),
      payment_method: paymentMethod,
      payment_method_preferred: paymentMethod,
      payment_reference: paymentReference || null,
      proof_note: proofNote || null,
      receipt_code: receiptCode,
    });
    if (error) return { error: { form: ['Could not report'] } };
  }

  await ledger(member.circle_id, user.id, 'CONTRIBUTION_REPORTED', 'cycle', cycleId, {
    amount: Math.floor(amountKobo),
  });

  // Notify owner
  const { data: circle } = await supabase
    .from('circles')
    .select('owner_id, name')
    .eq('id', member.circle_id)
    .maybeSingle();
  if (circle?.owner_id && circle.owner_id !== user.id) {
    await notify(supabase, {
      userId: circle.owner_id,
      circleId: member.circle_id,
      title: 'Contribution reported',
      body: `A member reported a contribution for "${circle.name}".`,
      data: { circle_id: member.circle_id, event: 'CONTRIBUTION_REPORTED' },
    });
  }

  revalidatePath(`/dashboard/circles/${member.circle_id}`);
  return { success: 'Contribution reported' };
}

export async function decideContribution(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const contributionId = String(formData.get('contribution_id') ?? '');
  const decision = String(formData.get('decision') ?? ''); // confirmed | disputed | rejected

  if (!['confirmed', 'disputed', 'rejected'].includes(decision)) {
    return { error: { form: ['Invalid decision'] } };
  }

  const { data: contribution } = await supabase
    .from('contributions')
    .select('*, contribution_cycles(circle_id, circles(owner_id, name))')
    .eq('id', contributionId)
    .maybeSingle();
  if (!contribution) return { error: { form: ['Not found'] } };

  const cycle = Array.isArray(contribution.contribution_cycles)
    ? contribution.contribution_cycles[0]
    : contribution.contribution_cycles;
  const circle = cycle?.circles
    ? Array.isArray(cycle.circles)
      ? cycle.circles[0]
      : cycle.circles
    : null;
  const circleId = cycle?.circle_id as string | undefined;

  // Owner (admin) decides; member can dispute their own
  const isOwner = circle?.owner_id === user.id;
  const { data: myMember } = await supabase
    .from('circle_members')
    .select('id')
    .eq('circle_id', circleId ?? '')
    .eq('user_id', user.id)
    .maybeSingle();
  const isSelf = myMember?.id === contribution.member_id;

  if (decision === 'disputed') {
    if (!isSelf && !isOwner) {
      return { error: { form: ['Not authorized'] } };
    }
  } else if (!isOwner) {
    return { error: { form: ['Only the circle admin can confirm/reject'] } };
  }

  const updates: Record<string, unknown> = { status: decision };
  if (decision === 'confirmed') updates.confirmed_at = new Date().toISOString();
  if (decision === 'confirmed' && !contribution.receipt_code) {
    updates.receipt_code = `TRN-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
  }

  const { error } = await supabase
    .from('contributions')
    .update(updates)
    .eq('id', contributionId);
  if (error) return { error: { form: ['Could not update contribution'] } };

  const eventType =
    decision === 'confirmed'
      ? 'CONTRIBUTION_CONFIRMED'
      : decision === 'disputed'
        ? 'CONTRIBUTION_DISPUTED'
        : 'CONTRIBUTION_REJECTED';

  if (circleId) {
    await ledger(circleId, user.id, eventType, 'contribution', contributionId, {
      amount: contribution.reported_amount ?? contribution.expected_amount,
    });
  }

  // Wallet update on confirm
  if (decision === 'confirmed') {
    try {
      const admin = createAdminSupabaseClient();
      const { data: member } = await admin
        .from('circle_members')
        .select('user_id, circle_id')
        .eq('id', contribution.member_id)
        .maybeSingle();
      if (member) {
        const amount = contribution.reported_amount ?? contribution.expected_amount;
        await admin.from('wallet_balances').upsert(
          {
            user_id: member.user_id,
            circle_id: member.circle_id,
            paid_amount: amount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,circle_id', ignoreDuplicates: false }
        );
      }
    } catch (e) {
      console.error('[wallet]', e);
    }

    if (isSelf && circle?.owner_id) {
      await notify(supabase, {
        userId: circle.owner_id,
        circleId,
        title: 'Contribution confirmed',
        body: `Your contribution was confirmed${circle.name ? ` for "${circle.name}"` : ''}.`,
        data: { circle_id: circleId, event: 'CONTRIBUTION_CONFIRMED' },
      });
    }
  }

  revalidatePath(`/dashboard/circles/${circleId ?? ''}`);
  revalidatePath('/dashboard/contributions');
  return { success: `Contribution ${decision}` };
}

// ─── TERMS GATE ──────────────────────────────────────────────

export async function acceptTerms(): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('terms_acceptances').upsert(
    { user_id: user.id, version: '2026-09', accepted_at: new Date().toISOString() },
    { onConflict: 'user_id,version', ignoreDuplicates: true }
  );
  if (error && !error.message.includes('duplicate')) {
    return { error: { form: ['Could not save acceptance'] } };
  }
  revalidatePath('/dashboard');
  return { success: 'Terms accepted' };
}

export async function hasAcceptedTerms(
  userId: string
): Promise<boolean> {
  try {
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from('terms_acceptances')
      .select('id')
      .eq('user_id', userId)
      .eq('version', '2026-09')
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

// ─── KYC ─────────────────────────────────────────────────────

export async function submitKyc(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const documentType = String(formData.get('document_type') ?? '');
  const documentNumber = String(formData.get('document_number') ?? '').trim();
  const fullLegalName = String(formData.get('full_legal_name') ?? '').trim();

  if (!['nin', 'bvn', 'id_card'].includes(documentType)) {
    return { error: { form: ['Choose a document type'] } };
  }
  if (documentNumber.length < 6) {
    return { error: { form: ['Enter a valid document number'] } };
  }
  if (fullLegalName.length < 3) {
    return { error: { form: ['Enter your full legal name'] } };
  }

  const { data: existing } = await supabase
    .from('kyc_records')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.status === 'approved') {
    return { error: { form: ['KYC already approved'] } };
  }

  if (existing) {
    const { error } = await supabase
      .from('kyc_records')
      .update({
        document_type: documentType,
        document_number: documentNumber,
        full_legal_name: fullLegalName,
        status: 'pending',
        rejection_reason: null,
      })
      .eq('id', existing.id);
    if (error) return { error: { form: ['Could not submit KYC'] } };
  } else {
    const { error } = await supabase.from('kyc_records').insert({
      user_id: user.id,
      document_type: documentType,
      document_number: documentNumber,
      full_legal_name: fullLegalName,
      status: 'pending',
    });
    if (error) return { error: { form: ['Could not submit KYC'] } };
  }

  revalidatePath('/dashboard/settings');
  return { success: 'KYC submitted for review' };
}

// ─── FRAUD LIMITS helper ─────────────────────────────────────

export async function checkAbuseLimit(
  userId: string,
  action: string,
  maxPerHour: number
): Promise<boolean> {
  try {
    const admin = createAdminSupabaseClient();
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    const { data: row } = await admin
      .from('abuse_counters')
      .select('id, count, window_start')
      .eq('user_id', userId)
      .eq('action', action)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    if (!row) {
      await admin.from('abuse_counters').insert({
        user_id: userId,
        action,
        window_start: windowStart.toISOString(),
        count: 1,
      });
      return true;
    }

    if (row.count >= maxPerHour) return false;

    await admin
      .from('abuse_counters')
      .update({ count: row.count + 1 })
      .eq('id', row.id);
    return true;
  } catch (e) {
    console.error('[abuse]', e);
    return true; // fail open on infra errors
  }
}

// ─── CONRIBUTION REMINDERS (cron-friendly) ───────────────────

export async function sendDueReminders(): Promise<{ sent: number }> {
  const admin = createAdminSupabaseClient();
  const soon = new Date();
  soon.setDate(soon.getDate() + 2);

  const { data: cycles } = await admin
    .from('contribution_cycles')
    .select(
      'id, due_date, expected_amount, circle_id, circles(name, currency, owner_id, contribution_amount)'
    )
    .eq('status', 'collecting')
    .lte('due_date', soon.toISOString().slice(0, 10));

  let sent = 0;
  for (const cy of cycles ?? []) {
    const circle = Array.isArray(cy.circles) ? cy.circles[0] : cy.circles;
    if (!circle) continue;

    const { data: members } = await admin
      .from('circle_members')
      .select('user_id, profiles(email, display_name)')
      .eq('circle_id', cy.circle_id)
      .eq('status', 'active');

    for (const m of members ?? []) {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      if (!profile?.email) continue;

      // Skip already confirmed
      const { data: contrib } = await admin
        .from('contributions')
        .select('id, status')
        .eq('cycle_id', cy.id)
        .eq('member_id', m.user_id)
        .maybeSingle();
      void contrib;
      // member_id is circle_members.id not user_id — check properly
      const { data: memRow } = await admin
        .from('circle_members')
        .select('id')
        .eq('circle_id', cy.circle_id)
        .eq('user_id', m.user_id)
        .maybeSingle();
      if (memRow) {
        const { data: c2 } = await admin
          .from('contributions')
          .select('status')
          .eq('cycle_id', cy.id)
          .eq('member_id', memRow.id)
          .maybeSingle();
        if (c2?.status === 'confirmed') continue;
      }

      const amount = Number(cy.expected_amount);
      const tpl = emailTemplates.contributionReminder(
        profile.email,
        circle.name,
        new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: circle.currency ?? 'NGN',
        }).format(amount / 100),
        new Date(cy.due_date).toLocaleDateString()
      );
      const res = await sendEmail({
        to: profile.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      if (res.success) sent += 1;

      // In-app too
      const admin2 = createAdminSupabaseClient();
      await admin2.from('notifications').insert({
        user_id: m.user_id,
        circle_id: cy.circle_id,
        channel: 'in_app',
        title: 'Contribution due soon',
        body: `Your contribution for "${circle.name}" is due ${new Date(cy.due_date).toLocaleDateString()}.`,
        data: { circle_id: cy.circle_id, event: 'REMINDER' } as never,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      });
    }
  }

  return { sent };
}

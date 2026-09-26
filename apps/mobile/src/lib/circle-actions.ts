/**
 * Circle actions — mobile parity for the web server actions in
 * apps/web/src/lib/circle-actions.ts + circle-features-actions.ts.
 *
 * Writes go straight to Supabase where RLS allows them (owner/member can
 * update circle_members, contributions, payouts; members can append ledger
 * events and in-app notifications). The one privileged path — confirming
 * another member's contribution, which also credits their wallet — goes
 * through /api/mobile/contribution with the signed-in bearer token.
 */
import { postAuth } from './api';
import { supabase } from './supabase';
import { isOfflineError } from './offline';

export type ActionResult = {
  ok: boolean;
  success?: string;
  error?: string;
  offline?: boolean;
};

const ROLES = ['treasurer', 'member', 'observer'] as const;
const DECISIONS = ['confirmed', 'disputed', 'rejected', 'refunded'] as const;

export type Decision = (typeof DECISIONS)[number];

function fail(error: string, offline = false): ActionResult {
  return { ok: false, error, offline };
}

function offlineError(): ActionResult {
  return fail("No connection — we'll sync when you're back online.", true);
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Best-effort in-app notification (RLS: self, or member/owner of the circle). */
async function notify(opts: {
  userId: string;
  circleId?: string | null;
  title: string;
  body: string;
  event?: string;
}): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: opts.userId,
      circle_id: opts.circleId ?? null,
      channel: 'in_app',
      title: opts.title,
      body: opts.body,
      data: { ...(opts.circleId ? { circle_id: opts.circleId } : {}), ...(opts.event ? { event: opts.event } : {}) },
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    });
  } catch {
    /* notifications are best-effort */
  }
}

/** Best-effort append-only ledger row (chained like the web `ledger()` helper). */
async function writeLedger(opts: {
  circleId: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: last } = await supabase
      .from('ledger_events')
      .select('id')
      .eq('circle_id', opts.circleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    await supabase.from('ledger_events').insert({
      circle_id: opts.circleId,
      actor_id: opts.actorId,
      event_type: opts.eventType,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      payload: (opts.payload ?? {}) as never,
      previous_event_id: last?.id ?? null,
    });
  } catch {
    /* ledger is best-effort */
  }
}

function receiptCode(): string {
  return `TRN-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

/* ── Membership ── */

/** Owner cannot leave — same rule and copy as web leaveCircle(). */
export async function leaveCircle(circleId: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail('Sign in required');
  try {
    const { data: circle } = await supabase
      .from('circles')
      .select('id, owner_id, name')
      .eq('id', circleId)
      .maybeSingle();
    if (circle?.owner_id === userId) {
      return fail('Owners cannot leave — delete the circle instead');
    }
    const { error } = await supabase
      .from('circle_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error) return fail('Could not leave circle');
    if (circle?.owner_id) {
      await notify({
        userId: circle.owner_id,
        circleId,
        title: 'Member left',
        body: `A member left "${circle.name}".`,
        event: 'MEMBER_LEFT',
      });
    }
    return { ok: true, success: 'You left the circle' };
  } catch (e) {
    return isOfflineError(e) ? offlineError() : fail('Could not leave circle');
  }
}

export async function removeMember(input: {
  circleId: string;
  memberId: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail('Sign in required');
  try {
    const { data: circle } = await supabase
      .from('circles')
      .select('id, owner_id, name')
      .eq('id', input.circleId)
      .maybeSingle();
    if (!circle || circle.owner_id !== userId) {
      return fail('Only the owner can remove members');
    }
    const { data: member } = await supabase
      .from('circle_members')
      .select('id, user_id, role')
      .eq('id', input.memberId)
      .eq('circle_id', input.circleId)
      .maybeSingle();
    if (!member) return fail('Member not found');
    if (member.role === 'owner') return fail('Cannot remove the owner');

    const { error } = await supabase
      .from('circle_members')
      .update({ status: 'removed', left_at: new Date().toISOString() })
      .eq('id', input.memberId);
    if (error) return fail('Could not remove member');

    await notify({
      userId: member.user_id,
      circleId: input.circleId,
      title: 'Removed from circle',
      body: `You were removed from "${circle.name}".`,
      event: 'MEMBER_REMOVED',
    });
    return { ok: true, success: 'Member removed' };
  } catch (e) {
    return isOfflineError(e) ? offlineError() : fail('Could not remove member');
  }
}

export async function setMemberRole(input: {
  circleId: string;
  memberId: string;
  role: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail('Sign in required');
  if (!ROLES.includes(input.role as (typeof ROLES)[number])) {
    return fail('Invalid role');
  }
  try {
    const { data: circle } = await supabase
      .from('circles')
      .select('id, owner_id')
      .eq('id', input.circleId)
      .maybeSingle();
    if (!circle || circle.owner_id !== userId) {
      return fail('Only the owner can change roles');
    }
    if (input.role === 'owner') return fail('Ownership transfer is not enabled yet');

    const { error } = await supabase
      .from('circle_members')
      .update({ role: input.role })
      .eq('id', input.memberId)
      .eq('circle_id', input.circleId);
    if (error) return fail('Could not update role');

    await writeLedger({
      circleId: input.circleId,
      actorId: userId,
      eventType: 'MEMBER_ROLE_CHANGED',
      entityType: 'member',
      entityId: input.memberId,
      payload: { role: input.role },
    });
    return { ok: true, success: `Role updated to ${input.role}` };
  } catch (e) {
    return isOfflineError(e) ? offlineError() : fail('Could not update role');
  }
}

/**
 * Payout order edit — unique (circle_id, payout_position), so a taken slot is
 * swapped through a free temp value instead of a single write.
 */
export async function movePayoutPosition(input: {
  circleId: string;
  memberId: string;
  position: number;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail('Sign in required');
  const target = Math.floor(input.position);
  if (!Number.isFinite(target) || target < 1) return fail('Enter a position of 1 or more');
  try {
    const { data: circle } = await supabase
      .from('circles')
      .select('id, owner_id')
      .eq('id', input.circleId)
      .maybeSingle();
    if (!circle || circle.owner_id !== userId) {
      return fail('Only the owner can change payout order');
    }
    const { data: rows, error: readErr } = await supabase
      .from('circle_members')
      .select('id, payout_position')
      .eq('circle_id', input.circleId)
      .eq('status', 'active');
    if (readErr) return fail('Could not read payout order');
    const members = (rows ?? []) as { id: string; payout_position: number | null }[];
    const me = members.find((m) => m.id === input.memberId);
    if (!me) return fail('Member not found');
    if ((me.payout_position ?? null) === target) return { ok: true, success: 'Payout order updated' };

    const holder = members.find((m) => m.payout_position === target && m.id !== input.memberId);
    if (holder) {
      const free =
        members.reduce((max, m) => Math.max(max, Number(m.payout_position ?? 0)), 0) + 1;
      const { error: tempErr } = await supabase
        .from('circle_members')
        .update({ payout_position: free })
        .eq('id', input.memberId);
      if (tempErr) return fail('Could not change payout order');
      const { error: swapErr } = await supabase
        .from('circle_members')
        .update({ payout_position: me.payout_position })
        .eq('id', holder.id);
      if (swapErr) return fail('Could not change payout order');
    }
    const { error } = await supabase
      .from('circle_members')
      .update({ payout_position: target })
      .eq('id', input.memberId);
    if (error) return fail('Could not change payout order');

    await writeLedger({
      circleId: input.circleId,
      actorId: userId,
      eventType: 'PAYOUT_ORDER_CHANGED',
      entityType: 'member',
      entityId: input.memberId,
      payload: { position: target },
    });
    return { ok: true, success: `Payout position set to ${target}` };
  } catch (e) {
    return isOfflineError(e) ? offlineError() : fail('Could not change payout order');
  }
}

/* ── Contributions ── */

export async function reportContribution(input: {
  circleId: string;
  cycleId: string;
  expectedAmount: number;
  amountKobo: number;
  paymentMethod?: string;
  paymentReference?: string;
  proofNote?: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail('Sign in required');
  if (!input.cycleId || !(input.amountKobo > 0)) return fail('Valid amount required');
  try {
    const { data: member } = await supabase
      .from('circle_members')
      .select('id, circle_id')
      .eq('circle_id', input.circleId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (!member) return fail('No active membership');

    const { data: cycle } = await supabase
      .from('contribution_cycles')
      .select('id, circle_id, expected_amount, status')
      .eq('id', input.cycleId)
      .maybeSingle();
    if (!cycle || cycle.circle_id !== member.circle_id) return fail('Cycle not found');
    if (cycle.status !== 'collecting') return fail('Cycle is not collecting contributions');

    const method = (input.paymentMethod ?? 'bank_transfer').slice(0, 40);
    const reference = (input.paymentReference ?? '').trim().slice(0, 80);
    const note = (input.proofNote ?? '').trim().slice(0, 500);
    const amount = Math.floor(input.amountKobo);

    const { data: existing } = await supabase
      .from('contributions')
      .select('id, status, receipt_code')
      .eq('cycle_id', input.cycleId)
      .eq('member_id', member.id)
      .maybeSingle();
    if (existing && existing.status === 'confirmed') return fail('Already confirmed');

    if (existing) {
      const { error } = await supabase
        .from('contributions')
        .update({
          reported_amount: amount,
          status: 'reported',
          reported_at: new Date().toISOString(),
          payment_method: method,
          payment_method_preferred: method,
          payment_reference: reference || null,
          proof_note: note || null,
          receipt_code: existing.receipt_code || receiptCode(),
        })
        .eq('id', existing.id);
      if (error) return fail('Could not report');
    } else {
      const { error } = await supabase.from('contributions').insert({
        cycle_id: input.cycleId,
        member_id: member.id,
        expected_amount: cycle.expected_amount ?? input.expectedAmount,
        reported_amount: amount,
        status: 'reported',
        reported_at: new Date().toISOString(),
        payment_method: method,
        payment_method_preferred: method,
        payment_reference: reference || null,
        proof_note: note || null,
        receipt_code: receiptCode(),
      });
      if (error) return fail('Could not report');
    }

    await writeLedger({
      circleId: member.circle_id,
      actorId: userId,
      eventType: 'CONTRIBUTION_REPORTED',
      entityType: 'cycle',
      entityId: input.cycleId,
      payload: { amount },
    });

    const { data: circle } = await supabase
      .from('circles')
      .select('owner_id, name')
      .eq('id', member.circle_id)
      .maybeSingle();
    if (circle?.owner_id && circle.owner_id !== userId) {
      await notify({
        userId: circle.owner_id,
        circleId: member.circle_id,
        title: 'Contribution reported',
        body: `A member reported a contribution for "${circle.name}".`,
        event: 'CONTRIBUTION_REPORTED',
      });
    }
    return { ok: true, success: 'Contribution reported' };
  } catch (e) {
    return isOfflineError(e) ? offlineError() : fail('Could not report');
  }
}

/**
 * Owner confirm/reject (and self dispute) — goes through the mobile API
 * because confirming credits the reporting member's wallet, which RLS only
 * lets that member write. Same validation and copy as web decideContribution().
 */
export async function decideContribution(input: {
  contributionId: string;
  decision: Decision;
}): Promise<ActionResult> {
  if (!DECISIONS.includes(input.decision)) return fail('Invalid decision');
  const res = await postAuth<{ success?: string }>('/api/mobile/contribution', {
    action: 'decide',
    contribution_id: input.contributionId,
    decision: input.decision,
  });
  if (res.ok) return { ok: true, success: res.data?.success ?? `Contribution ${input.decision}` };
  return fail(res.error ?? 'Could not update contribution', Boolean(res.offline));
}

/* ── Payouts ── */

export async function recordPayout(input: {
  payoutId: string;
  step: 'sent' | 'received';
  amountKobo?: number;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail('Sign in required');
  if (input.step !== 'sent' && input.step !== 'received') return fail('Invalid request');
  try {
    const { data: payout } = await supabase
      .from('payouts')
      .select(
        `id, cycle_id, recipient_member_id, status, expected_amount, actual_amount,
         contribution_cycles(circle_id, circles(owner_id, name))`
      )
      .eq('id', input.payoutId)
      .maybeSingle();
    if (!payout) return fail('Payout not found');

    const cycleRel = (payout as unknown as {
      contribution_cycles: {
        circle_id: string;
        circles: { owner_id: string; name: string } | { owner_id: string; name: string }[];
      } | null;
    }).contribution_cycles;
    const cycle = Array.isArray(cycleRel) ? cycleRel[0] : cycleRel;
    const circleRel = cycle?.circles ?? null;
    const circle = Array.isArray(circleRel) ? circleRel[0] : circleRel;
    const circleId = cycle?.circle_id ?? '';
    const circleName = circle?.name ?? 'your circle';
    const isOwner = circle?.owner_id === userId;

    const { data: myMember } = await supabase
      .from('circle_members')
      .select('id, user_id')
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .maybeSingle();
    const isRecipient = Boolean(myMember && myMember.id === payout.recipient_member_id);
    if (!isOwner && !isRecipient) return fail('Not authorized');

    const updates: Record<string, unknown> = {};
    let notifyUserId: string | null = null;
    let title = '';
    let body = '';

    if (input.step === 'sent') {
      if (!isOwner) return fail('Only the circle admin can mark a payout sent');
      if (payout.status !== 'pending' && payout.status !== 'initiated') {
        return fail('Payout is already recorded as sent');
      }
      updates.status = 'sent';
      updates.initiated_at = new Date().toISOString();
      const amount = Number(input.amountKobo ?? 0);
      if (Number.isFinite(amount) && amount > 0) updates.actual_amount = Math.floor(amount);

      const { data: recipient } = await supabase
        .from('circle_members')
        .select('user_id')
        .eq('id', payout.recipient_member_id)
        .maybeSingle();
      notifyUserId = recipient?.user_id ?? null;
      title = 'Payout sent';
      body = `The pot for "${circleName}" was marked as sent. Confirm once it lands.`;
    } else {
      if (payout.status === 'received') return fail('Payout already confirmed');
      updates.status = 'received';
      updates.confirmed_at = new Date().toISOString();
      updates.confirmed_by = userId;
      if (circle?.owner_id && circle.owner_id !== userId) {
        notifyUserId = circle.owner_id;
        title = 'Payout receipt confirmed';
        body = `The recipient confirmed the payout for "${circleName}".`;
      }
    }

    const { error } = await supabase.from('payouts').update(updates).eq('id', input.payoutId);
    if (error) return fail('Could not update payout');

    await writeLedger({
      circleId,
      actorId: userId,
      eventType: input.step === 'sent' ? 'PAYOUT_MARKED_SENT' : 'PAYOUT_RECEIPT_CONFIRMED',
      entityType: 'payout',
      entityId: input.payoutId,
      payload: {
        amount:
          (updates.actual_amount as number | undefined) ??
          (payout.actual_amount as number | null) ??
          (payout.expected_amount as number | null) ??
          0,
      },
    });

    if (notifyUserId) {
      await notify({
        userId: notifyUserId,
        circleId,
        title,
        body,
        event: input.step === 'sent' ? 'PAYOUT_MARKED_SENT' : 'PAYOUT_RECEIPT_CONFIRMED',
      });
    }
    return {
      ok: true,
      success: input.step === 'sent' ? 'Payout marked as sent' : 'Payout receipt confirmed',
    };
  } catch (e) {
    return isOfflineError(e) ? offlineError() : fail('Could not update payout');
  }
}

/* ── Circle settings ── */

export async function updateCircleFees(input: {
  circleId: string;
  feeBps: number;
  networkChargeBps: number;
  feePayer: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail('Sign in required');
  const feeBps = Number(input.feeBps);
  const networkBps = Number(input.networkChargeBps);
  if (
    !Number.isFinite(feeBps) ||
    feeBps < 0 ||
    feeBps > 5000 ||
    !Number.isFinite(networkBps) ||
    networkBps < 0 ||
    networkBps > 5000
  ) {
    return fail('Fee must be between 0% and 50%');
  }
  if (!['member', 'owner', 'shared'].includes(input.feePayer)) return fail('Invalid fee payer');
  try {
    const { data: circle } = await supabase
      .from('circles')
      .select('id, owner_id')
      .eq('id', input.circleId)
      .maybeSingle();
    if (!circle || circle.owner_id !== userId) {
      return fail('Only the circle owner can change fees');
    }
    const { error } = await supabase
      .from('circles')
      .update({
        fee_bps: Math.round(feeBps),
        network_charge_bps: Math.round(networkBps),
        fee_payer: input.feePayer,
      })
      .eq('id', input.circleId);
    if (error) return fail('Could not save fee settings');
    await notify({
      userId,
      circleId: input.circleId,
      title: 'Fee settings updated',
      body: 'Fees for this circle were updated (owner only).',
      event: 'FEES_UPDATED',
    });
    return { ok: true, success: 'Fee settings saved' };
  } catch (e) {
    return isOfflineError(e) ? offlineError() : fail('Could not save fee settings');
  }
}

/** Owner-only circle details (name, description, amount, frequency). */
export async function updateCircleDetails(input: {
  circleId: string;
  name: string;
  description?: string | null;
  contributionAmountKobo: number;
  frequency: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail('Sign in required');
  const name = input.name.trim();
  if (!name) return fail('Enter a circle name');
  if (!['weekly', 'monthly'].includes(input.frequency)) return fail('Invalid frequency');
  const amount = Math.floor(Number(input.contributionAmountKobo));
  if (!Number.isFinite(amount) || amount < 0) return fail('Enter a contribution amount');
  try {
    const { data: circle } = await supabase
      .from('circles')
      .select('id, owner_id')
      .eq('id', input.circleId)
      .maybeSingle();
    if (!circle || circle.owner_id !== userId) {
      return fail('Only the circle owner can edit these details');
    }
    const { error } = await supabase
      .from('circles')
      .update({
        name,
        description: (input.description ?? '').trim() || null,
        contribution_amount: amount,
        frequency: input.frequency,
      })
      .eq('id', input.circleId);
    if (error) return fail('Could not save circle details');
    return { ok: true, success: 'Circle details saved' };
  } catch (e) {
    return isOfflineError(e) ? offlineError() : fail('Could not save circle details');
  }
}

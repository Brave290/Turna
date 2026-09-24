import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import {
  createTransferRecipient,
  initTransfer,
} from '@/lib/paystack';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/payout
 * Body: { cycle_id }
 * Owner-only: after cycle is payout_pending, send pot to recipient's saved bank account.
 */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { cycle_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const cycleId = String(body.cycle_id ?? '');
  if (!cycleId) {
    return NextResponse.json({ error: 'cycle_id required' }, { status: 400 });
  }

  const { data: cycle } = await supabase
    .from('contribution_cycles')
    .select('*, circles!inner(id, owner_id, name, currency, contribution_amount)')
    .eq('id', cycleId)
    .maybeSingle();

  if (!cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  const circle = Array.isArray(cycle.circles) ? cycle.circles[0] : cycle.circles;
  if (!circle || circle.owner_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the circle owner can send payouts' },
      { status: 403 }
    );
  }

  if (cycle.status !== 'payout_pending' && cycle.status !== 'payout_initiated') {
    return NextResponse.json(
      { error: 'Cycle is not ready for payout' },
      { status: 400 }
    );
  }

  if (!cycle.payout_member_id) {
    return NextResponse.json(
      { error: 'No payout recipient assigned for this cycle' },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();

  // Load recipient profile + bank account
  const { data: member } = await admin
    .from('circle_members')
    .select('id, user_id, profiles(id, display_name, email)')
    .eq('id', cycle.payout_member_id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }

  const profile = Array.isArray(member.profiles)
    ? member.profiles[0]
    : member.profiles;

  const { data: bank } = await admin
    .from('bank_accounts')
    .select('*')
    .eq('user_id', member.user_id)
    .eq('is_default', true)
    .maybeSingle();

  if (!bank) {
    return NextResponse.json(
      {
        error: `${profile?.display_name ?? 'Recipient'} has not saved a payout bank account yet`,
      },
      { status: 400 }
    );
  }

  // Pot = contribution * active members
  const { data: activeMembers } = await admin
    .from('circle_members')
    .select('id')
    .eq('circle_id', circle.id)
    .eq('status', 'active');

  const memberCount = (activeMembers ?? []).length || 1;
  const pot = Number(circle.contribution_amount) * memberCount;

  const reference = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const recipient = await createTransferRecipient({
      name: bank.account_name,
      account_number: bank.account_number,
      bank_code: bank.bank_code,
    });

    await admin.from('payments').insert({
      reference,
      user_id: member.user_id,
      circle_id: circle.id,
      cycle_id: cycleId,
      kind: 'payout',
      amount: pot,
      fee_amount: 0,
      network_charge: 0,
      total_amount: pot,
      currency: 'NGN',
      status: 'pending',
      provider: 'paystack',
    });

    await initTransfer({
      recipient_code: recipient.recipient_code,
      amountKobo: pot,
      reference,
      reason: `Turna payout — ${circle.name} cycle ${cycle.cycle_number}`,
    });

    // Mark cycle + payout rows
    await admin
      .from('contribution_cycles')
      .update({ status: 'payout_initiated' })
      .eq('id', cycleId);

    await admin.from('payouts').upsert(
      {
        cycle_id: cycleId,
        recipient_member_id: cycle.payout_member_id,
        expected_amount: pot,
        status: 'initiated',
        initiated_at: new Date().toISOString(),
        notes: `Paystack transfer ${reference}`,
      },
      { onConflict: 'cycle_id,recipient_member_id' }
    );

    await admin.from('ledger_events').insert({
      circle_id: circle.id,
      actor_id: user.id,
      event_type: 'PAYOUT_INITIATED',
      entity_type: 'payout',
      entity_id: cycle.payout_member_id,
      payload: { reference, amount: pot, channel: 'paystack' },
      previous_event_id: null,
    });

    await admin.from('notifications').insert([
      {
        user_id: member.user_id,
        circle_id: circle.id,
        channel: 'in_app',
        title: 'Payout on the way',
        body: `Your payout for ${circle.name} was initiated via bank transfer.`,
        data: { reference, event: 'PAYOUT_INITIATED' } as never,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        circle_id: circle.id,
        channel: 'in_app',
        title: 'Payout initiated',
        body: `Transfer of ${pot} kobo started to ${bank.account_name}.`,
        data: { reference, event: 'PAYOUT_INITIATED' } as never,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      },
    ]);

    revalidatePath('/dashboard/payouts');
    revalidatePath(`/dashboard/circles/${circle.id}`);

    return NextResponse.json({ ok: true, reference, amount: pot });
  } catch (e) {
    console.error('[payout]', e);
    const msg = e instanceof Error ? e.message : 'Transfer failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

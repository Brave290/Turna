import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { initTransaction, computeFees } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/init
 * Body: { circle_id, cycle_id?, amount_kobo? }
 * Creates a pending payment row and returns Paystack checkout URL.
 */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: {
    circle_id?: string;
    cycle_id?: string;
    amount_kobo?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const circleId = String(body.circle_id ?? '');
  if (!circleId) {
    return NextResponse.json({ error: 'circle_id required' }, { status: 400 });
  }

  const { data: circle } = await supabase
    .from('circles')
    .select('id, name, contribution_amount, currency, fee_bps, network_charge_bps, fee_payer, status, owner_id')
    .eq('id', circleId)
    .maybeSingle();

  if (!circle) {
    return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
  }

  const admin = createAdminSupabaseClient();

  // Must be active member (or owner)
  const isOwner = circle.owner_id === user.id;
  if (!isOwner) {
    const { data: membership } = await supabase
      .from('circle_members')
      .select('id, status')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'You are not an active member of this circle' },
        { status: 403 }
      );
    }
  }

  // Terms gate before first real payment
  try {
    const { data: terms } = await admin
      .from('terms_acceptances')
      .select('id')
      .eq('user_id', user.id)
      .eq('version', '2026-09')
      .maybeSingle();
    if (!terms) {
      return NextResponse.json(
        { error: 'terms_required', message: 'Accept the payment terms first' },
        { status: 403 }
      );
    }
  } catch {
    // fail open if table missing
  }

  // Fraud limit: max 30 payment inits / hour
  try {
    const { checkAbuseLimit } = await import('@/lib/circle-actions');
    const ok = await checkAbuseLimit(user.id, 'pay_init', 30);
    if (!ok) {
      return NextResponse.json(
        { error: 'Too many payment attempts. Try again later.' },
        { status: 429 }
      );
    }
  } catch {
    // fail open
  }

  let cycleId: string | null = null;
  if (body.cycle_id) {
    cycleId = String(body.cycle_id);
  } else {
    const { data: cy } = await supabase
      .from('contribution_cycles')
      .select('id')
      .eq('circle_id', circleId)
      .eq('status', 'collecting')
      .order('cycle_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    cycleId = cy?.id ?? null;
  }

  const baseAmount =
    typeof body.amount_kobo === 'number' && body.amount_kobo > 0
      ? Math.floor(body.amount_kobo)
      : Number(circle.contribution_amount);

  const fees = computeFees({
    amountKobo: baseAmount,
    feeBps: Number(circle.fee_bps ?? 0),
    networkChargeBps: Number(circle.network_charge_bps ?? 0),
    feePayer: (circle.fee_payer as 'member' | 'owner' | 'shared') ?? 'member',
    forMember: true,
  });

  const reference = `tna_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { error: insertErr } = await admin.from('payments').insert({
    reference,
    user_id: user.id,
    circle_id: circleId,
    cycle_id: cycleId,
    kind: 'contribution',
    amount: baseAmount,
    fee_amount: fees.fee,
    network_charge: fees.network,
    total_amount: fees.total,
    currency: 'NGN',
    status: 'pending',
    provider: 'paystack',
  });

  if (insertErr) {
    console.error('[payments/init]', insertErr.message);
    return NextResponse.json(
      { error: 'Could not start payment' },
      { status: 500 }
    );
  }

  try {
    const callback = `${process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app'}/dashboard/contributions?paid=1&ref=${reference}`;
    const tx = await initTransaction({
      email: user.email,
      amountKobo: fees.total,
      reference,
      callback_url: callback,
      metadata: {
        circle_id: circleId,
        cycle_id: cycleId,
        kind: 'contribution',
        amount: baseAmount,
        fee: fees.fee,
        network: fees.network,
        user_id: user.id,
      },
    });

    return NextResponse.json({
      url: tx.authorization_url,
      reference: tx.reference,
      total: fees.total,
      base: baseAmount,
      fee: fees.fee,
      network: fees.network,
    });
  } catch (e) {
    console.error('[payments/init] paystack', e);
    await admin.from('payments').delete().eq('reference', reference);
    return NextResponse.json(
      { error: 'Payment provider unavailable. Try again.' },
      { status: 502 }
    );
  }
}

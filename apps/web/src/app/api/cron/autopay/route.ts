import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { chargeAuthorization } from '@/lib/paystack';
import { sendEmail, emailTemplates } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/autopay
 * Vercel cron: charge due contributions for autopay circles
 * using saved Paystack authorizations (first successful charge saved).
 * Idempotent via autopay_charges (cycle_id, user_id).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const admin = createAdminSupabaseClient();
    const today = new Date().toISOString().slice(0, 10);

    // Due (or overdue) collecting cycles on autopay circles
    const { data: cycles } = await admin
      .from('contribution_cycles')
      .select(
        `id, due_date, expected_amount, circle_id,
         circles!inner(id, name, currency, payment_mode, fee_bps, network_charge_bps, fee_payer)`
      )
      .eq('status', 'collecting')
      .lte('due_date', today);

    let charged = 0;
    let skipped = 0;
    let failed = 0;

    for (const cy of cycles ?? []) {
      const circle = Array.isArray(cy.circles) ? cy.circles[0] : cy.circles;
      if (!circle || circle.payment_mode !== 'autopay') continue;

      const { data: members } = await admin
        .from('circle_members')
        .select('id, user_id, profiles(id, email, display_name)')
        .eq('circle_id', cy.circle_id)
        .eq('status', 'active');

      for (const m of members ?? []) {
        const profile = Array.isArray(m.profiles)
          ? m.profiles[0]
          : m.profiles;
        if (!profile?.email) continue;

        // Skip already confirmed
        const { data: existing } = await admin
          .from('contributions')
          .select('id, status')
          .eq('cycle_id', cy.id)
          .eq('member_id', m.id)
          .maybeSingle();
        if (existing?.status === 'confirmed') continue;

        // Idempotent claim
        const { data: claim } = await admin
          .from('autopay_charges')
          .upsert(
            { cycle_id: cy.id, user_id: m.user_id, status: 'pending' },
            { onConflict: 'cycle_id,user_id', ignoreDuplicates: false }
          )
          .select('id, status')
          .maybeSingle();
        if (claim && claim.status === 'success') continue;

        const { data: authRow } = await admin
          .from('payment_authorizations')
          .select('authorization_code, email, reusable')
          .eq('user_id', m.user_id)
          .maybeSingle();

        if (!authRow || !authRow.reusable) {
          skipped += 1;
          await admin
            .from('autopay_charges')
            .update({ status: 'skipped', error: 'no_authorization' })
            .eq('cycle_id', cy.id)
            .eq('user_id', m.user_id);
          continue;
        }

        const feeBps = Number(circle.fee_bps ?? 0);
        const networkBps = Number(circle.network_charge_bps ?? 0);
        const feePayer = (circle.fee_payer as string) ?? 'member';
        const base = Number(cy.expected_amount);
        let fee = Math.floor((base * feeBps) / 10000);
        let network = Math.floor((base * networkBps) / 10000);
        if (feePayer === 'owner') {
          fee = 0;
          network = 0;
        } else if (feePayer === 'shared') {
          const half = Math.floor((fee + network) / 2);
          fee = half;
          network = half;
        }
        const total = base + fee + network;

        const reference = `ap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        try {
          const { data: payment, error: pErr } = await admin
            .from('payments')
            .insert({
              reference,
              user_id: m.user_id,
              circle_id: cy.circle_id,
              cycle_id: cy.id,
              kind: 'contribution',
              amount: base,
              fee_amount: fee,
              network_charge: network,
              total_amount: total,
              currency: 'NGN',
              status: 'pending',
              provider: 'paystack',
            })
            .select('id')
            .maybeSingle();
          if (pErr) throw new Error(pErr.message);

          await chargeAuthorization({
            authorizationCode: authRow.authorization_code,
            email: authRow.email || profile.email,
            amountKobo: total,
            reference,
            metadata: {
              circle_id: cy.circle_id,
              cycle_id: cy.id,
              kind: 'contribution',
              autopay: true,
              user_id: m.user_id,
            },
          });

          await admin
            .from('autopay_charges')
            .update({ status: 'success', payment_id: payment?.id ?? null })
            .eq('cycle_id', cy.id)
            .eq('user_id', m.user_id);
          charged += 1;

          // Immediate confirmation (webhook also confirms; this is belt+braces)
          await admin.from('payments').update({ status: 'success', paid_at: new Date().toISOString() }).eq('reference', reference);

          const amountStr = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: circle.currency ?? 'NGN',
          }).format(total / 100);
          const tpl = emailTemplates.moneyEvent(
            profile.email,
            'Autopay contribution charged',
            amountStr,
            circle.name,
            `Reference ${reference} · due ${cy.due_date}`
          );
          await sendEmail({ to: profile.email, subject: tpl.subject, html: tpl.html, text: tpl.text });

          await admin.from('notifications').insert({
            user_id: m.user_id,
            circle_id: cy.circle_id,
            channel: 'in_app',
            title: 'Autopay charged',
            body: `Your contribution of ${amountStr} for "${circle.name}" was charged automatically.`,
            data: { reference, event: 'AUTOPAY_SUCCESS' } as never,
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          });
        } catch (e) {
          failed += 1;
          const msg = e instanceof Error ? e.message : 'charge_failed';
          await admin
            .from('autopay_charges')
            .update({ status: 'failed', error: msg.slice(0, 200) })
            .eq('cycle_id', cy.id)
            .eq('user_id', m.user_id);
          console.error('[autopay]', m.user_id, msg);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      charged,
      skipped,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[cron/autopay]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Autopay failed' },
      { status: 500 }
    );
  }
}

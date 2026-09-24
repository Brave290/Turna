import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import {
  verifyWebhookSignature,
  verifyTransaction,
} from '@/lib/paystack';

export const dynamic = 'force-dynamic';

/**
 * Paystack webhook — POST /api/payments/webhook
 * Marks payments success/failed and confirms matching contributions.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  const ok = await verifyWebhookSignature(raw, signature);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      amount?: number;
      status?: string;
      paid_at?: string;
      metadata?: Record<string, unknown>;
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const eventType = event.event ?? '';
  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminSupabaseClient();

  try {
    if (
      eventType === 'charge.success' ||
      eventType === 'transfer.success' ||
      eventType === 'payment.success'
    ) {
      // Double-check with Paystack API (never trust webhook alone for money)
      let verifiedStatus = event.data?.status ?? 'success';
      try {
        const v = await verifyTransaction(reference);
        verifiedStatus = v.status;
      } catch {
        // transfer events may not verify as transactions — keep webhook status
      }

      if (verifiedStatus !== 'success' && eventType === 'charge.success') {
        await admin
          .from('payments')
          .update({ status: 'failed', provider_payload: event as never })
          .eq('reference', reference);
        return NextResponse.json({ received: true });
      }

      const { data: payment } = await admin
        .from('payments')
        .select('id, kind, cycle_id, user_id, amount, status')
        .eq('reference', reference)
        .maybeSingle();

      if (!payment) {
        return NextResponse.json({ received: true, note: 'unknown reference' });
      }

      await admin
        .from('payments')
        .update({
          status: 'success',
          paid_at: event.data?.paid_at ?? new Date().toISOString(),
          provider_payload: event as never,
        })
        .eq('reference', reference);

      // Contribution payment → mark contribution reported/confirmed
      if (payment.kind === 'contribution' && payment.cycle_id) {
        const { data: member } = await admin
          .from('circle_members')
          .select('id')
          .eq('circle_id', (payment as { circle_id?: string | null }).circle_id ?? '')
          .eq('user_id', payment.user_id)
          .maybeSingle();

        // Fallback: find member by cycle via join
        let memberId = member?.id ?? null;
        if (!memberId) {
          const { data: cy } = await admin
            .from('contribution_cycles')
            .select('circle_id')
            .eq('id', payment.cycle_id)
            .maybeSingle();
          if (cy) {
            const { data: m2 } = await admin
              .from('circle_members')
              .select('id')
              .eq('circle_id', cy.circle_id)
              .eq('user_id', payment.user_id)
              .maybeSingle();
            memberId = m2?.id ?? null;
          }
        }

        if (memberId) {
          const { data: cycle } = await admin
            .from('contribution_cycles')
            .select('expected_amount')
            .eq('id', payment.cycle_id)
            .maybeSingle();

          await admin.from('contributions').upsert(
            {
              cycle_id: payment.cycle_id,
              member_id: memberId,
              expected_amount: cycle?.expected_amount ?? payment.amount,
              reported_amount: payment.amount,
              payment_method: 'paystack',
              status: 'reported',
              reported_at: new Date().toISOString(),
            },
            { onConflict: 'cycle_id,member_id' }
          );

          // Auto-confirm online payments (Paystack is source of truth)
          await admin
            .from('contributions')
            .update({
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
            })
            .eq('cycle_id', payment.cycle_id)
            .eq('member_id', memberId)
            .eq('status', 'reported');

          await admin.from('ledger_events').insert({
            circle_id:
              (payment as { circle_id?: string | null }).circle_id ??
              '00000000-0000-0000-0000-000000000000',
            actor_id: payment.user_id,
            event_type: 'CONTRIBUTION_CONFIRMED',
            entity_type: 'contribution',
            entity_id: payment.id,
            payload: {
              reference,
              amount: payment.amount,
              channel: 'paystack',
            },
            previous_event_id: null,
          });

          // Notify payer
          await admin.from('notifications').insert({
            user_id: payment.user_id,
            circle_id:
              (payment as { circle_id?: string | null }).circle_id ?? null,
            channel: 'in_app',
            title: 'Payment received',
            body: `Your contribution of ${payment.amount} kobo was confirmed via Paystack.`,
            data: { reference, event: 'PAYMENT_SUCCESS' } as never,
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          });
        }
      }

      if (eventType === 'transfer.success') {
        await admin
          .from('payments')
          .update({ status: 'success' })
          .eq('reference', reference);
      }
    } else if (
      eventType === 'charge.failed' ||
      eventType === 'transfer.failed' ||
      eventType === 'payment.failed'
    ) {
      await admin
        .from('payments')
        .update({ status: 'failed', provider_payload: event as never })
        .eq('reference', reference);
    } else if (eventType === 'transfer.reversed') {
      await admin
        .from('payments')
        .update({ status: 'refunded', provider_payload: event as never })
        .eq('reference', reference);
    }
  } catch (e) {
    console.error('[paystack-webhook]', e);
    // Still 200 so Paystack doesn't retry forever on our bugs; log for ops
  }

  return NextResponse.json({ received: true });
}

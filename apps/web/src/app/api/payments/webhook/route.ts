import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import {
  verifyWebhookSignature,
  verifyTransaction,
} from '@/lib/paystack';
import { sendEmail, emailTemplates } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Paystack webhook — POST /api/payments/webhook
 * Marks payments success/failed, confirms contributions, saves
 * autopay authorization, notifies payout receipt on transfer.success.
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
      authorization?: {
        authorization_code?: string;
        channel?: string | null;
        last4?: string | null;
        bank?: string | null;
        reusable?: boolean;
      };
      recipient?: {
        name?: string;
        bank_name?: string;
      };
      transfers?: unknown;
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
        .select(
          'id, kind, cycle_id, user_id, amount, status, circle_id, currency'
        )
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

      // Save reusable authorization for autopay (first successful charge)
      const auth = event.data?.authorization;
      if (auth?.authorization_code && auth.reusable !== false) {
        const { data: payer } = await admin
          .from('profiles')
          .select('email')
          .eq('id', payment.user_id)
          .maybeSingle();
        const email =
          (event.data?.metadata as { email?: string } | undefined)?.email ??
          payer?.email ??
          '';
        if (email) {
          await admin.from('payment_authorizations').upsert(
            {
              user_id: payment.user_id,
              authorization_code: auth.authorization_code,
              email,
              channel: auth.channel ?? null,
              last4: auth.last4 ?? null,
              bank: auth.bank ?? null,
              reusable: auth.reusable ?? true,
            },
            { onConflict: 'user_id' }
          );
        }
      }

      // Contribution payment → mark contribution reported/confirmed
      if (payment.kind === 'contribution' && payment.cycle_id) {
        const { data: member } = await admin
          .from('circle_members')
          .select('id')
          .eq('circle_id', payment.circle_id ?? '')
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
            circle_id: payment.circle_id ?? '00000000-0000-0000-0000-000000000000',
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

          // Notify payer (in-app + email digest-style)
          await admin.from('notifications').insert({
            user_id: payment.user_id,
            circle_id: payment.circle_id ?? null,
            channel: 'in_app',
            title: 'Payment received',
            body: `Your contribution of ${payment.amount} kobo was confirmed via Paystack.`,
            data: { reference, event: 'PAYMENT_SUCCESS' } as never,
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          });

          try {
            const { data: prof } = await admin
              .from('profiles')
              .select('email, display_name')
              .eq('id', payment.user_id)
              .maybeSingle();
            const { data: circ } = payment.circle_id
              ? await admin
                  .from('circles')
                  .select('name, currency')
                  .eq('id', payment.circle_id)
                  .maybeSingle()
              : { data: null };
            if (prof?.email) {
              const naira = new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: circ?.currency ?? payment.currency ?? 'NGN',
              }).format(Number(payment.amount) / 100);
              const tpl = emailTemplates.moneyEvent(
                prof.email,
                'Contribution paid',
                naira,
                circ?.name ?? 'your circle',
                `Reference ${reference}`
              );
              await sendEmail({
                to: prof.email,
                subject: tpl.subject,
                html: tpl.html,
                text: tpl.text,
              });
            }
          } catch (e) {
            console.error('[webhook] contribution email', e);
          }
        }
      }

      // Payout receipt — transfer landed in member bank
      if (eventType === 'transfer.success' || payment.kind === 'payout') {
        await admin
          .from('payouts')
          .update({
            status: 'received',
            confirmed_at: event.data?.paid_at ?? new Date().toISOString(),
            notes: `Paystack transfer ${reference} success`,
          })
          .eq('cycle_id', payment.cycle_id ?? '')
          .in('status', ['initiated', 'sent', 'pending']);

        if (payment.cycle_id) {
          await admin
            .from('contribution_cycles')
            .update({ status: 'payout_confirmed' })
            .eq('id', payment.cycle_id)
            .in('status', ['payout_initiated', 'payout_pending']);
        }

        await admin.from('ledger_events').insert({
          circle_id: payment.circle_id ?? '00000000-0000-0000-0000-000000000000',
          actor_id: payment.user_id,
          event_type: 'PAYOUT_RECEIPT_CONFIRMED',
          entity_type: 'payment',
          entity_id: payment.id,
          payload: {
            reference,
            amount: payment.amount,
            channel: 'paystack',
            auto: true,
          },
          previous_event_id: null,
        });

        await admin.from('notifications').insert({
          user_id: payment.user_id,
          circle_id: payment.circle_id ?? null,
          channel: 'in_app',
          title: 'Payout received',
          body: `Your payout of ${payment.amount} kobo has been delivered to your bank account.`,
          data: {
            reference,
            event: 'PAYOUT_SUCCESS',
            receipt: `/receipt/${reference}`,
          } as never,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        });

        try {
          const { data: prof } = await admin
            .from('profiles')
            .select('email, display_name')
            .eq('id', payment.user_id)
            .maybeSingle();
          const { data: circ } = payment.circle_id
            ? await admin
                .from('circles')
                .select('name, currency')
                .eq('id', payment.circle_id)
                .maybeSingle()
            : { data: null };
          if (prof?.email) {
            const naira = new Intl.NumberFormat('en-NG', {
              style: 'currency',
              currency: circ?.currency ?? payment.currency ?? 'NGN',
            }).format(Number(payment.amount) / 100);
            const tpl = emailTemplates.payoutReceipt(
              prof.email,
              circ?.name ?? 'your circle',
              naira,
              reference,
              event.data?.recipient?.bank_name
            );
            await sendEmail({
              to: prof.email,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
            });
          }
        } catch (e) {
          console.error('[webhook] payout email', e);
        }
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

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { ShareReceiptButton } from '@/components/dashboard/share-receipt-button';

export const dynamic = 'force-dynamic';

function ShareReceiptInline({ reference }: { reference: string }) {
  return (
    <ShareReceiptButton
      code={reference}
      reference={reference}
      label="Share receipt"
    />
  );
}

type ReceiptParams = {
  params: { reference: string };
  searchParams?: { type?: string };
};

/**
 * Branded receipt — public path for payment/payout confirmation.
 * URL: /receipt/[reference]
 */
export default async function ReceiptPage({ params }: ReceiptParams) {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server');
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reference = params.reference;

  const { data: payment } = await supabase
    .from('payments')
    .select(
      `*,
       circles(id, name, currency),
       contribution_cycles(id, cycle_number)`
    )
    .eq('reference', reference)
    .maybeSingle();

  if (!payment) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <p className="font-display text-xl font-bold text-forest mb-2">
            Receipt not found
          </p>
          <p className="text-sm text-muted mb-6">
            This reference does not match a Turna payment.
          </p>
          <Link href="/dashboard" className="btn-primary inline-flex">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const circle = Array.isArray(payment.circles)
    ? payment.circles[0]
    : payment.circles;
  const cycle = Array.isArray(payment.contribution_cycles)
    ? payment.contribution_cycles[0]
    : payment.contribution_cycles;
  const currency = (circle?.currency as string) ?? payment.currency ?? 'NGN';
  const paid = payment.status === 'success';

  return (
    <div className="min-h-dvh bg-forest relative overflow-hidden">
      {/* Brand orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-30"
          style={{
            background: 'radial-gradient(circle, #007A65 0%, transparent 70%)',
            top: '-15%',
            right: '-20%',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[90px] opacity-20"
          style={{
            background: 'radial-gradient(circle, #7C5CFF 0%, transparent 70%)',
            bottom: '-10%',
            left: '-15%',
          }}
        />
      </div>

      <div className="relative z-10 min-h-dvh flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Logo variant="on-dark" size={32} />
            <span className="font-display text-xl font-bold text-white tracking-tight">
              Turna
            </span>
          </div>

          {/* Receipt card */}
          <div className="rounded-3xl border border-white/10 bg-white shadow-card overflow-hidden">
            {/* Success band */}
            <div
              className={`px-6 py-5 flex items-center gap-3 ${
                paid ? 'bg-primary/10' : 'bg-warning/10'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  paid ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-forest">
                  {paid ? 'Payment successful' : payment.status === 'failed' ? 'Payment failed' : 'Payment pending'}
                </p>
                <p className="text-xs text-muted capitalize">
                  {payment.kind} · {payment.provider}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-border/60">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
                Amount
              </p>
              <p className="font-display text-4xl font-bold text-forest tracking-tight">
                {formatCurrency(payment.total_amount, currency)}
              </p>
              {(payment.fee_amount > 0 || payment.network_charge > 0) && (
                <p className="text-xs text-muted mt-2">
                  Base {formatCurrency(payment.amount, currency)}
                  {payment.fee_amount > 0 &&
                    ` · fee ${formatCurrency(payment.fee_amount, currency)}`}
                  {payment.network_charge > 0 &&
                    ` · network ${formatCurrency(payment.network_charge, currency)}`}
                </p>
              )}
            </div>

            {/* Line items */}
            <dl className="px-6 py-5 space-y-3 text-sm">
              <Row label="Reference" value={<span className="font-mono text-xs">{payment.reference}</span>} />
              <Row label="Circle" value={circle?.name ?? '—'} />
              {cycle && <Row label="Cycle" value={`#${cycle.cycle_number}`} />}
              <Row label="Date" value={formatDate(payment.paid_at ?? payment.created_at)} />
              <Row label="Status" value={<span className="capitalize">{payment.status}</span>} />
              <Row label="Paid by" value={user?.email ?? '—'} />
            </dl>

            {/* Footer stamp */}
            <div className="px-6 py-4 border-t border-border/60 bg-cream/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted">
                <Logo variant="primary" size={22} />
                <span className="text-[11px] leading-tight">
                  Official Turna receipt
                  <br />
                  turnaapp.vercel.app
                </span>
              </div>
              <div
                className={`badge ${paid ? 'bg-primary/10 text-primary' : 'bg-warning/15 text-warning'}`}
              >
                {paid ? 'PAID' : payment.status.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-outline border-white/20 text-white hover:bg-white/10"
            >
              Print / Save PDF
            </button>
            <Link
              href="/dashboard"
              className="btn-primary justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          <div className="mt-3">
            <ShareReceiptInline reference={payment.reference} />
          </div>

          <p className="text-center text-xs text-white/40 mt-6">
            Keep this reference for support. Receipts are also listed under Payments.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className="text-forest font-medium text-right min-w-0 break-all">{value}</dd>
    </div>
  );
}

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { ShareReceiptButton } from '@/components/dashboard/share-receipt-button';

export const dynamic = 'force-dynamic';

/**
 * Public receipt verification: /verify/TRN-...
 * Also accepts payment references.
 */
export default async function VerifyPage({
  params,
}: {
  params: { code: string };
}) {
  const code = decodeURIComponent(params.code || '').trim();
  const admin = createServerSupabaseClient();

  // Prefer contribution receipt codes (authenticated RLS may block — try user then admin-less path)
  let contribution: Record<string, unknown> | null = null;
  let payment: Record<string, unknown> | null = null;

  try {
    const { data: c } = await admin
      .from('contributions')
      .select(
        `id, receipt_code, reported_amount, expected_amount, status, confirmed_at, reported_at,
         contribution_cycles(cycle_number, due_date, circles(name, currency, frequency))
       `
      )
      .eq('receipt_code', code)
      .maybeSingle();
    contribution = (c as Record<string, unknown>) ?? null;
  } catch {
    contribution = null;
  }

  if (!contribution) {
    try {
      const { data: p } = await admin
        .from('payments')
        .select(
          `id, reference, amount, total_amount, status, paid_at, created_at, kind,
           circles(name, currency)
         `
        )
        .eq('reference', code)
        .maybeSingle();
      payment = (p as Record<string, unknown>) ?? null;
    } catch {
      payment = null;
    }
  }

  const found = !!contribution || !!payment;

  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-forest/80 hover:text-forest">
          <Logo variant="primary" size={24} />
          <span className="font-display text-lg font-bold">Turna</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md animate-fade-in">
          <div className="card text-center">
            <div
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4 ${
                found ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'
              }`}
            >
              {found ? <ShieldCheck className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7 opacity-30" />}
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted mb-1">
              Verify Turna record
            </p>
            <p className="font-mono text-sm text-forest break-all mb-3">{code}</p>

            {found ? (
              <>
                <p className="font-display text-xl font-bold text-forest mb-1">
                  Authentic Turna record
                </p>
                <VerifyContribution contribution={contribution} />
                <VerifyPayment payment={payment} />
                <div className="mt-5 flex flex-col gap-2">
                  <ShareReceiptButton code={code} label="Share receipt" />
                </div>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-bold text-forest mb-2">
                  No matching record
                </p>
                <p className="text-sm text-muted">
                  This code does not match a Turna contribution or payment.
                  Check the code and try again.
                </p>
              </>
            )}
          </div>

          <div className="mt-5 flex justify-center">
            <Link href="/" className="btn-outline">
              <ArrowLeft className="w-4 h-4" /> Back to Turna
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function VerifyContribution({
  contribution,
}: {
  contribution: Record<string, unknown> | null;
}) {
  if (!contribution) return null;
  const cycleRel = contribution.contribution_cycles;
  const cycle = Array.isArray(cycleRel) ? cycleRel[0] : cycleRel;
  const circleRel = cycle ? (cycle as { circles?: unknown }).circles : null;
  const circle = Array.isArray(circleRel) ? circleRel[0] : circleRel;
  const amount = Number(contribution.reported_amount ?? contribution.expected_amount ?? 0);
  const currency = (circle as { currency?: string } | null)?.currency ?? 'NGN';
  const name = (circle as { name?: string } | null)?.name ?? 'Circle';
  const status = String(contribution.status ?? '');
  const date = String(
    contribution.confirmed_at ?? contribution.reported_at ?? contribution.created_at ?? ''
  );

  return (
    <dl className="text-left space-y-2 text-sm mt-4 pt-4 border-t border-border">
      <Row label="Circle" value={name} />
      <Row label="Amount" value={formatCurrency(amount, currency)} />
      <Row label="Date" value={date ? formatDate(date) : '—'} />
      <Row
        label="Status"
        value={<span className="capitalize">{status}</span>}
      />
      <Row
        label="Confirmation ID"
        value={<span className="font-mono text-xs">{String(contribution.receipt_code ?? '—')}</span>}
      />
    </dl>
  );
}

function VerifyPayment({ payment }: { payment: Record<string, unknown> | null }) {
  if (!payment) return null;
  const circleRel = payment.circles;
  const circle = Array.isArray(circleRel) ? circleRel[0] : circleRel;
  const amount = Number(payment.total_amount ?? payment.amount ?? 0);
  const currency = (circle as { currency?: string } | null)?.currency ?? 'NGN';
  const date = String(payment.paid_at ?? payment.created_at ?? '');

  return (
    <dl className="text-left space-y-2 text-sm mt-4 pt-4 border-t border-border">
      <Row label="Circle" value={(circle as { name?: string } | null)?.name ?? '—'} />
      <Row label="Amount" value={formatCurrency(amount, currency)} />
      <Row label="Date" value={date ? formatDate(date) : '—'} />
      <Row label="Status" value={<span className="capitalize">{String(payment.status)}</span>} />
      <Row
        label="Reference"
        value={<span className="font-mono text-xs">{String(payment.reference)}</span>}
      />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-forest font-medium text-right min-w-0 break-all">{value}</dd>
    </div>
  );
}

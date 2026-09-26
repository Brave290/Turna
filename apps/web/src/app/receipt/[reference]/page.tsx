import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Download } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { ShareReceiptButton } from '@/components/dashboard/share-receipt-button';

export const dynamic = 'force-dynamic';

function first<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type Receipt = {
  reference: string;
  kindLabel: string;
  status: string;
  circleName: string;
  currency: string;
  cycleNumber: number | null;
  amount: number;
  baseAmount: number | null;
  fee: number;
  network: number;
  total: number;
  date: string;
  payer: string;
  method: string | null;
  transferReference: string | null;
};

type ReceiptParams = {
  params: { reference: string };
  searchParams?: { type?: string };
};

/**
 * Branded receipt — the record of a contribution or payout settled
 * directly between members. Printable: browser print → PDF.
 * URL: /receipt/[reference]
 */
export default async function ReceiptPage({ params }: ReceiptParams) {
  const { createServerSupabaseClient } = await import('@/lib/supabase-server');
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reference = decodeURIComponent(params.reference ?? '').trim();

  let receipt: Receipt | null = null;

  // 1) Contribution receipt code (manual flow)
  try {
    const { data } = await supabase
      .from('contributions')
      .select(
        `id, receipt_code, status, reported_amount, expected_amount, payment_method,
         payment_reference, confirmed_at, reported_at, created_at,
         contribution_cycles(cycle_number, circles(name, currency)),
         circle_members(profiles(display_name, email))`
      )
      .eq('receipt_code', reference)
      .maybeSingle();

    const c = data as unknown as {
      receipt_code: string | null;
      status: string;
      reported_amount: number | null;
      expected_amount: number;
      payment_method: string | null;
      payment_reference: string | null;
      confirmed_at: string | null;
      reported_at: string | null;
      created_at: string;
      contribution_cycles: {
        cycle_number?: number;
        circles: { name: string; currency: string } | null;
      } | null;
      circle_members: {
        profiles: { display_name?: string | null; email?: string | null } | null;
      } | null;
    } | null;

    if (c) {
      const cycle = first(c.contribution_cycles ?? null);
      const circle = first(cycle?.circles ?? null);
      const member = first(c.circle_members ?? null);
      const profile = first(member?.profiles ?? null);
      const amount = c.reported_amount ?? c.expected_amount;
      receipt = {
        reference: c.receipt_code ?? reference,
        kindLabel: 'Contribution',
        status: c.status,
        circleName: circle?.name ?? 'Circle',
        currency: circle?.currency ?? 'NGN',
        cycleNumber: cycle?.cycle_number ?? null,
        amount,
        baseAmount: null,
        fee: 0,
        network: 0,
        total: amount,
        date: c.confirmed_at ?? c.reported_at ?? c.created_at,
        payer:
          profile?.display_name ?? profile?.email ?? user?.email ?? 'Member',
        method: c.payment_method,
        transferReference: c.payment_reference,
      };
    }
  } catch {
    receipt = null;
  }

  // 2) Legacy gateway payment record (kept for old references)
  if (!receipt) {
    try {
      const { data } = await supabase
        .from('payments')
        .select(
          `*,
           circles(id, name, currency),
           contribution_cycles(id, cycle_number)`
        )
        .eq('reference', reference)
        .maybeSingle();

      const p = data as {
        reference: string;
        kind?: string;
        status: string;
        amount: number;
        total_amount: number;
        fee_amount?: number;
        network_charge?: number;
        currency?: string;
        paid_at?: string | null;
        created_at: string;
        payment_method?: string | null;
        circles: { name: string; currency: string } | null;
        contribution_cycles: { cycle_number?: number } | null;
      } | null;

      if (p) {
        const circle = first(p.circles ?? null);
        const cycle = first(p.contribution_cycles ?? null);
        receipt = {
          reference: p.reference,
          kindLabel: p.kind === 'payout' ? 'Payout' : 'Contribution',
          status: p.status,
          circleName: circle?.name ?? 'Circle',
          currency: circle?.currency ?? p.currency ?? 'NGN',
          cycleNumber: cycle?.cycle_number ?? null,
          amount: p.amount,
          baseAmount: p.amount,
          fee: Number(p.fee_amount ?? 0),
          network: Number(p.network_charge ?? 0),
          total: p.total_amount,
          date: p.paid_at ?? p.created_at,
          payer: user?.email ?? 'Member',
          method: p.payment_method ?? null,
          transferReference: null,
        };
      }
    } catch {
      receipt = null;
    }
  }

  if (!receipt) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-4">
        <div className="card max-w-md text-center no-print">
          <p className="font-display text-xl font-bold text-forest mb-2">
            Receipt not found
          </p>
          <p className="text-sm text-muted mb-6">
            This reference does not match a Turna record.
          </p>
          <Link href="/" className="btn-primary inline-flex">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const paid =
    receipt.status === 'confirmed' ||
    receipt.status === 'received' ||
    receipt.status === 'success';

  return (
    <div className="min-h-dvh bg-cream print:bg-white">
      <header className="no-print border-b border-border bg-white/90">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-forest/80 hover:text-forest"
          >
            <Logo variant="primary" size={24} />
            <span className="font-display text-lg font-bold">Turna</span>
          </Link>
          <span className="text-xs uppercase tracking-[0.18em] text-muted">
            Receipt
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <article className="bg-white rounded-3xl border border-border shadow-card overflow-hidden print:rounded-none print:shadow-none print:border-0">
          {/* Brand header */}
          <div className="px-6 sm:px-8 py-6 flex items-center justify-between gap-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Image
                src="/turna-logo-enhanced-trimmed.png"
                alt="Turna"
                width={44}
                height={44}
                className="rounded-xl object-contain"
                priority
              />
              <div>
                <p className="font-display text-lg font-bold text-forest leading-tight">
                  Turna
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">
                  Receipt
                </p>
              </div>
            </div>
            <StatusBadge status={receipt.status} />
          </div>

          {/* Circle + amount */}
          <div className="px-6 sm:px-8 pt-8 pb-7 text-center border-b border-border">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
              {receipt.kindLabel}
            </p>
            <p className="font-display text-xl font-semibold text-forest mt-1.5">
              {receipt.circleName}
              {receipt.cycleNumber != null && (
                <span className="text-muted font-normal">
                  {' '}
                  · cycle {receipt.cycleNumber}
                </span>
              )}
            </p>
            <p className="font-display text-5xl font-bold text-forest tracking-tight mt-5">
              {formatCurrency(receipt.total, receipt.currency)}
            </p>
            {receipt.fee > 0 || receipt.network > 0 ? (
              <p className="text-xs text-muted mt-3">
                Base {formatCurrency(receipt.baseAmount ?? receipt.amount, receipt.currency)}
                {receipt.fee > 0 &&
                  ` · fee ${formatCurrency(receipt.fee, receipt.currency)}`}
                {receipt.network > 0 &&
                  ` · network ${formatCurrency(receipt.network, receipt.currency)}`}
              </p>
            ) : (
              <p className="text-xs text-muted mt-3">Settled directly — no processing fee</p>
            )}
            <span
              className={`badge mt-4 ${paid ? 'bg-primary/10 text-primary' : 'bg-warning/15 text-warning'}`}
            >
              {paid ? 'PAID' : receipt.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>

          {/* Details */}
          <dl className="px-6 sm:px-8 py-7 space-y-4 text-sm">
            <Row label="Paid by" value={receipt.payer} />
            <Row
              label="Paid to"
              value={
                <span>
                  {receipt.circleName}
                  <span className="text-muted font-normal"> · circle admin</span>
                </span>
              }
            />
            <Row
              label="Reference"
              value={<span className="font-mono text-xs">{receipt.reference}</span>}
            />
            {receipt.transferReference && (
              <Row
                label="Transfer ref"
                value={
                  <span className="font-mono text-xs">{receipt.transferReference}</span>
                }
              />
            )}
            {receipt.method && (
              <Row
                label="Method"
                value={receipt.method.replace(/_/g, ' ')}
              />
            )}
            <Row label="Date" value={formatDate(receipt.date)} />
            <Row
              label="Status"
              value={<span className="capitalize">{receipt.status.replace(/_/g, ' ')}</span>}
            />
          </dl>

          {/* Footer stamp */}
          <div className="px-6 sm:px-8 py-5 border-t border-border bg-cream/70 print:bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted">
              <Logo variant="primary" size={20} />
              <span className="text-[11px] leading-tight">
                Turna — trusted community savings
                <br />
                turnaapp.vercel.app
              </span>
            </div>
            <span className="text-[11px] text-muted text-right">
              Keep this reference
              <br />
              for support
            </span>
          </div>
        </article>

        {/* Actions */}
        <div className="no-print mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary justify-center"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <Link href="/" className="btn-outline justify-center">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="no-print mt-4">
          <ShareReceiptButton
            code={receipt.reference}
            reference={receipt.reference}
            circleName={receipt.circleName}
            amountLabel={formatCurrency(receipt.total, receipt.currency)}
            label="Share receipt"
          />
        </div>

        <p className="no-print text-center text-xs text-muted mt-6">
          Receipts are also listed under Payments.
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className="text-forest font-medium text-right min-w-0 break-all">
        {value}
      </dd>
    </div>
  );
}

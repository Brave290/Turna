import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { AdminCronPanel } from '@/components/dashboard/admin-cron-panel';
import { KycReviewActions } from '@/components/dashboard/kyc-review-actions';
import {
  ShieldAlert,
  Users,
  CircleDot,
  CreditCard,
  UserCheck,
  Activity,
  Link2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

function flatten<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Full platform ops dashboard — KYC queue with approve/reject,
 * payments, circles, members, health, manual cron triggers.
 * Gated by ADMIN_EMAILS env (comma-separated allowlist).
 */
export default async function AdminPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect('/dashboard');
  }

  const admin = createAdminSupabaseClient();

  const [kycRes, payRes, circleRes, memberRes, userRes, healthCount, autopayRes] =
    await Promise.all([
      admin
        .from('kyc_records')
        .select(
          'id, user_id, document_type, document_number, full_legal_name, status, rejection_reason, created_at, profiles(email, display_name)'
        )
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('payments')
        .select(
          'id, reference, kind, amount, total_amount, status, created_at, currency, user_id, circle_id, circles(name)'
        )
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('circles')
        .select(
          'id, name, status, contribution_amount, currency, owner_id, payment_mode, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(30),
      admin
        .from('circle_members')
        .select('id, circle_id, user_id, status, created_at, circles(name)')
        .order('created_at', { ascending: false })
        .limit(30),
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('id').limit(1),
      admin
        .from('autopay_charges')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  const kycRows = (kycRes.data ?? []) as unknown as {
    id: string;
    user_id: string;
    document_type: string;
    document_number: string;
    full_legal_name: string;
    status: string;
    rejection_reason: string | null;
    created_at: string;
    profiles: unknown;
  }[];

  const payRows = (payRes.data ?? []) as unknown as {
    id: string;
    reference: string;
    kind: string;
    amount: number;
    total_amount: number;
    status: string;
    created_at: string;
    currency: string;
    circle_id: string | null;
    circles: unknown;
  }[];

  const circleRows = (circleRes.data ?? []) as unknown as {
    id: string;
    name: string;
    status: string;
    contribution_amount: number;
    currency: string;
    payment_mode?: string;
    created_at: string;
  }[];

  const autopayRows = (autopayRes.data ?? []) as unknown as {
    id: string;
    status: string;
    created_at: string;
  }[];

  const pendingKyc = kycRows.filter((k) => k.status === 'pending').length;
  const successPay = payRows.filter((p) => p.status === 'success');
  const volume = successPay.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalCount = userRes.count ?? 0;
  const dbHealthy = !healthCount.error;
  const autopayOk = autopayRows.filter((a) => a.status === 'success').length;
  const autopayFail = autopayRows.filter((a) => a.status === 'failed').length;
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app'
  ).replace(/\/$/, '');

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
            Ops dashboard
          </h1>
          <p className="text-muted mt-1">Platform overview for {user.email}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            dbHealthy ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'
          }`}
        >
          DB {dbHealthy ? 'healthy' : 'degraded'}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Users} label="Users" value={String(totalCount)} />
        <Metric
          icon={CircleDot}
          label="Circles"
          value={String(circleRows.length)}
          sub={`${circleRows.filter((c) => c.status === 'active').length} active (recent)`}
        />
        <Metric
          icon={CreditCard}
          label="Payment volume"
          value={formatCurrency(volume)}
          sub={`${successPay.length} recent success`}
        />
        <Metric
          icon={UserCheck}
          label="KYC pending"
          value={String(pendingKyc)}
          sub={`${kycRows.length} total in queue`}
        />
      </div>

      <AdminCronPanel />

      <section className="card">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-semibold text-forest">KYC queue</h2>
          <span className="text-xs text-muted">
            {pendingKyc} awaiting review
          </span>
        </div>
        {kycRows.length === 0 ? (
          <p className="text-sm text-muted">No KYC submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Doc</th>
                  <th className="py-2 pr-3 font-medium">Number</th>
                  <th className="py-2 pr-3 font-medium">Submitted</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kycRows.map((k) => {
                  const p = flatten<{
                    email?: string;
                    display_name?: string;
                  }>(k.profiles as never);
                  return (
                    <tr key={k.id}>
                      <td className="py-3 pr-3 text-forest font-medium">
                        {k.full_legal_name}
                      </td>
                      <td className="py-3 pr-3 text-muted">{p?.email ?? '—'}</td>
                      <td className="py-3 pr-3 text-muted uppercase">
                        {k.document_type}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-forest">
                        {k.document_number}
                      </td>
                      <td className="py-3 pr-3 text-muted">
                        {formatDate(k.created_at)}
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={k.status} />
                      </td>
                      <td className="py-3">
                        <KycReviewActions id={k.id} status={k.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-forest">Cron endpoints</h2>
        </div>
        <p className="text-sm text-muted mb-3">
          For cron-job.org — set HTTP GET, custom header{' '}
          <code className="font-mono text-xs">x-cron-secret</code> (or query{' '}
          <code className="font-mono text-xs">?secret=</code>) to your
          CRON_SECRET value.
        </p>
        <ul className="space-y-2 text-sm">
          {[
            { path: '/api/cron/db-ping', when: 'Daily (keep-alive)', must: true },
            { path: '/api/cron/reminders', when: 'Daily 09:00 UTC', must: false },
            { path: '/api/cron/autopay', when: 'Daily 06:00 UTC', must: false },
            { path: '/api/cron/digest', when: 'Daily 20:00 UTC', must: false },
            {
              path: '/api/health',
              when: 'Daily 12:00 UTC (public ping)',
              must: false,
            },
          ].map((c) => (
            <li
              key={c.path}
              className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-forest break-all">
                  {base}
                  {c.path}
                </p>
                <p className="text-xs text-muted">{c.when}</p>
              </div>
              <span
                className={`text-[10px] uppercase font-medium px-2 py-0.5 rounded-full ${
                  c.must
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-border text-muted'
                }`}
              >
                {c.must ? 'external recommended' : 'vercel cron'}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-3 flex-wrap text-xs text-muted">
          <span>
            Autopay runs: {autopayOk} ok · {autopayFail} failed (recent)
          </span>
          <Activity className="w-3.5 h-3.5" />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="font-semibold text-forest mb-4">Recent payments</h2>
          {payRows.length === 0 ? (
            <p className="text-sm text-muted">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {payRows.slice(0, 12).map((p) => {
                const c = flatten<{ name?: string }>(p.circles as never);
                return (
                  <li
                    key={p.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-forest truncate">
                        {p.reference}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {c?.name ?? '—'} · {p.kind}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium text-forest">
                        {formatCurrency(Number(p.amount), p.currency)}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/dashboard/payments"
            className="inline-block mt-3 text-sm text-primary hover:underline"
          >
            Full payments history
          </Link>
        </section>

        <section className="card">
          <h2 className="font-semibold text-forest mb-4">Recent circles</h2>
          {circleRows.length === 0 ? (
            <p className="text-sm text-muted">No circles yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {circleRows.slice(0, 12).map((c) => (
                <li
                  key={c.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/circles/${c.id}`}
                      className="font-medium text-forest hover:text-primary truncate block"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs text-muted capitalize">
                      {c.payment_mode ?? 'manual'} · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-forest">
                      {formatCurrency(c.contribution_amount, c.currency)}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="font-semibold text-forest mb-4">Recent member joins</h2>
        {(memberRes.data ?? []).length === 0 ? (
          <p className="text-sm text-muted">No memberships yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {((memberRes.data ?? []) as unknown as {
              id: string;
              status: string;
              circles: unknown;
            }[]).map((m) => {
              const c = flatten<{ name?: string }>(m.circles as never);
              return (
                <li
                  key={m.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <span className="text-forest truncate">{c?.name ?? '—'}</span>
                  <StatusBadge status={m.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm text-muted">{label}</p>
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-forest tracking-tight">
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

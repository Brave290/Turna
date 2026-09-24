'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  UserPlus,
  Users,
  Clock3,
  Wallet,
} from 'lucide-react';
import { useToast } from '@/components/toast';
import { formatCurrency } from '@/lib/utils';
import { periodKey, shiftPeriod, formatPeriodLabel } from '@/lib/solo-data';
import { useSoloLedger } from './use-solo-ledger';
import { ExportShareBar } from './export-share-bar';
import { AddContributorForm } from './add-contributor-form';
import { EntrySheet } from './entry-sheet';

type ServerContributor = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  expected_amount: number;
  sort_order: number;
  archived: boolean;
};

type ServerEntry = {
  contributor_id: string;
  period: string;
  status: string;
  amount_paid: number;
  paid_on: string | null;
  note: string | null;
  local_updated_at?: string;
};

export function SoloLedgerBoard({
  ledgerId,
  name,
  currency,
  defaultAmount,
  description,
  contributors: serverContributors,
  entries: serverEntries,
}: {
  ledgerId: string;
  name: string;
  currency: string;
  defaultAmount: number;
  description?: string | null;
  contributors: ServerContributor[];
  entries: ServerEntry[];
}) {
  const toast = useToast();
  const [period, setPeriod] = useState(() => periodKey());
  const [selected, setSelected] = useState<{
    contributor: ServerContributor | { id: string; name: string; expected_amount: number };
    period: string;
  } | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const solo = useSoloLedger({
    ledgerId,
    name,
    currency,
    defaultAmount,
    description,
    contributors: serverContributors,
    entries: serverEntries,
  });

  const stats = solo.statsFor(period);

  const exportFor = useCallback(
    (format: string) => {
      if (format === 'pdf') solo.exportPdf(period);
      else solo.downloadCsv(period);
    },
    [solo, period]
  );

  async function shareSummary() {
    const lines = [
      `${name} — ${formatPeriodLabel(period)}`,
      `Collected: ${formatCurrency(stats.collected, currency)}`,
      `Expected: ${formatCurrency(stats.expected, currency)}`,
      `Paid: ${stats.paid}/${solo.contributors.length}`,
      `Outstanding: ${formatCurrency(Math.max(0, stats.expected - stats.collected), currency)}`,
      `— via Turna`,
    ].join('\n');
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text: lines });
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(lines);
      toast.success('Summary copied to clipboard');
    } catch {
      toast.error('Could not share');
    }
  }

  function remindUnpaid() {
    const unpaid = solo.contributors.filter((c) => {
      const e = solo.entryMap.get(`${c.id}|${period}`);
      return !e || e.status !== 'paid';
    });
    if (unpaid.length === 0) {
      toast.info('Everyone is paid for this month');
      return;
    }
    const lines = unpaid.map((c) => {
      const e = solo.entryMap.get(`${c.id}|${period}`);
      const due = (c.expected_amount || defaultAmount) - (e?.amount_paid ?? 0);
      const amount = formatCurrency(Math.max(0, due), currency);
      const msg = `Hi ${c.name}, your ${name} contribution for ${formatPeriodLabel(period)} is still outstanding (${amount}). Thank you!`;
      return c.phone
        ? `wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
        : null;
    });
    if (lines.length && lines[0]) {
      window.open(lines[0], '_blank');
      toast.success(`Opened reminder for ${unpaid[0].name} (${unpaid.length} unpaid)`);
    } else {
      const text = unpaid
        .map((c) => c.name)
        .join(', ');
      void navigator.clipboard
        .writeText(`Remind unpaid in ${name}: ${text}`)
        .then(() => toast.success('Unpaid list copied'));
    }
  }

  const syncLabel =
    solo.syncState === 'syncing'
      ? 'Syncing…'
      : solo.syncState === 'offline'
        ? 'Offline — saved locally'
        : solo.syncState === 'error'
          ? 'Sync error — will retry'
          : solo.lastSynced
            ? 'Synced'
            : 'Local';

  const rows = useMemo(
    () =>
      solo.contributors.map((c) => ({
        c,
        entry: solo.entryMap.get(`${c.id}|${period}`),
      })),
    [solo.contributors, solo.entryMap, period]
  );

  return (
    <div className="space-y-5" data-solo-board>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost btn-sm px-2"
            onClick={() => setPeriod(shiftPeriod(period, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Period</p>
            <p className="font-display text-lg font-bold text-forest">
              {formatPeriodLabel(period)}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost btn-sm px-2"
            onClick={() => setPeriod(shiftPeriod(period, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="btn-outline btn-sm ml-1"
            onClick={() => setPeriod(periodKey())}
          >
            This month
          </button>
        </div>
        <ExportShareBar
          onExport={(f) => exportFor(f)}
          onShare={shareSummary}
          onRemind={remindUnpaid}
          formatOpen={solo.exportOpen}
          setFormatOpen={solo.setExportOpen}
          canRemind={solo.contributors.length > 0}
          pendingCount={solo.pendingCount}
          syncLabel={syncLabel}
          period={period}
        />
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={<Wallet className="w-4 h-4" />}
          label="Collected this month"
          value={formatCurrency(stats.collected, currency)}
        />
        <Stat
          icon={<Clock3 className="w-4 h-4" />}
          label="Expected"
          value={formatCurrency(stats.expected, currency)}
        />
        <Stat
          icon={<Check className="w-4 h-4" />}
          label="Paid"
          value={`${stats.paid} / ${solo.contributors.length}`}
        />
        <Stat
          icon={<Minus className="w-4 h-4" />}
          label="Outstanding"
          value={formatCurrency(Math.max(0, stats.expected - stats.collected), currency)}
        />
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold text-forest">Contributors</h2>
              <p className="text-xs text-muted mt-0.5">
                Tap a cell to mark paid / partial / unpaid — works offline.
              </p>
            </div>
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4" /> Add
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted mb-4">
              No contributors yet. Add the people in your ajo to start tracking monthly
              payments.
            </p>
            <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
              <UserPlus className="w-4 h-4" /> Add first contributor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border bg-cream/50">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-3 font-medium">Expected</th>
                  <th className="py-3 px-3 font-medium">Paid</th>
                  <th className="py-3 px-3 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ c, entry }) => {
                  const status = entry?.status ?? 'unpaid';
                  return (
                    <tr key={c.id} className="hover:bg-cream/40">
                      <td className="py-3 px-4">
                        <p className="font-medium text-forest">{c.name}</p>
                        {c.phone && <p className="text-xs text-muted">{c.phone}</p>}
                      </td>
                      <td className="py-3 px-3 text-muted">
                        {formatCurrency(c.expected_amount || defaultAmount, currency)}
                      </td>
                      <td className="py-3 px-3 text-forest font-medium tabular-nums">
                        {formatCurrency(entry?.amount_paid ?? 0, currency)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`badge text-[11px] ${
                            status === 'paid'
                              ? 'bg-primary/10 text-primary'
                              : status === 'partial'
                                ? 'bg-warning/15 text-warning'
                                : 'bg-forest/10 text-forest'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() =>
                              void solo.markEntry({
                                contributor_id: c.id,
                                period,
                                status: 'paid',
                                amount_paid: c.expected_amount || defaultAmount,
                              })
                            }
                          >
                            <Check className="w-3.5 h-3.5" /> Mark paid
                          </button>
                          <button
                            type="button"
                            className="btn-outline btn-sm"
                            onClick={() => setSelected({ contributor: c, period })}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAdd && (
        <AddContributorForm
          ledgerId={ledgerId}
          defaultAmount={defaultAmount}
          currency={currency}
          onClose={() => setShowAdd(false)}
          onAdd={async (p) => {
            await solo.addContributor(p);
            toast.success(`${p.name} added (offline-safe)`);
            setShowAdd(false);
          }}
        />
      )}

      {selected && (
        <EntrySheet
          contributorName={selected.contributor.name}
          expected={selected.contributor.expected_amount || defaultAmount}
          currency={currency}
          period={selected.period}
          initial={
            solo.entryMap.get(`${selected.contributor.id}|${selected.period}`) ?? null
          }
          onClose={() => setSelected(null)}
          onSave={async (payload) => {
            await solo.markEntry({
              contributor_id: selected.contributor.id,
              period: selected.period,
              ...payload,
            });
            toast.success('Saved');
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </span>
      </div>
      <p className="font-display text-lg font-bold text-forest tracking-tight tabular-nums truncate">
        {value}
      </p>
    </div>
  );
}

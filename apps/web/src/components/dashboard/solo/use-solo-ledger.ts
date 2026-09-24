'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCachedLedger,
  queueEntry,
  queueContributor,
  takePending,
  clearPending,
  mergeServerIntoCache,
  offlineUuid,
  type CachedEntry,
  type CachedContributor,
} from '@/lib/solo-local';
import {
  bulkSyncSoloEntries,
  bulkSyncSoloContributors,
  updateSoloEntry,
  addSoloContributor,
  type SoloActionState,
} from '@/lib/solo-actions';
import { formatCurrency } from '@/lib/utils';

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

export type ExportFormat = 'pdf' | 'csv';

function entryKey(c: string, p: string) {
  return `${c}|${p}`;
}

/**
 * Offline-first Solo Ledger controller:
 * - UI always reads local cache first (instant, works offline)
 * - Mutations queue then flush to server actions when online
 */
export function useSoloLedger(input: {
  ledgerId: string;
  name: string;
  currency: string;
  defaultAmount: number;
  description?: string | null;
  contributors: ServerContributor[];
  entries: ServerEntry[];
}) {
  const { ledgerId } = input;
  const [tick, setTick] = useState(0);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'offline' | 'error'>(
    'idle'
  );
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  // Seed / merge server → cache
  const serverKeys = JSON.stringify(input.contributors);
  const serverEntryKeys = JSON.stringify(input.entries);
  useEffect(() => {
    mergeServerIntoCache(ledgerId, {
      name: input.name,
      currency: input.currency,
      default_amount: input.defaultAmount,
      description: input.description,
      contributors: input.contributors.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        note: c.note,
        expected_amount: c.expected_amount,
        sort_order: c.sort_order,
        archived: c.archived,
      })),
      entries: input.entries.map((e) => ({
        contributor_id: e.contributor_id,
        period: e.period,
        status: e.status,
        amount_paid: e.amount_paid,
        paid_on: e.paid_on,
        note: e.note,
        local_updated_at: e.local_updated_at,
      })),
    });
    bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId, input.name, serverKeys, serverEntryKeys]);

  const cached = getCachedLedger(ledgerId);

  const flush = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState('offline');
      return;
    }
    const pending = takePending(ledgerId);
    if (pending.entries.length === 0 && pending.contributors.length === 0) {
      setSyncState('idle');
      return;
    }
    setSyncState('syncing');
    try {
      if (pending.contributors.length) {
        const res = await bulkSyncSoloContributors(
          ledgerId,
          pending.contributors.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            note: c.note,
            expected_amount: c.expected_amount,
            sort_order: c.sort_order,
            local_updated_at: c.local_updated_at,
          }))
        );
        if (!res.ok) throw new Error(res.error);
        clearPending(ledgerId, [], pending.contributors.map((c) => c.id));
      }
      if (pending.entries.length) {
        const res = await bulkSyncSoloEntries(
          pending.entries.map((e) => ({
            ledger_id: ledgerId,
            contributor_id: e.contributor_id,
            period: e.period,
            status: e.status,
            amount_paid: e.amount_paid,
            paid_on: e.paid_on,
            note: e.note,
            local_updated_at: e.local_updated_at,
          }))
        );
        if (!res.ok) throw new Error(res.error);
        clearPending(
          ledgerId,
          pending.entries.map((e) => entryKey(e.contributor_id, e.period)),
          []
        );
      }
      setSyncState('idle');
      setLastSynced(new Date().toISOString());
    } catch {
      setSyncState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
    }
  }, [ledgerId]);

  useEffect(() => {
    void flush();
    const on = () => void flush();
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, [flush]);

  const markEntry = useCallback(
    async (params: {
      contributor_id: string;
      period: string;
      status: 'paid' | 'unpaid' | 'partial';
      amount_paid: number;
      paid_on?: string | null;
      note?: string | null;
    }) => {
      const entry: CachedEntry = {
        contributor_id: params.contributor_id,
        period: params.period,
        status: params.status,
        amount_paid: params.amount_paid,
        paid_on:
          params.paid_on !== undefined
            ? params.paid_on
            : params.status === 'paid'
              ? new Date().toISOString().slice(0, 10)
              : null,
        note: params.note ?? null,
        local_updated_at: new Date().toISOString(),
      };
      queueEntry(ledgerId, entry);
      bump();
      // optimistic server attempt
      const fd = new FormData();
      fd.set('ledger_id', ledgerId);
      fd.set('contributor_id', entry.contributor_id);
      fd.set('period', entry.period);
      fd.set('status', entry.status);
      fd.set('amount_paid', String(entry.amount_paid / 100));
      fd.set('paid_on', entry.paid_on ?? '');
      fd.set('note', entry.note ?? '');
      fd.set('local_updated_at', entry.local_updated_at);
      try {
        if (!navigator.onLine) throw new Error('offline');
        const res: SoloActionState = await updateSoloEntry(null, fd);
        if (res?.error?.form?.[0]) throw new Error(res.error.form[0]);
        clearPending(ledgerId, [entryKey(entry.contributor_id, entry.period)], []);
        setSyncState('idle');
        setLastSynced(new Date().toISOString());
      } catch {
        setSyncState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
      }
    },
    [ledgerId, bump]
  );

  const addContributor = useCallback(
    async (params: { name: string; phone?: string; note?: string; expected_amount: number }) => {
      const localId = offlineUuid();
      const c: CachedContributor = {
        id: localId,
        name: params.name,
        phone: params.phone ?? null,
        note: params.note ?? null,
        expected_amount: params.expected_amount,
        sort_order: (cached?.contributors.length ?? 0) + 1,
        local_updated_at: new Date().toISOString(),
      };
      queueContributor(ledgerId, c);
      bump();
      const fd = new FormData();
      fd.set('ledger_id', ledgerId);
      fd.set('name', c.name);
      fd.set('phone', c.phone ?? '');
      fd.set('note', c.note ?? '');
      fd.set('expected_amount', String(c.expected_amount / 100));
      try {
        if (!navigator.onLine) throw new Error('offline');
        const res: SoloActionState = await addSoloContributor(null, fd);
        if (res?.error?.form?.[0]) throw new Error(res.error.form[0]);
        clearPending(ledgerId, [], [localId]);
        setSyncState('idle');
      } catch {
        setSyncState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
      }
      return localId;
    },
    [ledgerId, cached?.contributors.length, bump]
  );

  // tick re-computes after bump(); cached object is mutated in place
  const contributors = useMemo(() => {
    void tick;
    return cached?.contributors ?? [];
  }, [cached, tick]);
  const entries = useMemo(() => {
    void tick;
    return cached?.entries ?? [];
  }, [cached, tick]);
  const pendingCount =
    (cached?.pendingEntries?.length ?? 0) + (cached?.pendingContributors?.length ?? 0);

  const entryMap = useMemo(() => {
    const m = new Map<string, CachedEntry>();
    // tick forces re-read after local mutations (cache is mutable in place)
    void tick;
    entries.forEach((e) => m.set(entryKey(e.contributor_id, e.period), e));
    return m;
  }, [entries, tick]);

  const statsFor = useCallback(
    (period: string) => {
      let collected = 0;
      let expected = 0;
      let paid = 0;
      let unpaid = 0;
      contributors.forEach((c) => {
        const exp = c.expected_amount || input.defaultAmount;
        expected += exp;
        const e = entryMap.get(entryKey(c.id, period));
        if (e && e.status !== 'unpaid') {
          collected += e.amount_paid;
          if (e.status === 'paid') paid += 1;
          else unpaid += 1;
        } else {
          unpaid += 1;
        }
      });
      return { collected, expected, paid, unpaid };
    },
    [contributors, entryMap, input.defaultAmount]
  );

  function downloadCsv(period: string) {
    const headers = [
      'Name',
      'Phone',
      'Expected',
      'Paid',
      'Status',
      'Paid on',
      'Note',
      'Period',
    ];
    const rows = contributors.map((c) => {
      const e = entryMap.get(entryKey(c.id, period));
      return [
        c.name,
        c.phone ?? '',
        (c.expected_amount || input.defaultAmount) / 100,
        (e?.amount_paid ?? 0) / 100,
        e?.status ?? 'unpaid',
        e?.paid_on ?? '',
        e?.note ?? '',
        period,
      ];
    });
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${input.name.replace(/[^\w-]+/g, '-').toLowerCase()}-${period}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function exportPdf(period: string) {
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) return;
    const stats = statsFor(period);
    const rowsHtml = contributors
      .map((c) => {
        const e = entryMap.get(entryKey(c.id, period));
        const status = e?.status ?? 'unpaid';
        const color =
          status === 'paid' ? '#007a65' : status === 'partial' ? '#b7791f' : '#4a5d73';
        return `<tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.phone ?? '—')}</td>
          <td class="num">${formatCurrency(c.expected_amount || input.defaultAmount, input.currency)}</td>
          <td class="num">${formatCurrency(e?.amount_paid ?? 0, input.currency)}</td>
          <td class="status" style="color:${color}">${status.toUpperCase()}</td>
          <td>${escapeHtml(e?.paid_on ?? '—')}</td>
          <td>${escapeHtml(e?.note ?? '')}</td>
        </tr>`;
      })
      .join('');
    win.document.write(`<!doctype html>
<html><head><title>${escapeHtml(input.name)} — ${period}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; margin: 0; color: #0a1628; background: #fff; }
  .page { padding: 40px 44px; }
  .brand { display:flex; align-items:center; gap:12px; border-bottom:3px solid #007a65; padding-bottom:16px; margin-bottom:24px; }
  .mark { width:44px; height:44px; background:#007a65; color:#fff; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700; }
  h1 { font-size:26px; margin:0; letter-spacing:-0.5px; }
  .sub { color:#4a5d73; font-size:13px; margin-top:4px; }
  .meta { display:flex; gap:16px; margin:20px 0; flex-wrap:wrap; }
  .card { background:#f4f6f9; border:1px solid #e3e8ef; border-radius:10px; padding:12px 16px; min-width:140px; }
  .card .label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#4a5d73; }
  .card .value { font-size:20px; font-weight:700; margin-top:4px; color:#0a1628; }
  table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
  th { text-align:left; background:#0a1628; color:#fff; padding:10px 8px; font-weight:600; }
  td { padding:10px 8px; border-bottom:1px solid #e3e8ef; }
  td.num, th.num { text-align:right; font-variant-numeric: tabular-nums; }
  td.status { font-weight:700; font-size:11px; letter-spacing:0.5px; }
  .footer { margin-top:28px; padding-top:16px; border-top:1px solid #e3e8ef; color:#4a5d73; font-size:11px; display:flex; justify-content:space-between; }
  @media print { .page { padding: 20px; } }
</style></head>
<body><div class="page">
  <div class="brand">
    <div class="mark">T</div>
    <div>
      <h1>${escapeHtml(input.name)}</h1>
      <div class="sub">Turna Solo Ledger · ${escapeHtml(formatPeriod(period))} · ${escapeHtml(input.currency)}</div>
    </div>
  </div>
  <div class="meta">
    <div class="card"><div class="label">Collected</div><div class="value">${formatCurrency(stats.collected, input.currency)}</div></div>
    <div class="card"><div class="label">Expected</div><div class="value">${formatCurrency(stats.expected, input.currency)}</div></div>
    <div class="card"><div class="label">Paid</div><div class="value">${stats.paid}/${contributors.length}</div></div>
    <div class="card"><div class="label">Outstanding</div><div class="value">${formatCurrency(Math.max(0, stats.expected - stats.collected), input.currency)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Name</th><th>Phone</th><th class="num">Expected</th><th class="num">Paid</th>
      <th>Status</th><th>Paid on</th><th>Note</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">
    <span>Generated by Turna · turnaapp.vercel.app</span>
    <span>${new Date().toLocaleString('en-NG')}</span>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`);
    win.document.close();
    setExportOpen(false);
  }

  return {
    ledgerId,
    currency: input.currency,
    defaultAmount: input.defaultAmount,
    contributors,
    entryMap,
    statsFor,
    markEntry,
    addContributor,
    syncState,
    pendingCount,
    lastSynced,
    flush,
    exportOpen,
    setExportOpen,
    downloadCsv,
    exportPdf,
  };
}

function formatPeriod(period: string) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

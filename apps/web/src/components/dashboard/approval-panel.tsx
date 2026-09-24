'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, CheckCircle2, UserPlus, RefreshCw } from 'lucide-react';
import {
  requestApproval,
  approveRequest,
  type FeatureActionState,
} from '@/lib/circle-features-actions';
import { useToast } from '@/components/toast';
import { formatDate } from '@/lib/utils';

type ApprovalRow = {
  id: string;
  action: string;
  status: string;
  requester_id: string;
  required_approvals: number;
  approvals: { user_id: string; at?: string }[];
  created_at: string;
  requester_name?: string | null;
};

const ACTION_PRESETS = [
  { key: 'payout_send', label: 'Release payout' },
  { key: 'role_change', label: 'Change role' },
  { key: 'fee_change', label: 'Update fees' },
  { key: 'refund', label: 'Issue refund' },
];

/**
 * Dual-control panel: owner/treasurer can open an approval request
 * (needs a second authorized person) and approve pending ones.
 */
export function ApprovalPanel({
  circleId,
  requests,
  myUserId,
  canRequest = true,
}: {
  circleId: string;
  requests: ApprovalRow[];
  myUserId: string;
  canRequest?: boolean;
}) {
  const toast = useToast();
  const [rows, setRows] = useState(requests);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(ACTION_PRESETS[0].key);
  const [busy, startTransitionLike] = useState(false);
  const lastKey = useRef('');

  useEffect(() => setRows(requests), [requests]);

  const notify = useCallback(
    (res: FeatureActionState) => {
      if (res?.success) toast.success(res.success);
      else if (res?.error?.form?.[0]) toast.error(res.error.form[0]);
      else toast.error('Action failed');
    },
    [toast]
  );

  function requestCode() {
    if (busy) return;
    startTransitionLike(true);
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('action', preset);
    fd.set('payload', JSON.stringify({ via: 'approval_panel' }));
    void requestApproval(null, fd)
      .then((res) => {
        notify(res);
        if (res?.success) {
          setOpen(false);
          const optimistic: ApprovalRow = {
            id: `local-${Date.now()}`,
            action: preset,
            status: 'pending',
            requester_id: myUserId,
            required_approvals: 2,
            approvals: [{ user_id: myUserId }],
            created_at: new Date().toISOString(),
            requester_name: 'You',
          };
          setRows((prev) => [optimistic, ...prev]);
        }
      })
      .finally(() => startTransitionLike(false));
  }

  function approve(id: string) {
    if (pendingId) return;
    setPendingId(id);
    const fd = new FormData();
    fd.set('request_id', id);
    void approveRequest(null, fd)
      .then((res) => {
        notify(res);
        const key = res?.success ?? res?.error?.form?.[0] ?? '';
        if (key !== lastKey.current) {
          lastKey.current = key;
        }
        setRows((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            const approvals = [...(r.approvals ?? []), { user_id: myUserId }];
            const done = approvals.length >= (r.required_approvals ?? 2);
            return {
              ...r,
              approvals,
              status: res?.success ? (done ? 'approved' : 'pending') : r.status,
            };
          })
        );
        setRows((prev) => prev.filter((r) => !(r.id.startsWith('local-') && res?.error)));
      })
      .finally(() => setPendingId(null));
  }

  const pending = rows.filter((r) => r.status === 'pending');
  const resolved = rows.filter((r) => r.status !== 'pending').slice(0, 8);

  return (
    <section className="card" data-approval-panel>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-forest">Dual approvals</h2>
            <p className="text-xs text-muted mt-0.5">
              Sensitive actions need 2 of 2 authorized people.
            </p>
          </div>
        </div>
        {canRequest && (
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={() => setOpen((v) => !v)}
          >
            <UserPlus className="w-4 h-4" />
            Request
          </button>
        )}
      </div>

      {open && canRequest && (
        <div className="mb-4 rounded-xl border border-border bg-cream/60 p-3 space-y-3">
          <p className="text-xs font-medium text-forest">What needs approving?</p>
          <div className="flex flex-wrap gap-2">
            {ACTION_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                  preset === p.key
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-white text-muted hover:border-primary/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={requestCode}
              disabled={busy}
            >
              {busy ? 'Sending…' : 'Create request'}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {pending.length === 0 ? (
        <p className="text-sm text-muted">No pending approval requests.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((r) => {
            const approvals = r.approvals ?? [];
            const mine = approvals.some((a) => a.user_id === myUserId);
            const canApprove = canRequest && !mine && !r.id.startsWith('local-');
            return (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-border rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-forest capitalize">
                    {r.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {r.requester_name ?? (r.requester_id === myUserId ? 'You' : 'Authorized member')} ·{' '}
                    {formatDate(r.created_at)} · {approvals.length}/
                    {r.required_approvals ?? 2} approvals
                    {mine ? ' · you approved' : ''}
                  </p>
                </div>
                <div className="shrink-0">
                  {canApprove ? (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={pendingId === r.id}
                      onClick={() => approve(r.id)}
                    >
                      {pendingId === r.id ? (
                        'Saving…'
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="badge bg-warning/15 text-warning text-[11px]">
                      Awaiting other approval
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {resolved.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Recent
          </p>
          <ul className="space-y-1.5">
            {resolved.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate text-forest capitalize">
                  {r.action.replace(/_/g, ' ')}
                </span>
                <span
                  className={`badge shrink-0 text-[11px] ${
                    r.status === 'approved'
                      ? 'bg-primary/10 text-primary'
                      : r.status === 'rejected'
                        ? 'bg-error/10 text-error'
                        : 'bg-forest/10 text-forest'
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
        onClick={() => setRows([...requests])}
        aria-label="Refresh approvals"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Refresh
      </button>
    </section>
  );
}

'use client';

import { useFormState } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Percent, Save } from 'lucide-react';
import {
  updateCircleFees,
  type CircleFeeState,
} from '@/lib/auth-actions';
import { useToast } from '@/components/toast';
import { formatCurrency } from '@/lib/utils';

/**
 * Owner-only: platform fee + network charge (VAT) settings.
 * fee_bps / network_charge_bps are basis points (100 = 1%).
 */
export function CircleFeeForm({
  circleId,
  contributionAmount,
  initialFeeBps,
  initialNetworkBps,
  initialFeePayer,
  currency,
}: {
  circleId: string;
  contributionAmount: number;
  initialFeeBps: number;
  initialNetworkBps: number;
  initialFeePayer: string;
  currency: string;
}) {
  const [state, formAction] = useFormState(
    updateCircleFees,
    null as CircleFeeState
  );
  const toast = useToast();
  const lastKeyRef = useRef('');
  const [feeBps, setFeeBps] = useState(initialFeeBps);
  const [networkBps, setNetworkBps] = useState(initialNetworkBps);
  const [feePayer, setFeePayer] = useState(initialFeePayer);

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.error?.form?.[0]) toast.error(state.error.form[0]);
    else if (state.success) toast.success(state.success);
  }, [state, toast]);

  const feePreview = Math.floor((contributionAmount * feeBps) / 10000);
  const netPreview = Math.floor((contributionAmount * networkBps) / 10000);
  const memberPays =
    feePayer === 'member'
      ? contributionAmount + feePreview + netPreview
      : feePayer === 'shared'
        ? contributionAmount + Math.floor((feePreview + netPreview) / 2) * 2
        : contributionAmount + netPreview;

  const formErr = state?.error?.form?.[0];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="circle_id" value={circleId} />
      <input type="hidden" name="fee_bps" value={feeBps} />
      <input type="hidden" name="network_charge_bps" value={networkBps} />
      <input type="hidden" name="fee_payer" value={feePayer} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fee_bps_ui" className="label">
            Platform fee (%)
          </label>
          <div className="relative">
            <input
              id="fee_bps_ui"
              type="number"
              min={0}
              max={50}
              step={0.1}
              value={(feeBps / 100).toString()}
              onChange={(e) => {
                const pct = Math.max(0, Math.min(50, Number(e.target.value) || 0));
                setFeeBps(Math.round(pct * 100));
              }}
              className="input pr-10"
            />
            <Percent className="w-4 h-4 text-muted absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <p className="text-xs text-muted mt-1">
            Currently {(feeBps / 100).toFixed(2)}% · {formatCurrency(feePreview, currency)}
          </p>
        </div>
        <div>
          <label htmlFor="network_bps_ui" className="label">
            Network charge / VAT (%)
          </label>
          <div className="relative">
            <input
              id="network_bps_ui"
              type="number"
              min={0}
              max={50}
              step={0.1}
              value={(networkBps / 100).toString()}
              onChange={(e) => {
                const pct = Math.max(0, Math.min(50, Number(e.target.value) || 0));
                setNetworkBps(Math.round(pct * 100));
              }}
              className="input pr-10"
            />
            <Percent className="w-4 h-4 text-muted absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <p className="text-xs text-muted mt-1">
            Currently {(networkBps / 100).toFixed(2)}% · {formatCurrency(netPreview, currency)}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="fee_payer_ui" className="label">
          Who pays the fee?
        </label>
        <select
          id="fee_payer_ui"
          value={feePayer}
          onChange={(e) => setFeePayer(e.target.value)}
          className="input"
        >
          <option value="member">Member (added to contribution)</option>
          <option value="owner">Owner / platform absorbs fee</option>
          <option value="shared">Shared (50/50)</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-cream px-4 py-3 text-sm">
        <p className="text-muted mb-1">Member pays per cycle</p>
        <p className="font-display text-xl font-bold text-forest">
          {formatCurrency(memberPays, currency)}
        </p>
        <p className="text-xs text-muted mt-1">
          Base {formatCurrency(contributionAmount, currency)} + fees shown at checkout
        </p>
      </div>

      {formErr && (
        <div
          className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {formErr}
        </div>
      )}

      <button type="submit" className="btn-primary">
        <Save className="w-4 h-4" />
        Save fee settings
      </button>
    </form>
  );
}

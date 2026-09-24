'use client';

import { useState, useTransition } from 'react';
import { ScrollText, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';
import { formatCurrency } from '@/lib/utils';
import {
  saveCircleRules,
  acceptCircleAgreement,
  type FeatureActionState,
} from '@/lib/circle-features-actions';

export function CircleRulesCard({
  circleId,
  canEdit,
  frequency,
  contributionAmount,
  currency,
  latePolicy,
  payoutMode,
  rules,
  rulesVersion,
  myAcceptedVersion,
}: {
  circleId: string;
  canEdit: boolean;
  frequency: string;
  contributionAmount: number;
  currency: string;
  latePolicy: string;
  payoutMode: string;
  rules: Record<string, unknown> | null;
  rulesVersion: number;
  myAcceptedVersion?: number | null;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [late, setLate] = useState(latePolicy);
  const [method, setMethod] = useState(
    String((rules?.preferred_payment_method as string) || 'bank_transfer')
  );
  const [requireAgreement, setRequireAgreement] = useState(
    Boolean(rules?.require_agreement)
  );
  const [pending, startTransition] = useTransition();
  const accepted = (myAcceptedVersion ?? 0) >= rulesVersion;

  function save() {
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('late_policy', late);
    fd.set('preferred_payment_method', method);
    fd.set('require_agreement', requireAgreement ? '1' : '');
    startTransition(() => {
      void saveCircleRules(null, fd).then((res: FeatureActionState) => {
        if (res?.success) {
          toast.success(res.success);
          setEditing(false);
        } else {
          toast.error(res?.error?.form?.[0] ?? 'Could not save rules');
        }
      });
    });
  }

  function accept() {
    const fd = new FormData();
    fd.set('circle_id', circleId);
    fd.set('rules_version', String(rulesVersion));
    startTransition(() => {
      void acceptCircleAgreement(null, fd).then((res: FeatureActionState) => {
        if (res?.success) toast.success(res.success);
        else toast.error(res?.error?.form?.[0] ?? 'Could not accept');
      });
    });
  }

  return (
    <section className="card" data-no-swipe>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-forest">Circle rules</h2>
        </div>
        {canEdit && (
          <button type="button" className="btn-outline btn-sm" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Close' : 'Edit'}
          </button>
        )}
      </div>

      <dl className="space-y-2 text-sm mb-4">
        <Row label="Contribution" value={`${formatCurrency(contributionAmount, currency)} ${frequency}`} />
        <Row label="Late contribution" value={late.replace(/_/g, ' ')} />
        <Row label="Payout" value={payoutMode === 'end_of_term' ? 'End of term' : 'On turn (rotating)'} />
        <Row label="Changes require" value="Admin + Treasurer approval" />
        <Row label="Rules version" value={`v${rulesVersion}`} />
      </dl>

      {editing && canEdit && (
        <div className="space-y-3 border border-border rounded-xl p-4 mb-4">
          <div>
            <label className="label" htmlFor="late-policy">Late contribution</label>
            <select id="late-policy" className="input" value={late} onChange={(e) => setLate(e.target.value)}>
              <option value="admin_review">Admin review</option>
              <option value="grace_24h">24 hour grace</option>
              <option value="strict">Strict — miss removes turn</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pay-method">Preferred method</label>
            <select
              id="pay-method"
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile money</option>
              <option value="payment_link">Payment link</option>
              <option value="other">Other</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-forest">
            <input
              type="checkbox"
              checked={requireAgreement}
              onChange={(e) => setRequireAgreement(e.target.checked)}
              className="w-4 h-4 border-border text-primary focus:ring-primary/40"
            />
            Members must accept rules when joining
          </label>
          <button type="button" className="btn-primary btn-sm" disabled={pending} onClick={save}>
            {pending ? <Spinner /> : 'Save rules'}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium text-forest mb-1 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Digital agreement
        </p>
        <p className="text-xs text-muted mb-3">
          I agree to these circle rules and the contribution schedule.
        </p>
        <button
          type="button"
          className={accepted ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
          disabled={pending || accepted}
          onClick={accept}
        >
          {pending ? <Spinner /> : accepted ? 'Agreement on file' : 'I agree to these circle rules'}
        </button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-forest font-medium text-right capitalize">{value}</dd>
    </div>
  );
}

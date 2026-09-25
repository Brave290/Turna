'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Calculator, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { BrandSelect } from '@/components/ui';
import { createCircle, type CircleActionState } from '@/lib/auth-actions';
import { formatCurrency } from '@/lib/utils';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function monthOptions() {
  return MONTHS.map((label, value) => ({
    value: String(value),
    label,
  }));
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Creating...
        </>
      ) : (
        'Create circle'
      )}
    </button>
  );
}

function periodsBetween(
  startMonth: number,
  endMonth: number,
  frequency: string
): number {
  const now = new Date();
  const y = now.getFullYear();
  const startY = y;
  let endY = y;
  if (endMonth < startMonth) endY = y + 1;
  const start = new Date(Date.UTC(startY, startMonth, 1));
  const end = new Date(Date.UTC(endY, endMonth + 1, 0));
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 0;
  const days = Math.round(ms / 86400000) + 1;
  if (frequency === 'weekly') return Math.max(1, Math.ceil(days / 7));
  if (frequency === 'biweekly') return Math.max(1, Math.ceil(days / 14));
  // monthly: count months inclusive
  const monthCount = (endY - startY) * 12 + (endMonth - startMonth) + 1;
  return Math.max(1, monthCount);
}

function suggestedTitle(startMonth: number | null, endMonth: number | null): string {
  if (startMonth === null || endMonth === null) return '';
  return `${MONTHS[startMonth]} to ${MONTHS[endMonth]} Savings`;
}

/**
 * Circle creation — month range, auto title, live amount math,
 * payout collection mode (rotating turn vs end-of-term).
 */
export default function NewCirclePage() {
  const [state, formAction] = useFormState(
    createCircle,
    null as CircleActionState
  );
  const router = useRouter();

  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [frequency, setFrequency] = useState('monthly');
  const [memberLimit, setMemberLimit] = useState('10');
  const [amount, setAmount] = useState('');
  const [payoutMode, setPayoutMode] = useState<'rotating' | 'end_of_term'>('rotating');
  const [nameTouched, setNameTouched] = useState(false);
  const [nameValue, setNameValue] = useState('');

  useEffect(() => {
    if (state?.circleId) {
      router.push(`/dashboard/circles/${state.circleId}`);
    }
  }, [state?.circleId, router]);

  const sm = startMonth === '' ? null : Number(startMonth);
  const em = endMonth === '' ? null : Number(endMonth);
  const autoName = useMemo(() => suggestedTitle(sm, em), [sm, em]);
  const displayTitle = nameTouched ? nameValue : autoName || nameValue;

  const amountN = Number(amount.replace(/[^\d.]/g, '')) || 0;
  const members = Math.max(2, Number(memberLimit) || 10);
  const nPeriods =
    sm !== null && em !== null ? periodsBetween(sm, em, frequency) : 0;
  const totalEach = amountN * nPeriods;
  const potPerTurn = payoutMode === 'rotating' ? amountN * members : amountN * nPeriods;
  const potEndTerm = amountN * members * nPeriods;

  const err = (key: string) => state?.error?.[key]?.[0];
  const formError = state?.error?.form?.[0];

  return (
    <div className="max-w-xl animate-fade-in">
      <h1 className="font-display text-3xl font-bold tracking-tight text-forest mb-1">
        New circle
      </h1>
      <p className="text-muted mb-8">
        Pick the months, set your contribution — we name it and do the math.
        Money stays outside Turna; we coordinate, record, and keep everyone accountable.
      </p>

      <form action={formAction} className="space-y-5 card" noValidate>
        {/* Month range → auto title */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="start_month">
              From month
            </label>
            <BrandSelect
              id="start_month"
              name="start_month"
              value={startMonth}
              defaultValue=""
              aria-label="Start month"
              options={[{ value: '', label: 'Select…' }, ...monthOptions()]}
              onChange={(v) => setStartMonth(v)}
            />
          </div>
          <div>
            <label className="label" htmlFor="end_month">
              To month
            </label>
            <BrandSelect
              id="end_month"
              name="end_month"
              value={endMonth}
              defaultValue=""
              aria-label="End month"
              options={[{ value: '', label: 'Select…' }, ...monthOptions()]}
              onChange={(v) => setEndMonth(v)}
            />
          </div>
        </div>

        {autoName && (
          <p className="flex items-center gap-1.5 text-sm text-primary">
            <Sparkles className="w-4 h-4 shrink-0" />
            Suggested: <span className="font-medium text-forest">{autoName}</span>
          </p>
        )}

        <div>
          <label htmlFor="name" className="label">
            Circle name
          </label>
          <input
            id="name"
            name="name"
            value={displayTitle || autoName || ''}
            onChange={(e) => {
              setNameTouched(true);
              setNameValue(e.target.value);
            }}
            onFocus={() => {
              if (!nameTouched && autoName) {
                setNameValue(autoName);
                setNameTouched(true);
              }
            }}
            className={`input${err('name') ? ' input-error' : ''}`}
            placeholder={autoName || 'Saturday Ajo'}
            required
            maxLength={100}
          />
          {err('name') && (
            <p className="text-sm text-error mt-1.5">{err('name')}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description <span className="text-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            className="input min-h-[80px]"
            placeholder="What is this circle for?"
            maxLength={500}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contribution_amount" className="label">
              Contribution amount (NGN)
            </label>
            <input
              id="contribution_amount"
              name="contribution_amount"
              type="number"
              min="100"
              step="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`input${err('contribution_amount') ? ' input-error' : ''}`}
              placeholder="5000"
              required
            />
            {err('contribution_amount') && (
              <p className="text-sm text-error mt-1.5">
                {err('contribution_amount')}
              </p>
            )}
            <p className="text-xs text-muted mt-1.5">
              What each member pays every period.
            </p>
          </div>

          <div>
            <label htmlFor="frequency" className="label">
              Frequency
            </label>
            <BrandSelect
              id="frequency"
              name="frequency"
              value={frequency}
              defaultValue="monthly"
              aria-label="Contribution frequency"
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Every 2 weeks' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              onChange={setFrequency}
            />
          </div>

          <div>
            <label htmlFor="member_limit" className="label">
              Member limit
            </label>
            <input
              id="member_limit"
              name="member_limit"
              type="number"
              min="2"
              max="100"
              className="input"
              value={memberLimit}
              onChange={(e) => setMemberLimit(e.target.value)}
            />
            {err('member_limit') && (
              <p className="text-sm text-error mt-1.5">{err('member_limit')}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <p className="label mb-2 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-primary" />
              Your schedule
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-muted">Duration</span>
                <span className="text-forest font-medium text-right">
                  {sm !== null && em !== null
                    ? `${MONTHS[sm]} → ${MONTHS[em]}`
                    : 'Select months above'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">Periods</span>
                <span className="text-forest font-medium">
                  {nPeriods > 0 ? `${nPeriods} ${frequency === 'monthly' ? 'months' : frequency === 'weekly' ? 'weeks' : 'fortnights'}` : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">Each member pays total</span>
                <span className="text-forest font-semibold">
                  {amountN > 0 && nPeriods > 0 ? formatCurrency(totalEach) : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">
                  {payoutMode === 'rotating' ? 'Payout on a turn (pot)' : 'Everyone collects at end (their share)'}
                </span>
                <span className="text-primary font-semibold text-right">
                  {amountN > 0 && nPeriods > 0
                    ? formatCurrency(payoutMode === 'rotating' ? potPerTurn : potEndTerm)
                    : '—'}
                </span>
              </div>
              {payoutMode === 'end_of_term' && amountN > 0 && nPeriods > 0 && (
                <div className="flex justify-between gap-3 pt-1 border-t border-border/50">
                  <span className="text-muted">Full circle pot at end</span>
                  <span className="text-forest font-medium">
                    {formatCurrency(potEndTerm)}
                  </span>
                </div>
              )}
            </div>
            {err('end_date') && (
              <p className="text-sm text-error mt-1.5">{err('end_date')}</p>
            )}
          </div>

          {/* Hidden dates derived from months for server */}
          {sm !== null && (
            <input
              type="hidden"
              name="start_date"
              value={new Date(Date.UTC(new Date().getFullYear(), sm, 1))
                .toISOString()
                .slice(0, 10)}
            />
          )}
          {em !== null && sm !== null && (
            <input
              type="hidden"
              name="end_date"
              value={(() => {
                const y = new Date().getFullYear();
                const endY = em < sm ? y + 1 : y;
                const last = new Date(Date.UTC(endY, em + 1, 0)).getUTCDate();
                return new Date(Date.UTC(endY, em, last)).toISOString().slice(0, 10);
              })()}
            />
          )}
        </div>

        {/* How members collect */}
        <fieldset className="space-y-2">
          <legend className="label mb-1">How members collect</legend>
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="payout_mode"
              value="rotating"
              checked={payoutMode === 'rotating'}
              onChange={() => setPayoutMode('rotating')}
              className="mt-0.5 w-4 h-4 border-border text-primary focus:ring-primary/40"
            />
            <span className="text-sm">
              <span className="font-medium text-forest block">On their turn (rotating)</span>
              <span className="text-muted">
                Each member collects the full pot when it&apos;s their payout slot.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="payout_mode"
              value="end_of_term"
              checked={payoutMode === 'end_of_term'}
              onChange={() => setPayoutMode('end_of_term')}
              className="mt-0.5 w-4 h-4 border-border text-primary focus:ring-primary/40"
            />
            <span className="text-sm">
              <span className="font-medium text-forest block">At the end of the duration</span>
              <span className="text-muted">
                Everyone contributes for the full term, then collects what they put in
                (plus share rules the owner sets later).
              </span>
            </span>
          </label>
        </fieldset>

        {/* How members pay */}
        <div className="rounded-xl border border-border bg-cream px-4 py-3">
          <p className="text-sm font-medium text-forest">How members pay</p>
          <p className="text-xs text-muted mt-1">
            Contributions are settled directly between members — bank transfer or
            cash — then reported in Turna for the admin to confirm. No card is
            charged.
          </p>
        </div>

        <input type="hidden" name="currency" value="NGN" />
        {/* payout_mode comes from the radio group above */}
        <input
          type="hidden"
          name="suggested_name"
          value={nameTouched ? '' : autoName || ''}
        />
        {/* Controlled name field already carries name="name" */}

        {formError && (
          <div
            className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {formError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <SubmitButton />
          <a href="/dashboard/circles" className="btn-outline text-center">
            Cancel
          </a>
        </div>
      </form>

      <p className="text-xs text-muted mt-4 flex items-center gap-1">
        Next <ArrowRight className="w-3 h-3" /> invite members → start → contribute → collect.
      </p>
    </div>
  );
}

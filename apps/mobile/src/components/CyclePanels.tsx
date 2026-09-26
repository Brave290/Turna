import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge, type BadgeTone } from './Card';
import { Button } from './Button';
import { AppSelect } from './AppSelect';
import { useConfirm } from './Popup';
import { useToast } from './Toast';
import { colors, spacing, typography, type Palette } from '../theme';
import { formatCurrency } from '../lib/format';
import { usePaletteStyles } from '../context/ThemeContext';
import {
  decideContribution,
  recordPayout,
  reportContribution,
  type Decision,
} from '../lib/circle-actions';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'pending',
  collecting: 'active',
  reported: 'pending',
  confirmed: 'active',
  rejected: 'error',
  disputed: 'error',
  refunded: 'pending',
  initiated: 'pending',
  sent: 'pending',
  received: 'active',
  completed: 'active',
};

function toneFor(status: string): BadgeTone {
  return STATUS_TONE[status] ?? 'muted';
}

type Cycle = {
  id: string;
  status: string;
  cycle_number: number;
  expected_amount: number;
};

type ContributionRow = {
  id: string;
  status: string;
  member_id: string;
  expected_amount: number;
  reported_amount: number | null;
  receipt_code: string | null;
  circle_members?: {
    id: string;
    profiles?: { display_name?: string | null; email?: string | null } | null;
  } | null;
};

type PayoutRow = {
  id: string;
  status: string;
  expected_amount: number;
  actual_amount: number | null;
  recipient_member_id: string;
  circle_members?: {
    id: string;
    profiles?: { display_name?: string | null; email?: string | null } | null;
  } | null;
};

const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'payment_link', label: 'Payment link' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

/**
 * This cycle's contributions: member report/dispute (web ContributionActions)
 * plus the owner's review queue for reported rows.
 */
export function ContributionPanel({
  circleId,
  currency,
  expectedAmount,
  isOwner,
  onChanged,
}: {
  circleId: string;
  currency: string;
  expectedAmount: number;
  isOwner: boolean;
  onChanged?: () => void;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const { confirm, node: confirmNode } = useConfirm();
  const { show: toast, node: toastNode } = useToast();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [cycleRes, memberRes] = await Promise.all([
        supabase
          .from('contribution_cycles')
          .select('id, status, cycle_number, expected_amount')
          .eq('circle_id', circleId)
          .order('cycle_number', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('circle_members')
          .select('id')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
      ]);
      const c = (cycleRes.data as Cycle | null) ?? null;
      setCycle(c);
      setMyMemberId((memberRes.data as { id: string } | null)?.id ?? null);
      if (!c) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from('contributions')
        .select(
          'id, status, member_id, expected_amount, reported_amount, receipt_code, circle_members(id, profiles(display_name, email))'
        )
        .eq('cycle_id', c.id)
        .order('created_at', { ascending: true })
        .limit(100);
      setRows((data ?? []) as unknown as ContributionRow[]);
    } finally {
      setLoading(false);
    }
  }, [circleId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const mine = rows.find((r) => r.member_id === myMemberId) ?? null;
  const settled = mine?.status === 'confirmed' || mine?.status === 'disputed';
  const canReport = Boolean(cycle && cycle.status === 'collecting' && myMemberId);
  const reviewRows = isOwner
    ? rows.filter((r) => r.status === 'reported' || r.status === 'disputed')
    : [];

  async function submitReport() {
    if (!cycle) return;
    const naira = Number(amount.replace(/[^\d.]/g, '') || '0');
    const kobo = Math.round(naira * 100);
    if (kobo <= 0) {
      toast('Enter the amount you paid', 'error');
      return;
    }
    setBusy(true);
    const res = await reportContribution({
      circleId,
      cycleId: cycle.id,
      expectedAmount: cycle.expected_amount ?? expectedAmount,
      amountKobo: kobo,
      paymentMethod: method,
      paymentReference: reference,
      proofNote: note,
    });
    setBusy(false);
    if (res.ok) {
      toast(res.success ?? 'Contribution reported');
      setOpen(false);
      setAmount('');
      setReference('');
      setNote('');
      await load();
      onChanged?.();
    } else {
      toast(res.error ?? 'Could not report', 'error');
    }
  }

  async function dispute() {
    if (!mine) return;
    const ok = await confirm(
      'Dispute contribution?',
      'Tell the circle admin this report looks wrong. They can confirm or reject it after your dispute.',
      { confirmLabel: 'Raise dispute' }
    );
    if (!ok) return;
    setBusy(true);
    const res = await decideContribution({ contributionId: mine.id, decision: 'disputed' });
    setBusy(false);
    if (res.ok) {
      toast(res.success ?? 'Contribution disputed');
      await load();
      onChanged?.();
    } else {
      toast(res.error ?? 'Could not update contribution', 'error');
    }
  }

  async function decide(id: string, decision: Decision) {
    setBusy(true);
    const res = await decideContribution({ contributionId: id, decision });
    setBusy(false);
    if (res.ok) {
      toast(res.success ?? `Contribution ${decision}`);
      await load();
      onChanged?.();
    } else {
      toast(res.error ?? 'Could not update contribution', 'error');
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.section}>Contribution</Text>
      <Text style={styles.expectedLabel}>Expected</Text>
      <Text style={styles.expected}>
        {formatCurrency(cycle?.expected_amount ?? expectedAmount, currency)}
      </Text>

      {loading ? (
        <Text style={styles.hint}>Loading this cycle…</Text>
      ) : (
        <>
          {mine ? (
            <View style={styles.statusRow}>
              <Badge label={mine.status} tone={toneFor(mine.status)} />
              {mine.reported_amount != null && (
                <Text style={styles.hint}>
                  You reported {formatCurrency(mine.reported_amount, currency)}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.hint}>No report yet for this cycle.</Text>
          )}

          {canReport && !settled && (
            <Button
              label={open ? 'Hide report form' : 'Report paid'}
              variant="outline"
              onPress={() => setOpen((v) => !v)}
              style={styles.action}
            />
          )}

          {open && canReport && !settled && (
            <View style={styles.form}>
              <Text style={styles.label}>Amount paid (₦)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder={String(
                  Math.round((cycle?.expected_amount ?? expectedAmount) / 100)
                )}
                placeholderTextColor={p.textMuted}
                accessibilityLabel="Amount paid"
              />
              <Text style={styles.label}>Payment method</Text>
              <AppSelect value={method} onChange={setMethod} options={METHODS} />
              <Text style={styles.label}>Reference (optional)</Text>
              <TextInput
                style={styles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="e.g. 839201"
                placeholderTextColor={p.textMuted}
                maxLength={80}
                accessibilityLabel="Payment reference"
              />
              <Text style={styles.label}>Proof note (optional)</Text>
              <TextInput
                style={[styles.input, styles.note]}
                value={note}
                onChangeText={setNote}
                placeholder="₦20,000 sent via bank transfer"
                placeholderTextColor={p.textMuted}
                maxLength={500}
                multiline
                accessibilityLabel="Proof note"
              />
              <View style={styles.formActions}>
                <Button
                  label="Submit report"
                  onPress={() => void submitReport()}
                  loading={busy}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Dispute"
                  variant="outline"
                  onPress={() => void dispute()}
                  disabled={!mine || busy}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {mine?.status === 'reported' && (
            <Text style={styles.hint}>
              Waiting for the circle admin to confirm. You can dispute if this is wrong.
            </Text>
          )}

          {reviewRows.length > 0 && (
            <View style={styles.review}>
              <Text style={styles.reviewTitle}>Review reports</Text>
              {reviewRows.map((row) => (
                <View key={row.id} style={styles.reviewRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.reviewName} numberOfLines={1}>
                      {row.circle_members?.profiles?.display_name ||
                        row.circle_members?.profiles?.email ||
                        'Member'}
                    </Text>
                    <Text style={styles.hint}>
                      {formatCurrency(row.reported_amount ?? row.expected_amount, currency)}
                    </Text>
                  </View>
                  <Badge label={row.status} tone={toneFor(row.status)} />
                  <Button
                    label="Confirm"
                    onPress={() => void decide(row.id, 'confirmed')}
                    loading={busy}
                    style={styles.smallBtn}
                  />
                  <Button
                    label="Reject"
                    variant="outline"
                    onPress={() => void decide(row.id, 'rejected')}
                    disabled={busy}
                    style={styles.smallBtn}
                  />
                </View>
              ))}
            </View>
          )}
        </>
      )}
      {confirmNode}
      {toastNode}
    </Card>
  );
}

/** This cycle's payouts with the manual record buttons (web RecordPayoutButton). */
export function PayoutPanel({
  circleId,
  currency,
  isOwner,
  myMemberId,
  onChanged,
}: {
  circleId: string;
  currency: string;
  isOwner: boolean;
  myMemberId: string | null;
  onChanged?: () => void;
}) {
  const { styles } = usePaletteStyles(makeStyles);
  const { confirm, node: confirmNode } = useConfirm();
  const { show: toast, node: toastNode } = useToast();
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const cycleRes = await supabase
        .from('contribution_cycles')
        .select('id, cycle_number')
        .eq('circle_id', circleId)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const cycle = cycleRes.data as { id: string } | null;
      if (!cycle) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from('payouts')
        .select(
          'id, status, expected_amount, actual_amount, recipient_member_id, circle_members:recipient_member_id(id, profiles(display_name, email))'
        )
        .eq('cycle_id', cycle.id)
        .order('created_at', { ascending: true })
        .limit(50);
      setRows((data ?? []) as unknown as PayoutRow[]);
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(row: PayoutRow, step: 'sent' | 'received') {
    const message =
      step === 'sent'
        ? 'Mark this payout as sent to the recipient?'
        : 'Confirm that this payout landed?';
    const ok = await confirm(message, 'This records the outcome on the circle ledger.', {
      confirmLabel: step === 'sent' ? 'Mark sent' : 'Confirm received',
    });
    if (!ok) return;
    setBusy(true);
    const res = await recordPayout({ payoutId: row.id, step });
    setBusy(false);
    if (res.ok) {
      toast(res.success ?? 'Payout updated');
      await load();
      onChanged?.();
    } else {
      toast(res.error ?? 'Could not update payout', 'error');
    }
  }

  if (!loading && rows.length === 0) return null;
  if (loading) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.section}>Payouts</Text>
      {rows.map((row) => {
        const isRecipient = Boolean(myMemberId && row.recipient_member_id === myMemberId);
        const canSend = isOwner && (row.status === 'pending' || row.status === 'initiated');
        const canReceive =
          row.status !== 'received' && (isOwner || isRecipient) && row.status !== 'pending';
        return (
          <View key={row.id} style={styles.payoutRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.reviewName} numberOfLines={1}>
                {row.circle_members?.profiles?.display_name ||
                  row.circle_members?.profiles?.email ||
                  'Recipient'}
              </Text>
              <Text style={styles.hint}>
                {formatCurrency(row.actual_amount ?? row.expected_amount, currency)}
              </Text>
            </View>
            <Badge label={row.status} tone={toneFor(row.status)} />
            {canSend && (
              <Button
                label="Mark sent"
                variant="outline"
                onPress={() => void run(row, 'sent')}
                disabled={busy}
                style={styles.smallBtn}
              />
            )}
            {canReceive && (
              <Button
                label="Confirm received"
                onPress={() => void run(row, 'received')}
                disabled={busy}
                style={styles.smallBtn}
              />
            )}
          </View>
        );
      })}
      {confirmNode}
      {toastNode}
    </Card>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    card: {
      marginTop: spacing.md,
    },
    section: {
      fontSize: typography.caption,
      fontWeight: '700',
      color: p.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },
    expectedLabel: {
      fontSize: typography.caption,
      color: p.textMuted,
    },
    expected: {
      fontSize: typography.heading,
      fontWeight: '700',
      color: p.primary,
      marginTop: 2,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
      marginTop: spacing.sm,
    },
    hint: {
      fontSize: typography.caption,
      color: p.textMuted,
      lineHeight: 20,
      marginTop: 4,
    },
    action: {
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
    },
    form: {
      marginTop: spacing.md,
      gap: 6,
    },
    label: {
      fontSize: typography.caption,
      fontWeight: '500',
      color: p.textMuted,
      marginTop: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: p.text,
      fontSize: typography.body,
      backgroundColor: p.surface,
    },
    note: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    formActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    review: {
      borderTopWidth: 1,
      borderTopColor: p.border,
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    reviewTitle: {
      fontSize: typography.body,
      fontWeight: '600',
      color: p.text,
    },
    reviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      flexWrap: 'wrap',
    },
    payoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      marginTop: spacing.sm,
      flexWrap: 'wrap',
    },
    reviewName: {
      fontSize: typography.body,
      fontWeight: '600',
      color: p.text,
    },
    smallBtn: {
      minHeight: 34,
      paddingHorizontal: spacing.md,
    },
  });

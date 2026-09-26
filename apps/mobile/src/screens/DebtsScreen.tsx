import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { HandCoins, Plus, Trash2, Wallet } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useMotion } from '../context/MotionContext';
import { Button } from '../components/Button';
import { Card, Badge } from '../components/Card';
import { Popup, useConfirm } from '../components/Popup';
import { Screen } from '../components/Screen';
import { AppSelect } from '../components/AppSelect';
import { MicButton } from '../components/MicButton';
import { StaggerItem } from '../components/Stagger';
import { useToast } from '../components/Toast';
import { cacheSet } from '../lib/offline';
import {
  debtTotals,
  deleteDebt,
  debtsCacheKey,
  listDebts,
  setDebtSettled,
  upsertDebt,
  type Debt,
  type DebtKind,
} from '../lib/debt-store';
import { formatDate, formatCurrency } from '../lib/format';
import {
  amountInputProps,
  codeInputProps,
  nameInputProps,
  noteInputProps,
} from '../lib/input-props';
import { colors, radius, spacing, typography, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

const SWIPE_DELETE_AT = -70;
const SWIPE_MAX = -120;
const SWIPE_HINT_WIDTH = 104;

type FormState = {
  kind: DebtKind;
  name: string;
  amount: string;
  date: string;
  note: string;
};

function emptyForm(kind: DebtKind = 'owed'): FormState {
  return {
    kind,
    name: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  };
}

const AnimatedView = Animated.View as unknown as React.ComponentType<{
  style?: any;
  children?: React.ReactNode;
  [k: string]: any;
}>;

function DebtRow({
  debt,
  index,
  onEdit,
  onToggle,
  onDelete,
}: {
  debt: Debt;
  index: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { reduceMotion } = useMotion();
  const x = useRef(new Animated.Value(0)).current;
  const cb = useRef({ onDelete });
  cb.current = { onDelete };

  const snapBack = useCallback(() => {
    Animated.timing(x, { toValue: 0, duration: reduceMotion ? 0 : 160, useNativeDriver: true }).start();
  }, [x, reduceMotion]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => {
          x.setValue(Math.max(SWIPE_MAX, Math.min(0, g.dx)));
        },
        onPanResponderRelease: (_e, g) => {
          const fire = g.dx <= SWIPE_DELETE_AT;
          snapBack();
          if (fire) cb.current.onDelete();
        },
        onPanResponderTerminate: snapBack,
      }),
    [snapBack, x]
  );

  useEffect(() => {
    snapBack();
  }, [debt.updated_at, snapBack]);

  const owed = debt.kind === 'owed';
  const label = debt.settled ? (owed ? 'settled' : 'paid') : 'open';

  return (
    <View style={styles.rowWrap} key={`${debt.id}-${index}`}>
      <View style={styles.swipeHint} pointerEvents="none">
        <Trash2 size={16} color={colors.white} strokeWidth={2} />
        <Text style={styles.swipeHintText}>Delete</Text>
      </View>
      <AnimatedView
        {...pan.panHandlers}
        style={[styles.rowFront, { transform: [{ translateX: x }] }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${debt.name}, ${formatCurrency(debt.amount)}`}
          onPress={onEdit}
          onLongPress={onDelete}
          delayLongPress={420}
          style={({ pressed }) => [
            pressed && !reduceMotion && styles.rowPressed,
            pressed && !reduceMotion && styles.rowPressedScale,
          ]}
        >
          <Card style={styles.rowCard}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {debt.name}
                </Text>
                <Text style={styles.rowMeta}>
                  {formatDate(debt.date)} · {owed ? 'collected' : 'borrowed'}
                </Text>
              </View>
              <Text style={[styles.rowAmount, owed ? styles.amountIn : styles.amountOut]}>
                {formatCurrency(debt.amount)}
              </Text>
            </View>
            {debt.note ? (
              <Text style={styles.rowNote} numberOfLines={2}>
                {debt.note}
              </Text>
            ) : null}
            <View style={styles.rowActions}>
              <Badge label={label} tone={debt.settled ? 'completed' : owed ? 'active' : 'pending'} />
              <View style={styles.rowButtons}>
                <Button
                  label={debt.settled ? (owed ? 'Reopen' : 'Reopen') : owed ? 'Mark settled' : 'Mark paid'}
                  variant={debt.settled ? 'ghost' : 'outline'}
                  onPress={onToggle}
                  style={styles.smallBtn}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete debt with ${debt.name}`}
                  onPress={onDelete}
                  hitSlop={8}
                  style={({ pressed }) => [styles.trash, pressed && styles.trashPressed]}
                >
                  <Trash2 size={15} color={p.error} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </Card>
        </Pressable>
      </AnimatedView>
    </View>
  );
}

function DebtSection({
  title,
  hint,
  icon: Icon,
  rows,
  onEdit,
  onToggle,
  onDelete,
  emptyLine,
}: {
  title: string;
  hint: string;
  icon: React.ComponentType<any>;
  rows: Debt[];
  onEdit: (d: Debt) => void;
  onToggle: (d: Debt) => void;
  onDelete: (d: Debt) => void;
  emptyLine: string;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Icon size={15} color={p.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionHint}>{hint}</Text>
        </View>
        <Text style={styles.sectionCount}>{rows.length}</Text>
      </View>
      {rows.length === 0 ? (
        <Card style={styles.sectionEmptyCard}>
          <Text style={styles.sectionEmpty}>{emptyLine}</Text>
        </Card>
      ) : (
        rows.map((d, i) => (
          <StaggerItem key={d.id} index={i}>
            <DebtRow
              debt={d}
              index={i}
              onEdit={() => onEdit(d)}
              onToggle={() => onToggle(d)}
              onDelete={() => onDelete(d)}
            />
          </StaggerItem>
        ))
      )}
    </View>
  );
}

export function DebtsScreen({ onBack }: { onBack?: () => void }) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const { confirm, node: confirmNode } = useConfirm();
  const { show: toast, node: toastNode } = useToast();

  const [rows, setRows] = useState<Debt[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const list = await listDebts(user.id);
    setRows(list);
    void cacheSet(debtsCacheKey(user.id), list);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const owed = useMemo(() => rows.filter((r) => r.kind === 'owed'), [rows]);
  const owe = useMemo(() => rows.filter((r) => r.kind === 'owe'), [rows]);
  const totals = useMemo(() => debtTotals(rows), [rows]);

  const openAdd = (kind: DebtKind = 'owed') => {
    setEditing(null);
    setForm(emptyForm(kind));
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (d: Debt) => {
    setEditing(d);
    setForm({
      kind: d.kind,
      name: d.name,
      amount: String(d.amount / 100),
      date: d.date,
      note: d.note ?? '',
    });
    setFormError(null);
    setOpen(true);
  };

  async function save() {
    if (!user) return;
    const name = form.name.trim();
    const amount = Math.round(Number(form.amount.replace(/[^\d.]/g, '')) * 100);
    const date = form.date.trim();
    if (!name) {
      setFormError('Enter a name.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter an amount.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      setFormError('Use a date like 2026-09-26.');
      return;
    }
    setSaving(true);
    try {
      await upsertDebt(user.id, {
        id: editing?.id,
        kind: form.kind,
        name,
        amount,
        date,
        note: form.note,
      });
      await refresh();
      setOpen(false);
      toast(editing ? 'Debt updated' : 'Debt added');
    } catch {
      toast('Could not save — try again', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(d: Debt) {
    if (!user) return;
    await setDebtSettled(user.id, d.id, !d.settled);
    await refresh();
    toast(d.settled ? 'Reopened' : d.kind === 'owed' ? 'Marked settled' : 'Marked paid');
  }

  async function remove(d: Debt) {
    if (!user) return;
    const ok = await confirm(
      'Delete this debt?',
      `${d.name} · ${formatCurrency(d.amount)} will be removed from this device.`,
      { confirmLabel: 'Delete', danger: true }
    );
    if (!ok) return;
    await deleteDebt(user.id, d.id);
    await refresh();
    toast('Debt deleted');
  }

  const netLabel =
    totals.net === 0
      ? 'Net: even'
      : totals.net > 0
        ? `Net: +${formatCurrency(totals.net)}`
        : `Net: −${formatCurrency(Math.abs(totals.net))}`;

  const hasRows = rows.length > 0;

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        {onBack && (
          <Button label="← Back" variant="ghost" onPress={onBack} style={styles.backBtn} />
        )}
        <Text style={styles.title}>Debts</Text>
        <Text style={styles.sub}>
          Track who owes you and what you owe — saved on this device, works offline.
        </Text>
        <View style={styles.headActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => openAdd('owed')}
            style={({ pressed }) => [styles.headBtn, styles.headBtnPrimary, pressed && styles.headBtnPressed]}
          >
            <Plus size={15} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.headBtnPrimaryText}>I'm owed</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => openAdd('owe')}
            style={({ pressed }) => [styles.headBtn, styles.headBtnOutline, pressed && styles.headBtnPressed]}
          >
            <Plus size={15} color={p.primary} strokeWidth={2.5} />
            <Text style={styles.headBtnOutlineText}>I owe</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!hasRows ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <HandCoins size={26} color={p.primary} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No debts yet</Text>
            <Text style={styles.emptyBody}>
              Lend or borrow outside the app? Add it here so nobody forgets — settle up when the
              money moves.
            </Text>
            <Button label="Add a debt" onPress={() => openAdd('owed')} style={styles.emptyBtn} />
          </Card>
        ) : (
          <>
            <DebtSection
              title="Owed to me"
              hint="Money you collected or gave out"
              icon={HandCoins}
              rows={owed}
              onEdit={openEdit}
              onToggle={(d) => void toggle(d)}
              onDelete={(d) => void remove(d)}
              emptyLine="Nobody owes you right now."
            />
            <DebtSection
              title="I owe"
              hint="Money you borrowed"
              icon={Wallet}
              rows={owe}
              onEdit={openEdit}
              onToggle={(d) => void toggle(d)}
              onDelete={(d) => void remove(d)}
              emptyLine="You don't owe anything right now."
            />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>You are owed</Text>
          <Text style={[styles.footerValue, styles.amountIn]}>
            {formatCurrency(totals.owedTotal)} ({totals.owedPeople}{' '}
            {totals.owedPeople === 1 ? 'person' : 'people'})
          </Text>
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>You owe</Text>
          <Text style={[styles.footerValue, styles.amountOut]}>
            {formatCurrency(totals.oweTotal)} ({totals.owePeople}{' '}
            {totals.owePeople === 1 ? 'person' : 'people'})
          </Text>
        </View>
        <View style={[styles.footerRow, styles.footerNetRow]}>
          <Text style={styles.footerNetLabel}>{netLabel}</Text>
        </View>
      </View>

      <Popup
        visible={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit debt' : 'Add debt'}
        subtitle="Amounts are in naira; the date is when the money moved."
        footer={
          <View style={styles.formActions}>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            <Button
              label={editing ? 'Save changes' : 'Add debt'}
              onPress={() => void save()}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formFields}
          keyboardShouldPersistTaps="handled"
        >
          <AppSelect
            label="Type"
            value={form.kind}
            onChange={(v) => setForm((s) => ({ ...s, kind: v as DebtKind }))}
            options={[
              { value: 'owed', label: 'Owed to me' },
              { value: 'owe', label: 'I owe' },
            ]}
          />
          <Text style={styles.label}>Name</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, styles.inputMic]}
              value={form.name}
              onChangeText={(v) => setForm((s) => ({ ...s, name: v }))}
              placeholder="Amaka O."
              placeholderTextColor={p.textMuted}
              {...nameInputProps}
            />
            <MicButton value={form.name} onChangeText={(v) => setForm((s) => ({ ...s, name: v }))} />
          </View>

          <Text style={styles.label}>Amount (₦)</Text>
          <TextInput
            style={styles.input}
            value={form.amount}
            onChangeText={(v) => setForm((s) => ({ ...s, amount: v }))}
            placeholder="20000"
            placeholderTextColor={p.textMuted}
            {...amountInputProps}
          />

          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={form.date}
            onChangeText={(v) => setForm((s) => ({ ...s, date: v }))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={p.textMuted}
            maxLength={10}
            {...codeInputProps}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Note (optional)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={form.note}
              onChangeText={(v) => setForm((s) => ({ ...s, note: v }))}
              placeholder="Sent via bank transfer"
              placeholderTextColor={p.textMuted}
              maxLength={280}
              multiline
              {...noteInputProps}
            />
            <MicButton value={form.note} onChangeText={(v) => setForm((s) => ({ ...s, note: v }))} />
          </View>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
        </ScrollView>
      </Popup>

      {confirmNode}
      {toastNode}
    </Screen>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      marginBottom: spacing.sm,
    },
    backBtn: {
      alignSelf: 'flex-start',
      minHeight: 36,
      marginLeft: -8,
    },
    title: {
      fontSize: typography.title,
      fontWeight: '700',
      color: p.text,
      letterSpacing: -0.4,
      marginTop: spacing.xs,
    },
    sub: {
      fontSize: typography.body,
      color: p.textMuted,
      marginTop: 6,
      lineHeight: 20,
    },
    headActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    headBtn: {
      flex: 1,
      minHeight: 42,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
    },
    headBtnPrimary: {
      backgroundColor: p.primarySolid,
    },
    headBtnOutline: {
      borderWidth: 1,
      borderColor: p.primary,
    },
    headBtnPrimaryText: {
      color: colors.white,
      fontSize: typography.body,
      fontWeight: '600',
    },
    headBtnOutlineText: {
      color: p.primary,
      fontSize: typography.body,
      fontWeight: '600',
    },
    headBtnPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    section: {
      marginTop: spacing.sm,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(0,122,101,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: typography.body,
      fontWeight: '700',
      color: p.text,
    },
    sectionHint: {
      fontSize: 12,
      color: p.textMuted,
      marginTop: 1,
    },
    sectionCount: {
      fontSize: typography.caption,
      fontWeight: '700',
      color: p.textMuted,
      minWidth: 22,
      textAlign: 'center',
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    sectionEmptyCard: {
      marginBottom: spacing.sm,
      paddingVertical: spacing.md,
    },
    sectionEmpty: {
      fontSize: typography.caption,
      color: p.textMuted,
      textAlign: 'center',
    },
    rowWrap: {
      marginBottom: spacing.sm,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: p.errorSolid,
      position: 'relative',
    },
    swipeHint: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: SWIPE_HINT_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    swipeHintText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '700',
    },
    rowFront: {
      backgroundColor: 'transparent',
    },
    rowCard: {
      marginBottom: 0,
    },
    rowPressed: {
      opacity: 0.9,
    },
    rowPressedScale: {
      transform: [{ scale: 0.99 }],
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    rowName: {
      fontSize: typography.body,
      fontWeight: '600',
      color: p.text,
    },
    rowMeta: {
      fontSize: 12,
      color: p.textMuted,
      marginTop: 3,
      textTransform: 'capitalize',
    },
    rowAmount: {
      fontSize: typography.body,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    amountIn: {
      color: p.primary,
    },
    amountOut: {
      color: p.error,
    },
    rowNote: {
      fontSize: 12,
      color: p.textMuted,
      marginTop: spacing.sm,
      lineHeight: 17,
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    rowButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    smallBtn: {
      minHeight: 34,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
    },
    trash: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.bg,
      borderWidth: 1,
      borderColor: p.border,
    },
    trashPressed: {
      opacity: 0.7,
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      marginTop: spacing.sm,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: 'rgba(0,122,101,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: typography.heading,
      fontWeight: '600',
      color: p.text,
    },
    emptyBody: {
      fontSize: typography.body,
      color: p.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 22,
    },
    emptyBtn: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
    footer: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      backgroundColor: p.card,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: 6,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    footerLabel: {
      fontSize: typography.caption,
      color: p.textMuted,
      fontWeight: '500',
    },
    footerValue: {
      fontSize: typography.caption,
      fontWeight: '700',
    },
    footerNetRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
      paddingTop: spacing.sm,
      marginTop: 2,
    },
    footerNetLabel: {
      fontSize: typography.body,
      fontWeight: '700',
      color: p.text,
      letterSpacing: -0.2,
    },
    formScroll: {
      maxHeight: 440,
      marginTop: spacing.xs,
    },
    formFields: {
      paddingBottom: spacing.sm,
    },
    label: {
      fontSize: typography.caption,
      fontWeight: '600',
      color: p.textMuted,
      marginTop: spacing.sm,
      marginBottom: 6,
    },
    inputWrap: {
      position: 'relative',
    },
    input: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: p.text,
      fontSize: typography.body,
      backgroundColor: p.surface,
    },
    inputMic: {
      paddingRight: 52,
    },
    inputMulti: {
      minHeight: 88,
      paddingTop: 12,
      textAlignVertical: 'top',
      paddingRight: 52,
    },
    formActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    error: {
      color: p.error,
      fontSize: typography.caption,
      marginTop: spacing.sm,
    },
  });

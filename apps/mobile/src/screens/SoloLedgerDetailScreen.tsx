import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  PanResponder,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '../components/Screen';
import { LoadingOverlay } from '../components/Loading';
import { useConfirm } from '../components/Popup';
import { colors, spacing, typography } from '../theme';
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import {
  getSoloLedger,
  queueEntry,
  queueContributor,
  pullSoloFromServer,
  pushSoloToServer,
  shiftPeriod,
  periodKey,
  formatPeriodLabel,
  offlineUuid,
  type SoloContributor,
  type SoloLedger,
} from '../lib/solo-store';
import { formatCurrency } from '../lib/format';

function money(n: number) {
  return formatCurrency(n);
}

const COL = { name: 0, amount: 92, paid: 52 };

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Sheet names are derived from the starting month ("September 2026"). */
function parseStartPeriod(name: string): string | null {
  const m = name.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const mi = MONTHS_FULL.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
  if (mi < 0) return null;
  return `${m[2]}-${String(mi + 1).padStart(2, '0')}`;
}

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

/**
 * Solo ledger — spreadsheet view: one row per person, columns
 * Name / Amount / Paid. Type, toggle, done. Month defaults to current.
 */
export function SoloLedgerDetailScreen({
  ledgerId,
  onBack,
}: {
  ledgerId: string;
  onBack: () => void;
}) {
  const [ledger, setLedger] = useState<SoloLedger | null>(null);
  const [period, setPeriod] = useState(periodKey());
  const [refreshing, setRefreshing] = useState(false);
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addRef, setAddRef] = useState<{ focus?: () => void } | null>(null);
  const { confirm, node: confirmNode } = useConfirm();

  const load = useCallback(async () => {
    const L = await getSoloLedger(ledgerId);
    setLedger(L);
    if (L) {
      try {
        await pullSoloFromServer();
        await pushSoloToServer();
        setLedger(await getSoloLedger(ledgerId));
      } catch {
        /* offline ok */
      }
    }
  }, [ledgerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (!ledger) return [];
    return ledger.contributors
      .filter((c) => !c.archived)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        c,
        entry:
          ledger.entries.find(
            (e) => e.contributor_id === c.id && e.period === period
          ) ?? null,
      }));
  }, [ledger, period]);

  const stats = useMemo(() => {
    let collected = 0;
    let paid = 0;
    rows.forEach(({ entry }) => {
      if (entry && entry.status !== 'unpaid') {
        collected += entry.amount_paid;
        if (entry.status === 'paid') paid += 1;
      }
    });
    return { collected, paid, total: rows.length };
  }, [rows]);

  // Rotation: row order = collection order, anchored to the sheet's month.
  const rotation = useMemo(() => {
    if (!ledger || rows.length === 0) return null;
    const start = parseStartPeriod(ledger.name) ?? period;
    const pick = (p: string) => {
      const idx = ((monthsBetween(start, p) % rows.length) + rows.length) % rows.length;
      return rows[idx]?.c ?? null;
    };
    const nextPeriod = shiftPeriod(period, 1);
    return {
      current: pick(period),
      next: pick(nextPeriod),
      nextLabel: formatPeriodLabel(nextPeriod),
    };
  }, [ledger, rows, period]);

  // Auto-advance: when the live month is fully collected, roll to the next month.
  useEffect(() => {
    if (!ledger || rows.length === 0) return;
    if (period !== periodKey()) return;
    const allPaid = rows.every(
      ({ entry }) => entry != null && entry.status !== 'unpaid'
    );
    if (allPaid) setPeriod(shiftPeriod(period, 1));
  }, [ledger, rows, period]);

  // Swipe left/right on the month frame to move between months.
  const monthSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -40) setPeriod((p) => shiftPeriod(p, 1));
        else if (g.dx > 40) setPeriod((p) => shiftPeriod(p, -1));
      },
    })
  ).current;

  async function mutate(next: SoloLedger) {
    setLedger(next);
    void pushSoloToServer();
  }

  async function togglePaid(c: SoloContributor) {
    if (!ledger) return;
    const entry =
      ledger.entries.find(
        (e) => e.contributor_id === c.id && e.period === period
      ) ?? null;
    const isPaid = entry ? entry.status !== 'unpaid' : false;
    const status = isPaid ? 'unpaid' : 'paid';
    await queueEntry(ledger.id, {
      contributor_id: c.id,
      ledger_id: ledger.id,
      period,
      status,
      amount_paid: isPaid
        ? 0
        : c.expected_amount || ledger.default_amount,
      paid_on: isPaid ? null : new Date().toISOString().slice(0, 10),
      note: null,
      local_updated_at: new Date().toISOString(),
    });
    const next = await getSoloLedger(ledger.id);
    if (next) void mutate(next);
    Keyboard.dismiss();
  }

  async function saveName(c: SoloContributor, raw: string) {
    if (!ledger) return;
    const name = raw.trim();
    if (!name || name === c.name) return;
    await queueContributor(ledger.id, {
      ...c,
      name,
      local_updated_at: new Date().toISOString(),
    });
    const next = await getSoloLedger(ledger.id);
    if (next) void mutate(next);
  }

  async function saveAmount(c: SoloContributor, raw: string) {
    if (!ledger) return;
    const naira = Math.round(Number(raw.replace(/[^\d.]/g, '') || '0') * 100);
    if (naira === c.expected_amount) return;
    await queueContributor(ledger.id, {
      ...c,
      expected_amount: naira,
      local_updated_at: new Date().toISOString(),
    });
    const entry = ledger.entries.find(
      (e) => e.contributor_id === c.id && e.period === period
    );
    if (entry && entry.status !== 'unpaid') {
      await queueEntry(ledger.id, {
        ...entry,
        amount_paid: naira,
        local_updated_at: new Date().toISOString(),
      });
    }
    const next = await getSoloLedger(ledger.id);
    if (next) void mutate(next);
  }

  async function addRow() {
    if (!ledger) return;
    const name = addName.trim();
    if (!name) return;
    const custom = Math.round(Number(addAmount.replace(/[^\d.]/g, '') || '0') * 100);
    const c: SoloContributor = {
      id: offlineUuid(),
      ledger_id: ledger.id,
      name,
      phone: null,
      note: null,
      expected_amount: custom > 0 ? custom : ledger.default_amount,
      sort_order: ledger.contributors.filter((x) => !x.archived).length + 1,
      archived: false,
      local_updated_at: new Date().toISOString(),
    };
    await queueContributor(ledger.id, c);
    const next = await getSoloLedger(ledger.id);
    if (next) void mutate(next);
    setAddName('');
    setAddAmount('');
    addRef?.focus?.();
  }

  function removePerson(c: SoloContributor) {
    if (!ledger) return;
    void (async () => {
      const ok = await confirm('Remove person?', `${c.name} will be removed from this sheet.`, {
        confirmLabel: 'Remove',
        danger: true,
      });
      if (!ok) return;
      await queueContributor(ledger.id, {
        ...c,
        archived: true,
        local_updated_at: new Date().toISOString(),
      });
      const next = await getSoloLedger(ledger.id);
      if (next) void mutate(next);
    })();
  }

  if (!ledger) {
    return (
      <Screen tone="cream">
        <LoadingOverlay label="Loading ledger…" />
      </Screen>
    );
  }

  const isCurrent = period === periodKey();

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
          <ChevronLeft size={16} color={colors.muted} />
          <Text style={styles.backText}>Solo ledgers</Text>
        </Pressable>

        <Text style={styles.title}>{ledger.name}</Text>

        <View style={styles.periodRow} {...monthSwipe.panHandlers}>
          <Pressable
            style={styles.periodBtn}
            onPress={() => setPeriod(shiftPeriod(period, -1))}
            hitSlop={8}
          >
            <ChevronLeft size={18} color={colors.forest} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.periodLabel}>{formatPeriodLabel(period)}</Text>
            {!isCurrent && (
              <Pressable onPress={() => setPeriod(periodKey())} hitSlop={6}>
                <Text style={styles.thisMonth}>Jump to this month</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            style={styles.periodBtn}
            onPress={() => setPeriod(shiftPeriod(period, 1))}
            hitSlop={8}
          >
            <ChevronRight size={18} color={colors.forest} />
          </Pressable>
        </View>

        <Text style={styles.stats}>
          {money(stats.collected)} collected · {stats.paid}/{stats.total} paid
        </Text>

        {rotation?.current ? (
          <Text style={styles.rotation}>
            Collecting now: <Text style={styles.rotationName}>{rotation.current.name}</Text>
            {rotation.next ? (
              <>
                {'  ·  Next ({rotation.nextLabel}): '}
                <Text style={styles.rotationName}>{rotation.next.name}</Text>
              </>
            ) : null}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.c.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.colHeader}>
            <Text style={[styles.colHeadText, { flex: 1 }]}>NAME</Text>
            <Text style={[styles.colHeadText, { width: COL.amount, textAlign: 'right' }]}>
              AMOUNT
            </Text>
            <Text style={[styles.colHeadText, { width: COL.paid, textAlign: 'center' }]}>
              PAID
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const paid = item.entry ? item.entry.status !== 'unpaid' : false;
          const expected = item.c.expected_amount || ledger.default_amount;
          return (
            <View style={styles.row}>
              <TextInput
                style={styles.cellName}
                defaultValue={item.c.name}
                onEndEditing={(e: { nativeEvent: { text: string } }) =>
                  void saveName(item.c, e.nativeEvent.text)
                }
                returnKeyType="done"
                selectTextOnFocus
              />
              <TextInput
                style={styles.cellAmount}
                defaultValue={expected > 0 ? String(expected / 100) : ''}
                onEndEditing={(e: { nativeEvent: { text: string } }) =>
                  void saveAmount(item.c, e.nativeEvent.text)
                }
                keyboardType="numeric"
                returnKeyType="done"
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor={colors.border}
              />
              <View style={styles.cellPaid}>
                <Pressable
                  onPress={() => void togglePaid(item.c)}
                  onLongPress={() => removePerson(item.c)}
                  style={[styles.check, paid && styles.checkOn]}
                  hitSlop={6}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: paid }}
                  accessibilityLabel={`Mark ${item.c.name} paid`}
                >
                  {paid && <Check size={15} color={colors.white} strokeWidth={3} />}
                </Pressable>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.addRow}>
            <TextInput
              ref={setAddRef}
              style={[styles.cellName, styles.addCell]}
              value={addName}
              onChangeText={setAddName}
              placeholder="+ Add name"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              onSubmitEditing={() => {
                if (addAmount) void addRow();
                else addRef?.focus?.();
              }}
              blurOnSubmit={false}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.cellAmount, styles.addCell]}
              value={addAmount}
              onChangeText={setAddAmount}
              placeholder="Amount"
              placeholderTextColor={colors.border}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => void addRow()}
            />
            <View style={styles.cellPaid}>
              <Pressable
                onPress={() => void addRow()}
                disabled={!addName.trim()}
                style={[styles.addBtn, !addName.trim() && styles.addBtnOff]}
              >
                <Plus size={16} color={addName.trim() ? colors.white : colors.muted} />
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No names yet — type a name and amount below to start the sheet.
            </Text>
          </View>
        }
      />

      <Text style={styles.hint}>
        Tap the box to toggle paid · swipe the month bar to change months ·
        long-press a row to remove it. Edits save as you go.
      </Text>

      {confirmNode}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.4,
    marginTop: spacing.sm,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  periodBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  periodLabel: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.forest,
  },
  thisMonth: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  stats: {
    fontSize: typography.caption,
    color: colors.muted,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  rotation: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
  },
  rotationName: {
    color: colors.forest,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: spacing.sm,
  },
  colHeadText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: spacing.sm,
    minHeight: 48,
  },
  cellName: {
    flex: 1,
    fontSize: typography.body,
    color: colors.forest,
    fontWeight: '500',
    paddingVertical: 6,
  },
  cellAmount: {
    width: COL.amount,
    fontSize: typography.body,
    color: colors.forest,
    textAlign: 'right',
    fontWeight: '600',
    paddingVertical: 6,
  },
  cellPaid: {
    width: COL.paid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: spacing.sm,
    minHeight: 48,
  },
  addCell: {
    fontWeight: '400',
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnOff: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  empty: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    textAlign: 'center',
  },
});

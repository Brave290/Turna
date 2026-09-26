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
import { colors, spacing, typography, type Palette } from '../theme';
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
  parsePeriodRange,
  parseStartPeriod,
  monthsBetween,
  clampPeriod,
  offlineUuid,
  type SoloContributor,
  type SoloLedger,
} from '../lib/solo-store';
import { formatCurrency } from '../lib/format';
import { usePaletteStyles } from '../context/ThemeContext';

function money(n: number) {
  return formatCurrency(n);
}

const COL = { turn: 34, name: 0, amount: 92, paid: 52 };

/**
 * Solo ledger — spreadsheet view: one row per person, columns
 * № / Name / Amount / Paid. The № cell is the turn number (tap to retype —
 * rows re-sort and sort_order is renormalised). The sheet's name carries the
 * rotation window: "June – December 2026" → start June, end December.
 */
export function SoloLedgerDetailScreen({
  ledgerId,
  onBack,
}: {
  ledgerId: string;
  onBack: () => void;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const [ledger, setLedger] = useState<SoloLedger | null>(null);
  const [period, setPeriod] = useState(periodKey());
  const [turnEdit, setTurnEdit] = useState<{ id: string; text: string } | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addRef, setAddRef] = useState<{ focus?: () => void } | null>(null);
  const { confirm, node: confirmNode } = useConfirm();
  const landedRef = useRef(false);

  // Rotation window, derived from the auto name ("June – December 2026").
  // Legacy names carry only a start month → open-ended cycle (end = null).
  const range = useMemo(
    () => (ledger ? parsePeriodRange(ledger.name) : null),
    [ledger]
  );
  const start = range ? range.start : ledger ? parseStartPeriod(ledger.name) : null;
  const end = range ? range.end : null;
  const duration = range ? monthsBetween(range.start, range.end) + 1 : 0;

  // Live bounds for the one-shot PanResponder (it can't close over state).
  const boundsRef = useRef<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  boundsRef.current = { start, end };

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

  // Opening a sheet lands on the spreadsheet at the cycle's start month.
  useEffect(() => {
    if (!ledger || landedRef.current) return;
    landedRef.current = true;
    if (start) setPeriod(start);
  }, [ledger, start]);

  /** Move by ±1 month, never past [start, end]. */
  const goMonth = useCallback((delta: number) => {
    setPeriod((prev) =>
      clampPeriod(
        shiftPeriod(prev, delta),
        boundsRef.current.start,
        boundsRef.current.end
      )
    );
  }, []);

  // B3: a new row takes the next free turn number.
  const nextTurn = useMemo(() => {
    if (!ledger) return 0;
    return (
      ledger.contributors
        .filter((x) => !x.archived)
        .reduce((m, x) => Math.max(m, x.sort_order), -1) + 1
    );
  }, [ledger]);

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
    let settled = 0;
    rows.forEach(({ entry }) => {
      if (entry && entry.status !== 'unpaid') {
        collected += entry.amount_paid;
        settled += 1;
        if (entry.status === 'paid') paid += 1;
      }
    });
    return { collected, paid, settled, total: rows.length };
  }, [rows]);

  // Rotation: row order = collection order, anchored to the window's start.
  // Collector for period P = row at (monthsBetween(start, P) mod rowCount).
  const rotation = useMemo(() => {
    if (!ledger || rows.length === 0) return null;
    const beforeStart = start ? monthsBetween(period, start) > 0 : false;
    const afterEnd = end ? monthsBetween(period, end) < 0 : false;
    if (beforeStart || afterEnd) {
      return {
        current: null,
        next: null,
        nextLabel: '',
        status: beforeStart ? 'Out of cycle' : 'Cycle completed',
      };
    }
    const anchor = start ?? period;
    const pick = (p: string) => {
      const idx =
        (((monthsBetween(anchor, p) % rows.length) + rows.length) %
          rows.length);
      return rows[idx]?.c ?? null;
    };
    const nextPeriod = shiftPeriod(period, 1);
    const hasNext = !end || monthsBetween(nextPeriod, end) >= 0;
    return {
      current: pick(period),
      next: hasNext ? pick(nextPeriod) : null,
      nextLabel: formatPeriodLabel(nextPeriod),
      status: null,
    };
  }, [ledger, rows, period, start, end]);

  // Auto-advance: when the live month is fully collected, roll forward —
  // but never past the cycle's end month.
  useEffect(() => {
    if (!ledger || rows.length === 0) return;
    if (period !== periodKey()) return;
    const allPaid = rows.every(
      ({ entry }) => entry != null && entry.status !== 'unpaid'
    );
    if (allPaid) goMonth(1);
  }, [ledger, rows, period, goMonth]);

  // Swipe left/right on the month frame to move between months.
  const monthSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -40) goMonth(1);
        else if (g.dx > 40) goMonth(-1);
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

  /**
   * Turn number cell: type a number → the row moves to that position and
   * every active row's sort_order is renormalised sequentially (0,1,2…).
   */
  async function saveTurn(c: SoloContributor, raw: string) {
    setTurnEdit(null);
    if (!ledger) return;
    const active = ledger.contributors
      .filter((x) => !x.archived)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (active.length === 0) return;
    const n = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(n)) return;
    const target = Math.min(Math.max(n, 1), active.length) - 1; // 1-based → index
    const from = active.findIndex((x) => x.id === c.id);
    if (from < 0) return;
    if (from === target && active.every((r, i) => r.sort_order === i)) return;
    const ordered = [...active];
    if (from !== target) {
      const [moved] = ordered.splice(from, 1);
      ordered.splice(target, 0, moved);
    }
    for (let i = 0; i < ordered.length; i += 1) {
      const row = ordered[i];
      if (row.sort_order === i) continue;
      await queueContributor(ledger.id, {
        ...row,
        sort_order: i,
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
      sort_order: nextTurn,
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
  const perPerson = ledger.default_amount;
  const pot = perPerson * stats.total;
  const canPrev = !start || monthsBetween(start, period) > 0;
  const canNext = !end || monthsBetween(period, end) > 0;
  const cycleDone =
    !!end && period === end && stats.total > 0 && stats.settled === stats.total;

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
          <ChevronLeft size={16} color={p.textMuted} />
          <Text style={styles.backText}>Solo ledgers</Text>
        </Pressable>

        <Text style={styles.title}>{ledger.name}</Text>

        <Text style={styles.rangeLine}>
          {duration > 0 ? `${duration} months · ` : ''}
          {stats.total} collector{stats.total === 1 ? '' : 's'}
        </Text>

        <View style={styles.periodRow} {...monthSwipe.panHandlers}>
          <Pressable
            style={[styles.periodBtn, !canPrev && styles.periodBtnOff]}
            disabled={!canPrev}
            onPress={() => goMonth(-1)}
            hitSlop={8}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={18} color={p.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.periodLabel}>{formatPeriodLabel(period)}</Text>
            {!isCurrent && (
              <Pressable
                onPress={() => setPeriod(clampPeriod(periodKey(), start, end))}
                hitSlop={6}
              >
                <Text style={styles.thisMonth}>Jump to this month</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            style={[styles.periodBtn, !canNext && styles.periodBtnOff]}
            disabled={!canNext}
            onPress={() => goMonth(1)}
            hitSlop={8}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={18} color={p.text} />
          </Pressable>
        </View>

        <Text style={styles.pot}>Collector gets {money(pot)}</Text>
        <Text style={styles.stats}>
          {money(perPerson)} × {stats.total} people = {money(pot)} pot ·{' '}
          {money(stats.collected)} collected · {stats.paid}/{stats.total} paid
        </Text>

        {rotation?.status ? (
          <Text style={styles.status}>{rotation.status}</Text>
        ) : rotation?.current ? (
          <Text style={styles.rotation}>
            This month: <Text style={styles.rotationName}>{rotation.current.name}</Text>
            {rotation.next ? (
              <>
                {'  ·  Next ({rotation.nextLabel}): '}
                <Text style={styles.rotationName}>{rotation.next.name}</Text>
              </>
            ) : null}
            {cycleDone ? '  ·  Cycle completed' : null}
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
            tintColor={p.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.colHeader}>
            <Text style={[styles.colHeadText, { width: COL.turn, textAlign: 'center' }]}>
              №
            </Text>
            <Text style={[styles.colHeadText, { flex: 1 }]}>NAME</Text>
            <Text style={[styles.colHeadText, { width: COL.amount, textAlign: 'right' }]}>
              AMOUNT
            </Text>
            <Text style={[styles.colHeadText, { width: COL.paid, textAlign: 'center' }]}>
              PAID
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const paid = item.entry ? item.entry.status !== 'unpaid' : false;
          const expected = item.c.expected_amount || ledger.default_amount;
          const turnText =
            turnEdit && turnEdit.id === item.c.id ? turnEdit.text : String(index + 1);
          return (
            <View style={styles.row}>
              <TextInput
                style={styles.cellTurn}
                value={turnText}
                onChangeText={(t: string) => setTurnEdit({ id: item.c.id, text: t })}
                onEndEditing={(e: { nativeEvent: { text: string } }) =>
                  void saveTurn(item.c, e.nativeEvent.text)
                }
                keyboardType="number-pad"
                returnKeyType="done"
                selectTextOnFocus
                textAlign="center"
                accessibilityLabel={`Turn number for ${item.c.name}`}
              />
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
            <View style={styles.cellTurnWrap}>
              <Text style={styles.addTurn}>№{nextTurn + 1}</Text>
            </View>
            <TextInput
              ref={setAddRef}
              style={[styles.cellName, styles.addCell]}
              value={addName}
              onChangeText={setAddName}
              placeholder="+ Add name"
              placeholderTextColor={p.textMuted}
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
                <Plus size={16} color={addName.trim() ? colors.white : p.textMuted} />
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
        Type a number in the № column to change a turn order · tap the box to
        toggle paid · swipe the month bar to change months (stops at the cycle's
        end) · long-press a row to remove it. Edits save as you go.
      </Text>

      {confirmNode}
    </Screen>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
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
    color: p.textMuted,
    fontWeight: '500',
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: p.text,
    letterSpacing: -0.4,
    marginTop: spacing.sm,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
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
    backgroundColor: p.bg,
  },
  periodBtnOff: {
    opacity: 0.35,
  },
  periodLabel: {
    fontSize: typography.body,
    fontWeight: '700',
    color: p.text,
  },
  thisMonth: {
    fontSize: 11,
    color: p.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  rangeLine: {
    fontSize: typography.caption,
    color: p.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  pot: {
    fontSize: typography.body,
    color: p.primarySolid,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  stats: {
    fontSize: typography.caption,
    color: p.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  rotation: {
    fontSize: typography.caption,
    color: p.textMuted,
    marginTop: 4,
  },
  rotationName: {
    color: p.text,
    fontWeight: '700',
  },
  status: {
    fontSize: typography.caption,
    color: p.text,
    fontWeight: '700',
    marginTop: 4,
    backgroundColor: p.bg,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: p.border,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.bg,
    borderWidth: 1,
    borderColor: p.border,
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
    color: p.textMuted,
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: spacing.sm,
    minHeight: 48,
  },
  cellName: {
    flex: 1,
    fontSize: typography.body,
    color: p.text,
    fontWeight: '500',
    paddingVertical: 6,
  },
  cellTurn: {
    width: COL.turn,
    fontSize: typography.caption + 1,
    color: p.text,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
  },
  cellTurnWrap: {
    width: COL.turn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTurn: {
    fontSize: typography.caption,
    color: p.textMuted,
    fontWeight: '700',
    textAlign: 'center',
  },
  cellAmount: {
    width: COL.amount,
    fontSize: typography.body,
    color: p.text,
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
    borderColor: p.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: p.surface,
  },
  checkOn: {
    backgroundColor: p.primarySolid,
    borderColor: p.primary,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.bg,
    borderWidth: 1,
    borderColor: p.border,
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
    backgroundColor: p.primarySolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnOff: {
    backgroundColor: p.surface,
    borderWidth: 1.5,
    borderColor: p.border,
  },
  empty: {
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    borderTopWidth: 0,
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: typography.caption,
    color: p.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    color: p.textMuted,
    lineHeight: 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    textAlign: 'center',
  },
});

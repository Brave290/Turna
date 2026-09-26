import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingOverlay } from '../components/Loading';
import { Popup, useConfirm } from '../components/Popup';
import { colors, spacing, typography, type Palette } from '../theme';
import { Trash2 } from 'lucide-react-native';
import {
  getSoloLedgers,
  putSoloLedger,
  deleteSoloLedger,
  pullSoloFromServer,
  pushSoloToServer,
  offlineUuid,
  shiftPeriod,
  periodKey,
  formatPeriodLabel,
  deriveLedgerName,
  monthsBetween,
  parsePeriodRange,
  type SoloLedger,
} from '../lib/solo-store';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/format';
import { usePaletteStyles } from '../context/ThemeContext';

function money(n: number, currency = 'NGN') {
  return formatCurrency(n, currency);
}

export function SoloLedgersScreen({ onOpen, onPush }: { onOpen?: (id: string) => void; onPush?: (screen: any) => void } = {}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const { confirm, node: confirmNode } = useConfirm();
  const [rows, setRows] = useState<SoloLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [start, setStart] = useState(periodKey());
  const [end, setEnd] = useState(shiftPeriod(periodKey(), 6));
  const [amount, setAmount] = useState('5000');

  // Same 15-month window the old single-month picker used.
  const monthOptions = useMemo(
    () => Array.from({ length: 15 }, (_, i) => shiftPeriod(periodKey(), i - 1)),
    []
  );
  const duration = monthsBetween(start, end) + 1;
  const derivedName = deriveLedgerName(start, end);

  const load = useCallback(async () => {
    try {
      const local = await getSoloLedgers();
      setRows(local);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    if (user) {
      try {
        await pullSoloFromServer();
        await pushSoloToServer();
        setRows(await getSoloLedgers());
      } catch {
        /* offline ok */
      }
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!user) return;
    const id = offlineUuid();
    const sheetName = derivedName;
    const defaultAmount = Math.round(Number(amount.replace(/[^\d.]/g, '') || '0') * 100);
    await putSoloLedger({
      id,
      name: sheetName,
      currency: 'NGN',
      default_amount: defaultAmount,
      description: null,
      contributors: [],
      entries: [],
      pendingEntries: [],
      pendingContributors: [],
      updated_at: new Date().toISOString(),
    });
    try {
      const { error } = await supabase.from('solo_ledgers').insert({
        id,
        user_id: user.id,
        name: sheetName,
        currency: 'NGN',
        default_amount: defaultAmount,
        description: null,
        local_updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch {
      /* will sync later — local already saved */
    }
    setAmount('5000');
    setStart(periodKey());
    setEnd(shiftPeriod(periodKey(), 6));
    setCreating(false);
    await load();
    onOpen?.(id);
  }

  function pickStart(m: string) {
    setStart(m);
    if (monthsBetween(m, end) < 0) setEnd(m); // end can never precede start
  }

  function pickEnd(m: string) {
    setEnd(monthsBetween(start, m) > 0 ? start : m);
  }

  function chipRow(value: string, onPick: (m: string) => void) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthChips}
      >
        {monthOptions.map((m) => {
          const on = m === value;
          return (
            <Pressable
              key={m}
              onPress={() => onPick(m)}
              style={[styles.monthChip, on && styles.monthChipOn]}
            >
              <Text style={[styles.monthChipText, on && styles.monthChipTextOn]}>
                {formatPeriodLabel(m)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  async function remove(id: string, ledgerName: string) {
    const ok = await confirm('Delete ledger?', `${ledgerName} and its records will be removed.`, {
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await deleteSoloLedger(id);
    await load();
  }

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Solo Ledger</Text>
            <Text style={styles.sub}>
              Personal ajo tracker — no circle required. Works offline; syncs when you're back
              online.
            </Text>
          </View>
        </View>
        <Button
          label={creating ? 'Cancel' : 'New ledger'}
          variant={creating ? 'outline' : 'primary'}
          onPress={() => setCreating((v) => !v)}
          style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
        />
      </View>

      <Popup
        visible={creating}
        onClose={() => setCreating(false)}
        title="New solo sheet"
        subtitle="Pick the first and last month — the name and rotation follow them."
        footer={
          <View style={styles.createActions}>
            <Button label="Create sheet" onPress={create} style={{ flex: 1 }} />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => setCreating(false)}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <Text style={styles.label}>Start month</Text>
        {chipRow(start, pickStart)}

        <Text style={styles.label}>End month</Text>
        {chipRow(end, pickEnd)}

        <Text style={styles.label}>Sheet name (auto)</Text>
        <View style={styles.namePreview}>
          <Text style={styles.namePreviewText}>{derivedName}</Text>
          <Text style={styles.durationLine}>
            {duration} month{duration === 1 ? '' : 's'} · collectors rotate once a
            month
          </Text>
        </View>

        <Text style={styles.label}>Default monthly amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="5000"
          placeholderTextColor={p.textMuted}
        />
      </Popup>

      {confirmNode}

      {loading ? (
        <LoadingOverlay label="Loading ledgers…" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
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
          ListFooterComponent={
            <Text style={styles.footNote}>
              Different from circle Ledger — Solo Ledger is your private spreadsheet for people
              who contribute to you directly.
            </Text>
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No solo ledgers yet</Text>
              <Text style={styles.emptyBody}>
                Track contributors and monthly payments without creating a circle.
              </Text>
              <Button
                label="Create your first ledger"
                onPress={() => setCreating(true)}
                style={{ marginTop: spacing.md, alignSelf: 'stretch' }}
              />
            </Card>
          }
          renderItem={({ item }) => {
            const pendingCount =
              (item.pendingEntries?.length ?? 0) +
              (item.pendingContributors?.length ?? 0);
            const range = parsePeriodRange(item.name);
            const months = range ? monthsBetween(range.start, range.end) + 1 : 0;
            return (
            <Pressable onPress={() => onOpen?.(item.id)}>
              <Card style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>
                      {months > 0 ? `${months} months · ` : ''}
                      Default {money(item.default_amount, item.currency)} · updated{' '}
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleDateString('en-NG')
                        : 'just now'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void remove(item.id, item.name)}
                    hitSlop={10}
                    style={styles.trash}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    <Trash2 size={16} color={p.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.cardFoot}>
                  <Badge
                    label={pendingCount > 0 ? 'pending' : 'synced'}
                    tone={pendingCount > 0 ? 'pending' : 'active'}
                  />
                  <Text style={styles.openHint}>Tap to open ›</Text>
                </View>
              </Card>
            </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  headRow: {
    flexDirection: 'row',
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: p.text,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: typography.body,
    color: p.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  createCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  monthChips: {
    gap: spacing.sm,
    paddingVertical: 4,
    paddingRight: spacing.md,
  },
  monthChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.bg,
  },
  monthChipOn: {
    backgroundColor: p.primarySolid,
    borderColor: p.primary,
  },
  monthChipText: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: p.text,
  },
  monthChipTextOn: {
    color: colors.white,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '500',
    color: p.textMuted,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  namePreview: {
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: p.surface,
  },
  namePreviewText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: p.text,
  },
  durationLine: {
    fontSize: typography.caption,
    color: p.textMuted,
    marginTop: 4,
    fontWeight: '600',
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
  createActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  card: { marginBottom: 0 },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: p.text,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  trash: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: p.bg,
  },
  openHint: {
    fontSize: 12,
    color: p.primary,
    fontWeight: '600',
  },
  meta: {
    fontSize: typography.caption,
    color: p.textMuted,
    marginTop: 6,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  smallBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  emptyCard: {
    alignItems: 'stretch',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.heading,
    fontWeight: '600',
    color: p.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: typography.body,
    color: p.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  footNote: {
    fontSize: 12,
    color: p.textMuted,
    lineHeight: 18,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
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
import { colors, spacing, typography } from '../theme';
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
  type SoloLedger,
} from '../lib/solo-store';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/format';

function money(n: number, currency = 'NGN') {
  return formatCurrency(n, currency);
}

export function SoloLedgersScreen({ onOpen, onPush }: { onOpen?: (id: string) => void; onPush?: (screen: any) => void } = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<SoloLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [month, setMonth] = useState(periodKey());
  const [amount, setAmount] = useState('5000');

  const load = useCallback(async () => {
    const local = await getSoloLedgers();
    setRows(local);
    setLoading(false);
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
    const sheetName = formatPeriodLabel(month);
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
    setMonth(periodKey());
    setCreating(false);
    await load();
    onOpen?.(id);
  }

  function remove(id: string, ledgerName: string) {
    Alert.alert('Delete ledger?', `${ledgerName} and its records will be removed.`, [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteSoloLedger(id);
            await load();
          })();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

      <Modal
        visible={creating}
        transparent
        animationType="fade"
        onRequestClose={() => setCreating(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCreating(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>New solo sheet</Text>
            <Text style={styles.modalSub}>
              Pick the month — the sheet is named after it.
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthChips}
            >
              {Array.from({ length: 15 }, (_, i) => shiftPeriod(periodKey(), i - 1)).map(
                (m) => {
                  const on = m === month;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMonth(m)}
                      style={[styles.monthChip, on && styles.monthChipOn]}
                    >
                      <Text style={[styles.monthChipText, on && styles.monthChipTextOn]}>
                        {formatPeriodLabel(m)}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <Text style={styles.label}>Default monthly amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="5000"
              placeholderTextColor={colors.muted}
            />

            <View style={styles.createActions}>
              <Button
                label="Create sheet"
                onPress={create}
                style={{ flex: 1 }}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setCreating(false)}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
              tintColor={colors.primary}
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
          renderItem={({ item }) => (
            <Pressable onPress={() => onOpen?.(item.id)}>
              <Card style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>
                      Default {money(item.default_amount, item.currency)} · updated{' '}
                      {new Date(item.updated_at).toLocaleDateString('en-NG')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void remove(item.id, item.name)}
                    hitSlop={10}
                    style={styles.trash}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    <Trash2 size={16} color={colors.muted} />
                  </Pressable>
                </View>
                <View style={styles.cardFoot}>
                  <Badge
                    label={
                      item.pendingEntries.length + item.pendingContributors.length > 0
                        ? 'pending'
                        : 'synced'
                    }
                    tone={
                      item.pendingEntries.length + item.pendingContributors.length > 0
                        ? 'pending'
                        : 'active'
                    }
                  />
                  <Text style={styles.openHint}>Tap to open ›</Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    color: colors.forest,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: typography.body,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 20,
  },
  createCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,22,40,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.forest,
  },
  modalSub: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
    marginBottom: spacing.md,
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
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  monthChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthChipText: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: colors.forest,
  },
  monthChipTextOn: {
    color: colors.white,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.forest,
    fontSize: typography.body,
    backgroundColor: colors.white,
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
    color: colors.forest,
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
    backgroundColor: colors.cream,
  },
  openHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  meta: {
    fontSize: typography.caption,
    color: colors.muted,
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
    color: colors.forest,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  footNote: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, typography } from '../theme';
import {
  getSoloLedgers,
  putSoloLedger,
  deleteSoloLedger,
  pullSoloFromServer,
  pushSoloToServer,
  offlineUuid,
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
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('5000');
  const [description, setDescription] = useState('');

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
    if (!name.trim() || !user) return;
    const id = offlineUuid();
    const defaultAmount = Math.round(Number(amount.replace(/[^\d.]/g, '') || '0') * 100);
    await putSoloLedger({
      id,
      name: name.trim(),
      currency: 'NGN',
      default_amount: defaultAmount,
      description: description.trim() || null,
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
        name: name.trim(),
        currency: 'NGN',
        default_amount: defaultAmount,
        description: description.trim() || null,
        local_updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch {
      /* will sync later — local already saved */
    }
    setName('');
    setAmount('5000');
    setDescription('');
    setCreating(false);
    await load();
    onOpen?.(id);
  }

  async function remove(id: string, ledgerName: string) {
    await deleteSoloLedger(id);
    await load();
    void ledgerName;
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

      {creating && (
        <Card style={[styles.createCard, { borderColor: colors.primary }]}>
          <Text style={styles.label}>Ledger name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Shop ajo / Family savings"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Default monthly amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="5000"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Collects every month on the 5th"
            placeholderTextColor={colors.muted}
          />
          <View style={styles.createActions}>
            <Button label="Create ledger" onPress={create} disabled={!name.trim()} style={{ flex: 1 }} />
            <Button label="Cancel" variant="ghost" onPress={() => setCreating(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl }} />
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
            <Card style={styles.card}>
              <Pressable onPress={() => onOpen?.(item.id)}>
                <Text style={styles.name}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  Default {money(item.default_amount, item.currency)} · updated{' '}
                  {new Date(item.updated_at).toLocaleDateString('en-NG')}
                </Text>
              </Pressable>
              <View style={styles.cardActions}>
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
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button label="Open" variant="outline" onPress={() => onOpen?.(item.id)} style={styles.smallBtn} />
                  <Button
                    label="Delete"
                    variant="ghost"
                    onPress={() => void remove(item.id, item.name)}
                    style={styles.smallBtn}
                  />
                </View>
              </View>
            </Card>
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
  desc: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
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

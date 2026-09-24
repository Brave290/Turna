import React, { useCallback, useEffect, useState } from 'react';
import {
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
  pullSoloFromServer,
  pushSoloToServer,
  offlineUuid,
  type SoloLedger,
} from '../lib/solo-store';
import { supabase } from '../lib/supabase';

export function SoloLedgersScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<SoloLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
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
    if (!name.trim() || !user) return;
    const id = offlineUuid();
    await putSoloLedger({
      id,
      name: name.trim(),
      currency: 'NGN',
      default_amount: Math.round(Number(amount.replace(/[^\d.]/g, '') || '0') * 100),
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
        default_amount: Math.round(Number(amount.replace(/[^\d.]/g, '') || '0') * 100),
        local_updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch {
      /* will sync later — local already saved */
    }
    setName('');
    setAmount('5000');
    setCreating(false);
    await load();
    onOpen(id);
  }

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Text style={styles.title}>Solo Ledger</Text>
        <Text style={styles.sub}>
          Personal ajo tracker — offline first, syncs when online.
        </Text>
        <Button
          label={creating ? 'Close' : 'New ledger'}
          variant={creating ? 'outline' : 'primary'}
          onPress={() => setCreating((v) => !v)}
          style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
        />
      </View>

      {creating && (
        <Card style={{ marginHorizontal: spacing.lg }}>
          <Text style={styles.label}>Ledger name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Shop ajo"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Default monthly amount (₦)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="5000"
            placeholderTextColor={colors.muted}
          />
          <Button label="Create" onPress={create} disabled={!name.trim()} style={{ marginTop: spacing.sm }} />
        </Card>
      )}

      {loading ? (
        <Text style={{ color: colors.muted, paddingHorizontal: spacing.lg }}>Loading…</Text>
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
          ListEmptyComponent={
            <Card>
              <Text style={styles.emptyTitle}>No ledgers yet</Text>
              <Text style={styles.emptyBody}>
                Create one to track contributors and monthly paid/unpaid status without a
                circle.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => onOpen(item.id)}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>
                      {item.contributors.length} people · updated{' '}
                      {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
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
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.forest,
  },
  sub: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '600',
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  card: { marginBottom: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  emptyBody: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 20,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../lib/format';

type Circle = {
  id: string;
  name: string;
  status: string;
  contribution_amount: number;
  currency: string;
  frequency: string;
  description?: string | null;
  current_cycle?: string | null;
};

type Payout = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  circle_name: string;
};

function money(n: number, c = 'NGN') {
  return formatCurrency(n, c);
}

export function ContributionsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<
    { id: string; status: string; amount: number; currency: string; created_at: string; circle_name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('contributions')
        .select(
          `id, status, reported_amount, expected_amount, created_at,
           contribution_cycles!inner(circle_id, circles(name, currency))`
        )
        .order('created_at', { ascending: false })
        .limit(100);
      setRows(
        ((data ?? []) as unknown as {
          id: string;
          status: string;
          reported_amount: number | null;
          expected_amount: number;
          created_at: string;
          contribution_cycles: {
            circles: { name: string; currency: string } | null;
          } | null;
        }[]).map((c) => ({
          id: c.id,
          status: c.status,
          amount: c.reported_amount ?? c.expected_amount,
          currency: c.contribution_cycles?.circles?.currency ?? 'NGN',
          created_at: c.created_at,
          circle_name: c.contribution_cycles?.circles?.name ?? 'Circle',
        }))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <View style={styles.headRow}>
          {onBack && <Button label="← Back" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Contributions</Text>
            <Text style={styles.sub}>Track what you owe and what you've paid this cycle.</Text>
          </View>
        </View>
      </View>
      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.empty}>No contributions yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.circle_name}</Text>
                  <Text style={styles.meta}>
                    {money(item.amount, item.currency)} ·{' '}
                    {new Date(item.created_at).toLocaleDateString('en-NG')}
                  </Text>
                </View>
                <Badge
                  label={item.status}
                  tone={
                    item.status === 'confirmed'
                      ? 'active'
                      : item.status === 'pending' || item.status === 'reported'
                        ? 'pending'
                        : 'muted'
                  }
                />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

export function PayoutsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('payouts')
        .select('id, status, amount, currency, created_at, circle_id, circles(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      setRows(
        ((data ?? []) as unknown as {
          id: string;
          status: string;
          amount: number;
          currency: string;
          created_at: string;
          circles?: { name: string } | null;
        }[]).map((p) => ({
          id: p.id,
          status: p.status,
          amount: p.amount,
          currency: p.currency,
          created_at: p.created_at,
          circle_name: p.circles?.name ?? 'Circle',
        }))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <View style={styles.headRow}>
          {onBack && <Button label="← Back" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Payouts</Text>
            <Text style={styles.sub}>Pot payouts and receipt status.</Text>
          </View>
        </View>
      </View>
      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.empty}>No payouts yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.circle_name}</Text>
                  <Text style={styles.meta}>
                    {money(item.amount, item.currency)} ·{' '}
                    {new Date(item.created_at).toLocaleDateString('en-NG')}
                  </Text>
                </View>
                <Badge
                  label={item.status}
                  tone={
                    item.status === 'received' || item.status === 'completed'
                      ? 'active'
                      : item.status === 'pending' || item.status === 'initiated'
                        ? 'pending'
                        : 'muted'
                  }
                />
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
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
  },
  loading: {
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.muted,
  },
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 20,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: typography.body,
  },
});

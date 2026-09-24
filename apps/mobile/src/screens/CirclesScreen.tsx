import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

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

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

export function CirclesScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [owned, member] = await Promise.all([
        supabase
          .from('circles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('circle_members')
          .select('circles(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(50),
      ]);
      const ownedRows = (owned.data ?? []) as Circle[];
      const memberRows = ((member.data ?? []) as unknown as { circles: Circle | null }[])
        .map((m) => m.circles)
        .filter(Boolean) as Circle[];
      const map = new Map<string, Circle>();
      ownedRows.forEach((c) => map.set(c.id, c));
      memberRows.forEach((c) => {
        if (!map.has(c.id)) map.set(c.id, c);
      });
      setRows(Array.from(map.values()));
      if (owned.error) setError(owned.error.message);
    } catch {
      setError('Could not load circles.');
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
        <Text style={styles.title}>Circles</Text>
        <Text style={styles.sub}>Savings circles you own or belong to.</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
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
              <Text style={styles.emptyTitle}>No circles yet</Text>
              <Text style={styles.emptyBody}>
                {error ?? 'Create a circle on the web dashboard, or accept an invite link.'}
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.main}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {money(Number(item.contribution_amount || 0), item.currency)} /{' '}
                    {item.frequency}
                  </Text>
                  {item.description ? (
                    <Text style={styles.desc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Badge
                  label={item.status}
                  tone={
                    item.status === 'active'
                      ? 'active'
                      : item.status === 'paused'
                        ? 'pending'
                        : 'muted'
                  }
                />
              </View>
              {item.current_cycle ? (
                <Text style={styles.cycle}>Cycle {item.current_cycle}</Text>
              ) : null}
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
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.forest,
  },
  sub: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
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
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
  },
  desc: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 18,
  },
  cycle: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '600',
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

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
  member_count?: number | null;
  owner_id?: string;
};

type Membership = {
  circle_id: string;
  role?: string;
  payout_position?: number | null;
  circles: Circle | null;
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

export function CirclesScreen({ onPush, onNewCircle }: { onPush?: (screen: any) => void; onNewCircle?: () => void } = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<
    (Circle & { role: string; payoutPosition: number | null })[]
  >([]);
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
          .select('circle_id, role, payout_position, circles(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(50),
      ]);
      const ownedRows = (owned.data ?? []) as Circle[];
      const memberships = ((member.data ?? []) as unknown as Membership[]) ?? [];
      const map = new Map<string, Circle & { role: string; payoutPosition: number | null }>();
      ownedRows.forEach((c) =>
        map.set(c.id, {
          ...c,
          role: c.owner_id === user.id ? 'owner' : 'member',
          payoutPosition: null,
        })
      );
      memberships.forEach((m) => {
        if (!m.circles) return;
        if (!map.has(m.circle_id)) {
          map.set(m.circle_id, {
            ...m.circles,
            role: m.role ?? 'member',
            payoutPosition: m.payout_position ?? null,
          });
        }
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

  const sub =
    rows.length === 0
      ? 'Start your first savings circle.'
      : `${rows.length} circle${rows.length === 1 ? '' : 's'} you belong to.`;

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Circles</Text>
            <Text style={styles.sub}>{sub}</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => onPush?.({ name: 'new-circle' })}>
            <Text style={styles.btnOutlineText}>Join</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onNewCircle}>
            <Text style={styles.btnPrimaryText}>New Circle</Text>
          </Pressable>
        </View>
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
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No circles yet</Text>
              <Text style={styles.emptyBody}>
                {error ??
                  'Create a circle, set contribution amount and schedule, then invite members by email — or join with a code.'}
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => onPush?.({ name: 'circle-detail', circleId: item.id })}>
              <View style={styles.row}>
                <View style={styles.main}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    <Text style={styles.amount}>{money(Number(item.contribution_amount || 0), item.currency)}</Text>
                    <Text style={styles.metaNormal}> / {item.frequency}</Text>
                  </Text>
                </View>
                <Badge
                  label={item.status}
                  tone={
                    item.status === 'active' ? 'active' : item.status === 'paused' ? 'pending' : 'muted'
                  }
                />
              </View>
              <View style={styles.badgeRow}>
                <Badge label={item.role} tone="muted" />
                {item.member_count != null && (
                  <Badge label={`${item.member_count} members`} tone="muted" />
                )}
                <Badge label={`Cycle ${item.current_cycle || 0}`} tone="muted" />
                {item.payoutPosition != null && (
                  <Badge label={`Pos ${item.payoutPosition}`} tone="active" />
                )}
              </View>
              <View style={styles.openRow}>
                <Text style={styles.desc} numberOfLines={1}>
                  {item.description ?? ''}
                </Text>
                <Text style={styles.open}>Open →</Text>
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '600',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnOutlineText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '600',
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
    marginTop: 4,
  },
  amount: {
    color: colors.primary,
    fontWeight: '500',
  },
  metaNormal: {
    color: colors.muted,
    fontWeight: '400',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  desc: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
  },
  open: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.heading,
    fontWeight: '600',
    color: colors.forest,
  },
  emptyBody: {
    fontSize: typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
});

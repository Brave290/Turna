import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge, Stat } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../lib/format';

function money(n: number, c = 'NGN') {
  return formatCurrency(n, c);
}

type Circle = {
  id: string;
  name: string;
  status: string;
  contribution_amount: number;
  currency: string;
  frequency: string;
  current_cycle?: number | null;
};

export function InsightsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [owned, setOwned] = useState<Circle[]>([]);
  const [contributed, setContributed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [c, m, w] = await Promise.all([
        supabase.from('circles').select('id, name, status, contribution_amount, currency, frequency, current_cycle').limit(50),
        supabase.from('circle_members').select('circle_id, circles(id)').eq('user_id', user.id).eq('status', 'active').limit(50),
        supabase.from('wallets' as never).select('paid_amount' as never).limit(100),
      ]);
      const ownedRows = (c.data ?? []) as Circle[];
      setOwned(ownedRows);
      const memberIds = new Set(((m.data ?? []) as unknown as { circle_id: string }[]).map((x) => x.circle_id));
      const all = new Map<string, Circle>();
      ownedRows.forEach((x) => all.set(x.id, x));
      ((m.data ?? []) as unknown as { circles: Circle | null }[]).forEach((x) => {
        if (x.circles && !all.has(x.circles.id)) all.set(x.circles.id, x.circles);
      });
      setCircles(Array.from(all.values()).filter((x) => memberIds.has(x.id) || ownedRows.some((o) => o.id === x.id)));
      const wallets = (w.data ?? []) as unknown as { paid_amount: number }[] | null;
      setContributed(Array.isArray(wallets) ? wallets.reduce((s, x) => s + Number(x.paid_amount || 0), 0) : 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const byStatus = circles.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const avg =
    circles.length > 0
      ? circles.reduce((s, c) => s + Number(c.contribution_amount || 0), 0) / circles.length
      : 0;
  const totalCircles = circles.length;
  const active = circles.filter((c) => c.status === 'active').length;

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <View style={styles.headRow}>
          {onBack && <Button label="← Back" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.sub}>Real numbers from your circles — not demo stats.</Text>
          </View>
        </View>
      </View>
      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <FlatList
          data={circles.slice(0, 20)}
          keyExtractor={(c) => c.id}
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
          ListHeaderComponent={
            <>
              <View style={styles.grid}>
                <Card style={styles.metric}>
                  <Stat label="Active circles" value={String(active)} />
                </Card>
                <Card style={styles.metric}>
                  <Stat label="Owned by you" value={String(owned.length)} />
                </Card>
                <Card style={styles.metric}>
                  <Stat label="Confirmed contributed" value={money(contributed)} />
                </Card>
                <Card style={styles.metric}>
                  <Stat label="Avg contribution" value={money(Math.round(avg))} />
                </Card>
              </View>
              <Card style={styles.card}>
                <Text style={styles.section}>Circles by status</Text>
                {circles.length === 0 ? (
                  <Text style={styles.hint}>Create a circle to start seeing breakdowns.</Text>
                ) : (
                  Object.entries(byStatus).map(([status, count]) => (
                    <View key={status} style={styles.barRow}>
                      <Text style={styles.barLabel}>{status.replace(/_/g, ' ')}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.max(8, Math.round((count / circles.length) * 100))}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barCount}>{count}</Text>
                    </View>
                  ))
                )}
                <Text style={styles.hint}>{totalCircles} circles tracked</Text>
              </Card>
              <Text style={styles.sectionHead}>Your circles</Text>
            </>
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.hint}>Nothing to chart yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.circleCard}>
              <View style={styles.circleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.circleName}>{item.name}</Text>
                  <Text style={styles.circleMeta}>
                    {item.frequency} · cycle {item.current_cycle || 0}
                  </Text>
                </View>
                <Text style={styles.circleAmt}>
                  {money(Number(item.contribution_amount || 0), item.currency)}
                </Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metric: {
    width: '48%',
    minWidth: 140,
    flexGrow: 1,
    marginBottom: 0,
  },
  card: {
    marginBottom: 0,
  },
  section: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
    marginBottom: spacing.sm,
  },
  sectionHead: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 18,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  barLabel: {
    width: 90,
    fontSize: typography.caption,
    color: colors.forest,
    textTransform: 'capitalize',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  barCount: {
    width: 24,
    textAlign: 'right',
    fontSize: typography.caption,
    fontWeight: '600',
    color: colors.forest,
  },
  circleCard: {
    marginBottom: 0,
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circleName: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.forest,
  },
  circleMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  circleAmt: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: colors.forest,
  },
});

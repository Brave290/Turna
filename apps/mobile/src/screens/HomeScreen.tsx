import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge, Stat } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

type CircleRow = {
  id: string;
  name: string;
  status: string;
  contribution_amount: number;
  currency: string;
  frequency: string;
  description?: string | null;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

function formatMoney(n: number, currency = 'NGN') {
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

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export function HomeScreen() {
  const { displayName, signOut, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circles, setCircles] = useState<CircleRow[]>([]);
  const [memberships, setMemberships] = useState<CircleRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [cRes, mRes, nRes] = await Promise.all([
        supabase
          .from('circles')
          .select('id, name, status, contribution_amount, currency, frequency, description')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('circle_members')
          .select(
            'circle_id, circles(id, name, status, contribution_amount, currency, frequency, description)'
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(50),
        supabase
          .from('notifications')
          .select('id, title, body, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      setCircles((cRes.data ?? []) as CircleRow[]);
      const m = (mRes.data ?? []) as unknown as { circles: CircleRow | null }[];
      setMemberships(m.map((x) => x.circles).filter(Boolean) as CircleRow[]);
      setNotifications((nRes.data ?? []) as NotificationRow[]);
      if (cRes.error) setError(cRes.error.message);
    } catch {
      setError('Could not load dashboard. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const all = [...circles, ...memberships.filter((m) => !circles.find((c) => c.id === m.id))];
  const name = displayName || 'there';

  return (
    <Screen tone="cream">
      <ScrollView
        contentContainerStyle={styles.content}
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
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting(name.split(/\s+/)[0])}</Text>
            <Text style={styles.sub}>Here's your savings overview.</Text>
          </View>
          <Badge label={all.length ? `${all.length} circles` : 'New'} tone={all.length ? 'active' : 'muted'} />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {error && (
              <Card style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </Card>
            )}

            <Card style={styles.hero}>
              <Text style={styles.heroLabel}>YOUR CIRCLES</Text>
              <Text style={styles.heroValue}>{all.length}</Text>
              <View style={styles.statsRow}>
                <Stat label="Owned" value={String(circles.length)} />
                <View style={{ width: spacing.sm }} />
                <Stat label="Joined" value={String(memberships.length)} />
              </View>
            </Card>

            <Text style={section.title}>Recent circles</Text>
            {all.length === 0 ? (
              <Card>
                <Text style={styles.emptyTitle}>No circles yet</Text>
                <Text style={styles.emptyBody}>
                  Create a circle on the web, or open Circles tab after your first invite.
                </Text>
              </Card>
            ) : (
              all.slice(0, 6).map((c) => (
                <Card key={c.id} style={styles.circleCard}>
                  <View style={styles.circleRow}>
                    <View style={styles.circleMain}>
                      <Text style={styles.circleName}>{c.name}</Text>
                      <Text style={styles.circleMeta}>
                        {formatMoney(Number(c.contribution_amount || 0), c.currency)} / {c.frequency}
                      </Text>
                    </View>
                    <Badge
                      label={c.status}
                      tone={
                        c.status === 'active'
                          ? 'active'
                          : c.status === 'paused'
                            ? 'pending'
                            : 'muted'
                      }
                    />
                  </View>
                </Card>
              ))
            )}

            <Text style={section.title}>Notifications</Text>
            {notifications.length === 0 ? (
              <Card>
                <Text style={styles.emptyBody}>No notifications yet.</Text>
              </Card>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <Card key={n.id} style={styles.notifCard}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody} numberOfLines={2}>
                    {n.body}
                  </Text>
                </Card>
              ))
            )}

            <Text style={styles.signOut} onPress={() => void signOut()}>
              Sign out
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const section = StyleSheet.create({
  title: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  greeting: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.forest,
  },
  sub: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  hero: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroValue: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
  },
  circleCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  circleMain: {
    flex: 1,
    minWidth: 0,
  },
  circleName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  circleMeta: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  notifCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  notifTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  notifBody: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
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
  errorCard: {
    borderColor: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.caption,
  },
  signOut: {
    textAlign: 'center',
    color: colors.error,
    marginTop: spacing.xl,
    fontSize: typography.caption,
    fontWeight: '600',
    paddingVertical: spacing.md,
  },
});

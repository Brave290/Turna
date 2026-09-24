import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
  current_cycle?: string | null;
  member_count?: number | null;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

type WalletRow = {
  circle_id: string;
  paid_amount: number;
  expected_amount: number;
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

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export function HomeScreen({ onNavigate, onPush }: { onNavigate?: (tab: string) => void; onPush?: (screen: any) => void } = {}) {
  const { displayName, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circles, setCircles] = useState<CircleRow[]>([]);
  const [memberships, setMemberships] = useState<CircleRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [cRes, mRes, nRes, wRes] = await Promise.all([
        supabase
          .from('circles')
          .select('id, name, status, contribution_amount, currency, frequency, description, current_cycle, member_count')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('circle_members')
          .select(
            'circle_id, circles(id, name, status, contribution_amount, currency, frequency, description, current_cycle, member_count)'
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
        supabase
          .from('wallets' as never)
          .select('*' as never)
          .limit(100),
      ]);
      setCircles((cRes.data ?? []) as CircleRow[]);
      const m = (mRes.data ?? []) as unknown as { circles: CircleRow | null }[];
      setMemberships(m.map((x) => x.circles).filter(Boolean) as CircleRow[]);
      setNotifications((nRes.data ?? []) as NotificationRow[]);
      const w = (wRes.data ?? []) as unknown as WalletRow[] | null;
      setWallets(Array.isArray(w) ? w : []);
      if (cRes.error && cRes.error.code !== 'PGRST116') setError(cRes.error.message);
      if (wRes.error) {
        /* wallets optional — ignore missing table */
      }
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
  const firstName = name.split(/\s+/)[0];
  const hasCircles = all.length > 0;

  const totalPaid = wallets.reduce((s, w) => s + Number(w.paid_amount || 0), 0);
  const totalExpected = wallets.reduce((s, w) => s + Number(w.expected_amount || 0), 0);
  const settlePct =
    totalExpected > 0 ? Math.min(100, Math.round((totalPaid / totalExpected) * 100)) : 0;
  const pendingActions = notifications.filter((n) => n.status !== 'read').length;

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
        <View style={styles.greetBlock}>
          <Text style={styles.greeting}>{greeting(firstName)}</Text>
          <Text style={styles.sub}>Here's what's happening with your savings circles.</Text>
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

            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Total savings</Text>
              <Text style={styles.heroValue}>{formatMoney(totalPaid)}</Text>
              <View style={styles.heroFoot}>
                <View style={{ flex: 1 }}>
                  {hasCircles ? (
                    <Text style={styles.heroMint}>{settlePct}% settled this cycle</Text>
                  ) : (
                    <Text style={styles.heroDim}>Start your first savings circle</Text>
                  )}
                  <Text style={styles.heroTiny}>Confirmed contributions</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.heroTiny}>Expected</Text>
                  <Text style={styles.heroExpected}>{formatMoney(totalExpected)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onNavigate?.('circles')}>
                <Text style={styles.btnPrimaryText}>Create a Circle</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => onNavigate?.('circles')}>
                <Text style={styles.btnOutlineText}>Join a Circle</Text>
              </Pressable>
            </View>

            {hasCircles && (
              <View style={styles.statGrid}>
                <Card style={styles.statCard}>
                  <Stat label="My Circles" value={String(all.filter((c) => c.status === 'active').length)} />
                </Card>
                <Card style={styles.statCard}>
                  <Stat label="This Cycle" value={formatMoney(totalPaid)} />
                </Card>
                <Card style={styles.statCard}>
                  <Stat label="Total Payouts" value={formatMoney(totalPaid)} />
                </Card>
                <Card style={styles.statCard}>
                  <Stat label="Pending Actions" value={String(pendingActions)} />
                </Card>
              </View>
            )}

            {!hasCircles && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Your savings circles</Text>
                <Text style={styles.emptyBody}>
                  You haven't joined a savings circle yet. Start a circle with your friends,
                  family, colleagues or community.
                </Text>
                <View style={[styles.actions, { marginTop: spacing.lg }]}>
                  <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onNavigate?.('circles')}>
                    <Text style={styles.btnPrimaryText}>Create a Circle</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => onNavigate?.('circles')}>
                    <Text style={styles.btnOutlineText}>Join a Circle</Text>
                  </Pressable>
                </View>
              </Card>
            )}

            {hasCircles && (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>My Circles</Text>
                  <Text style={styles.viewAll} onPress={() => onNavigate?.('circles')}>
                    View all ›
                  </Text>
                </View>
                {all.slice(0, 4).map((c) => (
                  <Card key={c.id} style={styles.circleCard}>
                    <Pressable onPress={() => onNavigate?.('circles')}>
                      <View style={styles.circleRow}>
                        <View style={styles.circleMain}>
                          <Text style={styles.circleName}>{c.name}</Text>
                          <Text style={styles.circleMeta}>
                            {formatMoney(Number(c.contribution_amount || 0), c.currency)} /{' '}
                            {c.frequency}
                          </Text>
                        </View>
                        <Badge
                          label={c.status}
                          tone={
                            c.status === 'active' ? 'active' : c.status === 'paused' ? 'pending' : 'muted'
                          }
                        />
                      </View>
                      <Text style={styles.circleCycle}>
                        Cycle {c.current_cycle || 0}
                        {c.member_count != null ? ` · ${c.member_count} members` : ''}
                      </Text>
                    </Pressable>
                  </Card>
                ))}
              </>
            )}

<View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <Text style={styles.viewAll} onPress={() => onPush?.({ name: 'notifications' })}>
                    View all ›
                  </Text>
                </View>
            {notifications.length === 0 ? (
              <Card>
                <Text style={styles.emptyBody}>No recent activity yet.</Text>
              </Card>
            ) : (
              notifications.slice(0, 6).map((n) => (
                <Card key={n.id} style={styles.notifCard}>
                  <View style={styles.notifRow}>
                    <View style={styles.notifMain}>
                      <Text style={styles.notifTitle}>{n.title}</Text>
                      <Text style={styles.notifBody} numberOfLines={1}>
                        {n.body}
                      </Text>
                    </View>
                    <Text style={styles.notifWhen}>{formatRelative(n.created_at)}</Text>
                  </View>
                </Card>
              ))
            )}

            <View style={styles.strip}>
              <Pressable style={[styles.stripItem, styles.stripCard]} onPress={() => onPush?.({ name: 'insights' })}>
                <Text style={styles.stripLabel}>Insights</Text>
              </Pressable>
              <Pressable style={[styles.stripItem, styles.stripCard]} onPress={() => onPush?.({ name: 'payments' })}>
                <Text style={styles.stripLabel}>Payments</Text>
              </Pressable>
              <Pressable style={[styles.stripItem, styles.stripCard]} onPress={() => onNavigate?.('solo')}>
                <Text style={styles.stripLabel}>Solo Ledger</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  greetBlock: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.forest,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  hero: {
    backgroundColor: colors.forest,
    borderRadius: 20,
    padding: spacing.lg + 4,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  heroValue: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: -0.6,
  },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  heroMint: {
    color: colors.primaryLight,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  heroDim: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: typography.caption,
  },
  heroTiny: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 4,
  },
  heroExpected: {
    color: colors.white,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  btn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radiusLg(),
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    width: '48%',
    marginBottom: 0,
    flexGrow: 1,
    minWidth: 140,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
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
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  viewAll: {
    fontSize: typography.caption,
    color: colors.primary,
    fontWeight: '500',
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
    fontWeight: '500',
    color: colors.forest,
  },
  circleMeta: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  circleCycle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  notifCard: {
    marginBottom: 0,
    paddingVertical: spacing.md,
    borderRadius: 0,
    borderBottomWidth: 0,
  },
  notifRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  notifMain: {
    flex: 1,
    minWidth: 0,
  },
  notifTitle: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.forest,
  },
  notifBody: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  notifWhen: {
    fontSize: 11,
    color: colors.muted,
  },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stripItem: {
    flex: 1,
  },
  stripCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
  },
  stripLabel: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.forest,
  },
  errorCard: {
    borderColor: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.caption,
  },
});

function radiusLg() {
  return 16;
}

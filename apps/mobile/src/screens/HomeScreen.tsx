import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ChevronRight,
  HandCoins,
  Home as HomeIcon,
  Moon,
  PiggyBank,
  Sun,
  Clock,
  FileText,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cacheGet, cacheSet, drainQueue } from '../lib/offline';
import { useFastRefresh } from '../lib/useFastRefresh';
import { useConnectivity } from '../lib/connectivity';
import { Card, Badge, Stat } from '../components/Card';
import { Screen } from '../components/Screen';
import { OfflineScreen } from '../components/OfflineScreen';
import { StaggerItem } from '../components/Stagger';
import { SyncedLine } from '../components/SyncedLine';
import { Enter } from '../components/Enter';
import { colors, spacing, typography, type Palette } from '../theme';
import { formatCurrency, formatRelativeTime } from '../lib/format';
import { useMotion } from '../context/MotionContext';
import { usePaletteStyles, useTheme } from '../context/ThemeContext';

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
  owner_id?: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

type MembershipRow = {
  id: string;
  circle_id: string;
  payout_position?: number | null;
  circles: CircleRow | null;
};

type WalletRow = {
  circle_id: string;
  paid_amount: number;
  expected_amount: number;
};

type ContributionRow = {
  id: string;
  status: string;
  reported_amount?: number | null;
  expected_amount?: number | null;
  member_id: string;
};

type PayoutRow = {
  id: string;
  status: string;
};

/**
 * "Continue with saved data" is remembered per offline session so the
 * interstitial does not reappear every time the screen is reopened offline.
 */
let offlineSavedChosen = false;

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function toneFor(status: string): 'active' | 'pending' | 'muted' {
  if (status === 'active') return 'active';
  if (status === 'paused' || status === 'pending') return 'pending';
  return 'muted';
}

export function HomeScreen({
  onNavigate,
  onPush,
}: {
  onNavigate?: (tab: string) => void;
  onPush?: (screen: any) => void;
} = {}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { resolved, setMode } = useTheme();
  const { reduceMotion } = useMotion();
  const { displayName, user } = useAuth();
  const [loading, setLoading] = useState(!offlineSavedChosen);
  const [refreshing, setRefreshing] = useState(false);
  const [circles, setCircles] = useState<CircleRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [stats, setStats] = useState({
    pendingContributions: 0,
    pendingPayouts: 0,
    totalContributed: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [hasCache, setHasCache] = useState(false);
  const [offlineFailed, setOfflineFailed] = useState(false);
  const online = useConnectivity();
  // First read may hydrate from cache — only that read may drop the spinner.
  const booted = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    setOfflineFailed(false);
    const ck = 'home:' + user.id;
    type HomeCache = {
      circles: CircleRow[];
      memberships: MembershipRow[];
      notifications: NotificationRow[];
      wallets: WalletRow[];
      stats: {
        pendingContributions: number;
        pendingPayouts: number;
        totalContributed: number;
      };
    };
    const cached = await cacheGet<HomeCache>(ck);
    if (cached) {
      setCircles(cached.circles);
      setMemberships(cached.memberships);
      setNotifications(cached.notifications);
      setWallets(cached.wallets);
      setStats(cached.stats);
      // Saved data renders instantly — the spinner is for first-time loads only.
      setHasCache(true);
      if (!booted.current) setLoading(false);
    }
    try {
      const [cRes, mRes, nRes, wRes] = await Promise.all([
        supabase
          .from('circles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('circle_members')
          .select('*, circles(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(50),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('wallet_balances' as never)
          .select(
            'circle_id, paid_amount, expected_amount, circles(name, currency)' as never
          )
          .eq('user_id' as never, user.id as never)
          .limit(50),
      ]);

      const circleList = (cRes.data ?? []) as CircleRow[];
      const memberList = (mRes.data ?? []) as unknown as MembershipRow[];
      const notificationList = (nRes.data ?? []) as NotificationRow[];
      const w = wRes.data as unknown as WalletRow[] | null;
      const walletList = Array.isArray(w) ? w : [];
      setCircles(circleList);
      setMemberships(memberList);
      setNotifications(notificationList);
      setWallets(walletList);
      if (cRes.error && cRes.error.code !== 'PGRST116') {
        setError(cRes.error.message);
      }

      // Stats — same queries/semantics as web getDashboardData()
      let nextStats: HomeCache['stats'];
      if (circleList.length > 0) {
        const ids = circleList.map((c) => c.id);
        const myMemberIds = new Set(memberList.map((m) => m.id));
        const [contribRes, payoutRes] = await Promise.all([
          supabase
            .from('contributions')
            .select(
              'id, status, reported_amount, expected_amount, cycle_id, member_id, contribution_cycles!inner(circle_id)'
            )
            .in('contribution_cycles.circle_id', ids)
            .limit(200),
          supabase
            .from('payouts')
            .select('id, status, expected_amount, actual_amount, cycle_id, contribution_cycles!inner(circle_id)')
            .in('contribution_cycles.circle_id', ids)
            .limit(200),
        ]);
        const contributions = (contribRes.data ?? []) as unknown as ContributionRow[];
        const payouts = (payoutRes.data ?? []) as PayoutRow[];
        nextStats = {
          pendingContributions: contributions.filter(
            (c) =>
              myMemberIds.has(c.member_id) &&
              (c.status === 'pending' || c.status === 'reported')
          ).length,
          pendingPayouts: payouts.filter(
            (p) =>
              p.status === 'pending' ||
              p.status === 'initiated' ||
              p.status === 'sent'
          ).length,
          totalContributed: contributions
            .filter((c) => c.status === 'confirmed' && myMemberIds.has(c.member_id))
            .reduce(
              (sum, c) => sum + Number(c.reported_amount ?? c.expected_amount ?? 0),
              0
            ),
        };
      } else {
        nextStats = { pendingContributions: 0, pendingPayouts: 0, totalContributed: 0 };
      }
      setStats(nextStats);
      void cacheSet(ck, {
        circles: circleList,
        memberships: memberList,
        notifications: notificationList,
        wallets: walletList,
        stats: nextStats,
      });
      void drainQueue();
    } catch {
      if (!cached) setError('Could not load dashboard. Pull to retry.');
      else setOfflineFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Back online → the next outage offers the offline screen again.
  useEffect(() => {
    if (online) offlineSavedChosen = false;
  }, [online]);

  // Keep the dashboard fresh: app foreground, screen focus, every 30s, and
  // whenever connectivity returns (never while a manual refresh is running).
  useFastRefresh(load, { busy: refreshing });

  const retry = () => {
    setLoading(true);
    void load();
  };
  // Offline while loading (or after a failed refresh) → the rich offline
  // screen instead of a bare spinner; cached data is offered via Continue.
  const showOffline =
    !online && (loading || Boolean(error) || offlineFailed);

  const all = [
    ...circles,
    ...memberships
      .map((m) => m.circles)
      .filter((c): c is CircleRow => !!c && !circles.find((x) => x.id === c.id)),
  ];
  const name = displayName || 'there';
  const firstName = name.split(/\s+/)[0];
  const hasCircles = all.length > 0;

  const totalPaid = wallets.reduce((s, w) => s + Number(w.paid_amount || 0), 0);
  const totalExpected = wallets.reduce(
    (s, w) => s + Number(w.expected_amount || 0),
    0
  );
  const settlePct =
    totalExpected > 0
      ? Math.min(100, Math.round((totalPaid / totalExpected) * 100))
      : 0;
  const pendingActions = stats.pendingContributions + stats.pendingPayouts;
  const dueHint =
    stats.pendingContributions > 0
      ? `You have ${stats.pendingContributions} contribution${
          stats.pendingContributions === 1 ? '' : 's'
        } awaiting action.`
      : null;

  const recentActivity = notifications.slice(0, 6);
  const recentCircles = all.slice(0, 4);
  const unread = notifications.filter((n) => n.status !== 'read').length;

  if (showOffline) {
    return (
      <Screen tone="cream">
        <OfflineScreen
          onRetry={retry}
          onContinue={hasCache ? () => { offlineSavedChosen = true; } : undefined}
        />
      </Screen>
    );
  }

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
            tintColor={p.primary}
          />
        }
      >
        <Enter delay={0}>
          <View style={styles.greetRow}>
            <View style={styles.greetBlock}>
              <Text style={styles.greeting}>{greeting(firstName)}</Text>
              <Text style={styles.sub}>
                Here's what's happening with your savings circles.
              </Text>
              <SyncedLine cacheKey={user ? `home:${user.id}` : null} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                unread > 0
                  ? `Notifications, ${unread} unread`
                  : 'Notifications, none unread'
              }
              onPress={() => onPush?.({ name: 'notifications' })}
              style={({ pressed }) => [
                styles.bellBtn,
                pressed && styles.bellBtnPressed,
              ]}
            >
              <Bell size={21} color={p.text} strokeWidth={2} />
              {unread > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unread > 9 ? '9+' : String(unread)}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
              }
              onPress={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
              style={({ pressed }) => [styles.bellBtn, pressed && styles.bellBtnPressed]}
            >
              {resolved === 'dark' ? (
                <Sun size={20} color={p.text} strokeWidth={2} />
              ) : (
                <Moon size={20} color={p.text} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </Enter>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={p.primary} size="large" />
          </View>
        ) : (
          <>
            {error && (
              <Card style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </Card>
            )}

            <Enter delay={80}>
              <View style={styles.hero}>
                <Text style={styles.heroLabel}>Total savings</Text>
                <Text style={styles.heroValue}>{formatCurrency(totalPaid)}</Text>
                <View style={styles.heroFoot}>
                  <View style={{ flex: 1 }}>
                    {hasCircles ? (
                      <Text style={styles.heroMint}>
                        {settlePct}% settled this cycle
                      </Text>
                    ) : (
                      <Text style={styles.heroDim}>
                        Start your first savings circle
                      </Text>
                    )}
                    <Text style={styles.heroTiny}>Confirmed contributions</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.heroTiny}>Expected</Text>
                    <Text style={styles.heroExpected}>
                      {formatCurrency(totalExpected)}
                    </Text>
                  </View>
                </View>
              </View>
            </Enter>

            <Enter delay={160}>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() => onPush?.({ name: 'new-circle' })}
                >
                  <Text style={styles.btnPrimaryText}>Create a Circle</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnOutline]}
                  onPress={() => onPush?.({ name: 'join-circle' })}
                >
                  <Text style={styles.btnOutlineText}>Join a Circle</Text>
                </Pressable>
              </View>
            </Enter>

            {hasCircles && (
              <Enter delay={240}>
                <View style={styles.statGrid}>
                  <Card style={styles.statCard}>
                    <Stat
                      icon={Users}
                      label="My Circles"
                      value={String(all.filter((c) => c.status === 'active').length)}
                      sub="Active circles"
                    />
                  </Card>
                  <Card style={styles.statCard}>
                    <Stat
                      icon={PiggyBank}
                      label="This Cycle"
                      value={formatCurrency(stats.totalContributed)}
                      sub="Total contributed"
                    />
                  </Card>
                  <Card style={styles.statCard}>
                    <Stat
                      icon={ArrowLeftRight}
                      label="Total Payouts"
                      value={formatCurrency(totalPaid)}
                      sub="Received"
                    />
                  </Card>
                  <Card style={styles.statCard}>
                    <Stat
                      icon={Bell}
                      label="Pending Actions"
                      value={String(pendingActions)}
                      sub={pendingActions > 0 ? 'Needs attention' : 'All clear'}
                    />
                  </Card>
                </View>
              </Enter>
            )}

            {!hasCircles && (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <HomeIcon size={24} color={p.primary} strokeWidth={2} />
                </View>
                <Text style={styles.emptyTitle}>Your savings circles</Text>
                <Text style={styles.emptyBody}>
                  You haven't joined a savings circle yet. Start a circle with your
                  friends, family, colleagues or community.
                </Text>
                <View style={[styles.actions, { marginTop: spacing.lg }]}>
                  <Pressable
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={() => onPush?.({ name: 'new-circle' })}
                  >
                    <Text style={styles.btnPrimaryText}>Create a Circle</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.btnOutline]}
                    onPress={() => onPush?.({ name: 'join-circle' })}
                  >
                    <Text style={styles.btnOutlineText}>Join a Circle</Text>
                  </Pressable>
                </View>
              </Card>
            )}

            {dueHint && (
              <Pressable
                style={styles.dueCard}
                onPress={() => onPush?.({ name: 'contributions' })}
              >
                <View style={styles.dueIcon}>
                  <CalendarDays size={18} color={p.warning} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.dueTitle}>You have contributions waiting</Text>
                  <Text style={styles.dueBody}>{dueHint}</Text>
                </View>
                <ChevronRight size={16} color={p.textMuted} strokeWidth={2} />
              </Pressable>
            )}

            {hasCircles && (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>My Circles</Text>
                  <Text
                    style={styles.viewAll}
                    onPress={() => onNavigate?.('circles')}
                  >
                    View all ›
                  </Text>
                </View>
                {recentCircles.map((c, i) => {
                  const wallet = wallets.find((w) => w.circle_id === c.id);
                  const paid = Number(wallet?.paid_amount || 0);
                  const expected = Number(wallet?.expected_amount || 0);
                  const progress =
                    expected > 0
                      ? Math.min(100, Math.round((paid / expected) * 100))
                      : 0;
                  const membership = memberships.find(
                    (m) => m.circle_id === c.id
                  );
                  return (
                    <StaggerItem key={c.id} index={i}>
                      <Card style={styles.circleCard}>
                        <Pressable
                          onPress={() =>
                            onPush?.({ name: 'circle-detail', circleId: c.id })
                          }
                          style={({ pressed }) =>
                            pressed && !reduceMotion ? styles.rowPressed : undefined
                          }
                        >
                          <View style={styles.circleRow}>
                            <View style={styles.circleMain}>
                              <Text style={styles.circleName}>{c.name}</Text>
                              <Text style={styles.circleMeta}>
                                {formatCurrency(
                                  Number(c.contribution_amount || 0),
                                  c.currency
                                )}{' '}
                                / {c.frequency}
                              </Text>
                            </View>
                            <Badge label={c.status} tone={toneFor(c.status)} />
                          </View>
                          <View style={styles.circleMetaRow}>
                            {c.member_count != null && (
                              <View style={styles.metaItem}>
                                <Users size={14} color={p.textMuted} strokeWidth={1.75} />
                                <Text style={styles.metaText}>
                                  {c.member_count} members
                                </Text>
                              </View>
                            )}
                            {membership?.payout_position != null && (
                              <View style={styles.metaItem}>
                                <Clock size={14} color={p.textMuted} strokeWidth={1.75} />
                                <Text style={styles.metaText}>
                                  Position {membership.payout_position}
                                </Text>
                              </View>
                            )}
                            <View style={styles.metaItem}>
                              <FileText size={14} color={p.textMuted} strokeWidth={1.75} />
                              <Text style={styles.metaText}>
                                Cycle {c.current_cycle || 0}
                              </Text>
                            </View>
                          </View>
                          {expected > 0 && (
                            <View style={{ marginTop: spacing.sm }}>
                              <View style={styles.progressTrack}>
                                <View
                                  style={[
                                    styles.progressFill,
                                    { width: `${progress}%` },
                                  ]}
                                />
                              </View>
                              <Text style={styles.progressLabel}>
                                {formatCurrency(paid, c.currency)} of{' '}
                                {formatCurrency(expected, c.currency)} settled
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      </Card>
                    </StaggerItem>
                  );
                })}
              </>
            )}

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Text
                style={styles.viewAll}
                onPress={() => onPush?.({ name: 'notifications' })}
              >
                View all ›
              </Text>
            </View>
            <Card style={styles.activityCard}>
              {recentActivity.length === 0 ? (
                <View style={styles.activityEmpty}>
                  <ArrowUpRight size={26} color={p.textMuted} strokeWidth={1.75} />
                  <Text style={styles.emptyBody}>No recent activity yet.</Text>
                </View>
              ) : (
                recentActivity.map((n, i) => (
                  <StaggerItem
                    key={n.id}
                    index={i}
                    style={[styles.activityRow, i > 0 && styles.activityRowBorder]}
                  >
                    <View style={styles.activityIcon}>
                      <ArrowUpRight
                        size={16}
                        color={p.primary}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.activityMain}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={styles.activityBody} numberOfLines={1}>
                        {n.body}
                      </Text>
                    </View>
                    <Text style={styles.activityWhen}>
                      {formatRelativeTime(n.created_at)}
                    </Text>
                  </StaggerItem>
                ))
              )}
            </Card>

            <View style={styles.strip}>
              <Pressable
                style={({ pressed }) => [
                  styles.stripCard,
                  pressed && !reduceMotion && styles.stripPressed,
                ]}
                onPress={() => onNavigate?.('ledger')}
              >
                <FileText
                  size={18}
                  color={p.primary}
                  strokeWidth={2}
                  style={{ marginBottom: spacing.sm }}
                />
                <Text style={styles.stripLabel}>Open ledger</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.stripCard,
                  pressed && !reduceMotion && styles.stripPressed,
                ]}
                onPress={() => onPush?.({ name: 'debts' })}
              >
                <HandCoins
                  size={18}
                  color={p.primary}
                  strokeWidth={2}
                  style={{ marginBottom: spacing.sm }}
                />
                <Text style={styles.stripLabel}>Debts</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.stripCard,
                  pressed && !reduceMotion && styles.stripPressed,
                ]}
                onPress={() => onPush?.({ name: 'insights' })}
              >
                <TrendingUp
                  size={18}
                  color={p.primary}
                  strokeWidth={2}
                  style={{ marginBottom: spacing.sm }}
                />
                <Text style={styles.stripLabel}>Insights</Text>
              </Pressable>
            </View>

            {hasCircles && totalPaid === 0 && (
              <Text style={styles.tip}>
                Start contributing to build your total savings.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  greetBlock: {
    flex: 1,
    minWidth: 0,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bellBtnPressed: {
    backgroundColor: p.bg,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: p.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  greeting: {
    fontSize: typography.title,
    fontWeight: '600',
    color: p.text,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: p.textMuted,
    marginTop: 4,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  hero: {
    backgroundColor: p.brand,
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
    color: p.primary,
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnPrimary: {
    backgroundColor: p.primarySolid,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '600',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: p.primary,
  },
  btnOutlineText: {
    color: p.primary,
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
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.heading,
    fontWeight: '600',
    color: p.text,
  },
  emptyBody: {
    fontSize: typography.body,
    color: p.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  dueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(138,90,0,0.4)',
    backgroundColor: 'rgba(138,90,0,0.10)',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  dueIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(138,90,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueTitle: {
    fontSize: typography.body,
    fontWeight: '500',
    color: p.text,
  },
  dueBody: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
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
    color: p.text,
  },
  viewAll: {
    fontSize: typography.caption,
    color: p.primary,
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
    marginBottom: spacing.sm,
  },
  circleMain: {
    flex: 1,
    minWidth: 0,
  },
  circleName: {
    fontSize: typography.body,
    fontWeight: '500',
    color: p.text,
  },
  circleMeta: {
    fontSize: typography.caption,
    color: p.textMuted,
    marginTop: 2,
  },
  circleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: p.textMuted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: p.primarySolid,
  },
  progressLabel: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 6,
  },
  activityCard: {
    padding: 0,
    overflow: 'hidden',
  },
  activityEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  activityRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(208,219,232,0.7)',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  activityMain: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    fontSize: typography.body,
    fontWeight: '500',
    color: p.text,
  },
  activityBody: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
  },
  activityWhen: {
    fontSize: 11,
    color: p.textMuted,
  },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stripCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 18,
    backgroundColor: p.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  stripLabel: {
    fontSize: typography.body,
    fontWeight: '500',
    color: p.text,
  },
  stripPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  tip: {
    fontSize: 12,
    color: p.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  errorCard: {
    borderColor: p.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: p.error,
    fontSize: typography.caption,
  },
});

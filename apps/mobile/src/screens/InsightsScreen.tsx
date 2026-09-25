import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BarChart3,
  CalendarClock,
  Percent,
  PiggyBank,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { formatCurrency, formatDate } from '../lib/format';

type Circle = {
  id: string;
  name: string;
  status: string;
  owner_id: string;
  contribution_amount: number;
  currency: string;
  frequency: string;
  current_cycle?: number | null;
};

type NextPayout = {
  circleName: string;
  circleId: string;
  dueDate: string;
  cycleNumber: number;
  amount: number;
  currency: string;
};

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricHead}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={styles.metricIcon}>
          <Icon size={16} color={colors.primary} strokeWidth={2} />
        </View>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

export function InsightsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [owned, setOwned] = useState<Circle[]>([]);
  const [memberships, setMemberships] = useState<
    { id: string; circle_id: string }[]
  >([]);
  const [totalContributed, setTotalContributed] = useState(0);
  const [onTime, setOnTime] = useState<{
    pct: number | null;
    onTimeCount: number;
    lateCount: number;
  }>({ pct: null, onTimeCount: 0, lateCount: 0 });
  const [nextPayout, setNextPayout] = useState<NextPayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [circlesRes, membersRes] = await Promise.all([
        supabase
          .from('circles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('circle_members')
          .select('id, circle_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(50),
      ]);

      const all = (circlesRes.data ?? []) as Circle[];
      const memb = (membersRes.data ?? []) as { id: string; circle_id: string }[];
      setCircles(all);
      setMemberships(memb);
      setOwned(all.filter((c) => c.owner_id === user.id));

      const circleIds = all.map((c) => c.id);
      const myMemberIds = new Set(memb.map((m) => m.id));

      if (circleIds.length === 0) {
        setTotalContributed(0);
        setOnTime({ pct: null, onTimeCount: 0, lateCount: 0 });
        setNextPayout(null);
        return;
      }

      const [contribRes, contribTimeRes, cyclesRes] = await Promise.all([
        supabase
          .from('contributions')
          .select(
            'id, status, reported_amount, expected_amount, cycle_id, member_id, contribution_cycles!inner(circle_id)'
          )
          .in('contribution_cycles.circle_id', circleIds)
          .limit(200),
        supabase
          .from('contributions')
          .select(
            `id, member_id, status, reported_at, confirmed_at, created_at,
             contribution_cycles!inner(circle_id, due_date, cycle_number, payout_member_id)`
          )
          .in('contribution_cycles.circle_id', circleIds)
          .in('status', ['confirmed', 'reported'])
          .limit(300),
        supabase
          .from('contribution_cycles')
          .select(
            `id, cycle_number, due_date, status, expected_amount, payout_member_id,
             circle_id, circles!inner(id, name, currency, owner_id)`
          )
          .in('circle_id', circleIds)
          .in('status', ['collecting', 'payout_pending', 'pending'])
          .order('due_date', { ascending: true })
          .limit(50),
      ]);

      const contribs = (contribRes.data ?? []) as unknown as {
        member_id: string;
        status: string;
        reported_amount?: number | null;
        expected_amount?: number | null;
        contribution_cycles?: { circle_id: string } | null;
      }[];

      setTotalContributed(
        contribs
          .filter((c) => c.status === 'confirmed' && myMemberIds.has(c.member_id))
          .reduce(
            (sum, c) => sum + (c.reported_amount ?? c.expected_amount ?? 0),
            0
          )
      );

      let onTimeCount = 0;
      let lateCount = 0;
      for (const c of (contribTimeRes.data ?? []) as unknown as {
        member_id: string;
        reported_at?: string | null;
        confirmed_at?: string | null;
        created_at: string;
        contribution_cycles?: {
          circle_id: string;
          due_date?: string | null;
          payout_member_id?: string | null;
        } | null;
      }[]) {
        if (!myMemberIds.has(c.member_id)) continue;
        const due = c.contribution_cycles?.due_date;
        if (!due) continue;
        const paidAt = c.confirmed_at ?? c.reported_at ?? c.created_at;
        const paidDay = paidAt.slice(0, 10);
        if (paidDay <= due.slice(0, 10)) onTimeCount += 1;
        else lateCount += 1;
      }
      const total = onTimeCount + lateCount;
      setOnTime({
        pct: total > 0 ? Math.round((onTimeCount / total) * 100) : null,
        onTimeCount,
        lateCount,
      });

      let found: NextPayout | null = null;
      for (const cy of (cyclesRes.data ?? []) as unknown as {
        cycle_number: number;
        due_date?: string | null;
        status: string;
        expected_amount: number;
        payout_member_id?: string | null;
        circle_id: string;
        circles:
          | { id: string; name: string; currency: string }
          | { id: string; name: string; currency: string }[]
          | null;
      }[]) {
        const circle = Array.isArray(cy.circles) ? cy.circles[0] : cy.circles;
        if (!circle) continue;
        if (!cy.payout_member_id) continue;
        const { data: meMember } = await supabase
          .from('circle_members')
          .select('id')
          .eq('circle_id', cy.circle_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!meMember || meMember.id !== cy.payout_member_id) continue;
        found = {
          circleName: circle.name,
          circleId: circle.id,
          dueDate: cy.due_date ?? '',
          cycleNumber: cy.cycle_number,
          amount: Number(cy.expected_amount),
          currency: circle.currency,
        };
        break;
      }
      setNextPayout(found);
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
      ? circles.reduce((s, c) => s + Number(c.contribution_amount || 0), 0) /
        circles.length
      : 0;

  const activeCircles = circles.filter((c) => c.status === 'active');
  const memberCount = memberships.length + owned.length;

  if (loading) {
    return (
      <Screen tone="cream">
        <View style={styles.header}>
          {onBack && (
            <Button
              label="← Back"
              variant="ghost"
              onPress={onBack}
              style={styles.backBtn}
            />
          )}
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.sub}>
            Real numbers from your circles — not demo stats.
          </Text>
        </View>
        <Text style={styles.loading}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen tone="cream">
      <ScrollView
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
      >
        <View style={styles.header}>
          {onBack && (
            <Button
              label="← Back"
              variant="ghost"
              onPress={onBack}
              style={styles.backBtn}
            />
          )}
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.sub}>
            Real numbers from your circles — not demo stats.
          </Text>
        </View>

        <View style={styles.grid4}>
          <Metric
            icon={Users}
            label="Active circles"
            value={String(activeCircles.length)}
            sub={`${circles.length} total`}
          />
          <Metric
            icon={TrendingUp}
            label="Owned by you"
            value={String(owned.length)}
            sub={`${memberships.length} memberships`}
          />
          <Metric
            icon={PiggyBank}
            label="Confirmed contributed"
            value={formatCurrency(totalContributed)}
            sub="Across confirmed contributions"
          />
          <Metric
            icon={BarChart3}
            label="Avg contribution"
            value={formatCurrency(Math.round(avg))}
            sub="Mean circle amount"
          />
        </View>

        <View style={styles.grid2}>
          <Metric
            icon={Percent}
            label="On-time rate"
            value={onTime.pct != null ? `${onTime.pct}%` : '—'}
            sub={
              onTime.pct != null
                ? `${onTime.onTimeCount} on time · ${onTime.lateCount} late`
                : 'No confirmed contributions yet'
            }
          />
          <Metric
            icon={CalendarClock}
            label="Next payout to you"
            value={
              nextPayout
                ? nextPayout.dueDate
                  ? formatDate(nextPayout.dueDate)
                  : `Cycle ${nextPayout.cycleNumber}`
                : '—'
            }
            sub={
              nextPayout
                ? `${nextPayout.circleName} · ${formatCurrency(nextPayout.amount, nextPayout.currency)} pot share base`
                : 'You are not queued for the next pot'
            }
          />
        </View>

        <Card style={styles.card}>
          <Text style={styles.section}>Circles by status</Text>
          {circles.length === 0 ? (
            <Text style={styles.hint}>
              Create a circle to start seeing breakdowns.
            </Text>
          ) : (
            <View style={styles.bars}>
              {Object.entries(byStatus).map(([status, count]) => (
                <View key={status} style={styles.barRow}>
                  <Text style={styles.barLabel}>
                    {status.replace(/_/g, ' ')}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(
                            8,
                            Math.round((count / circles.length) * 100)
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.memberships}>
            {memberCount} active memberships tracked
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>Your circles</Text>
          {circles.length === 0 ? (
            <Text style={styles.hint}>Nothing to chart yet.</Text>
          ) : (
            <View>
              {circles.slice(0, 8).map((c, i) => (
                <View
                  key={c.id}
                  style={[
                    styles.circleRow,
                    i < Math.min(circles.length, 8) - 1 &&
                      styles.circleRowBorder,
                  ]}
                >
                  <View style={styles.circleInfo}>
                    <Text style={styles.circleName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.circleMeta}>
                      {c.frequency} · cycle {c.current_cycle || 0}
                    </Text>
                  </View>
                  <Text style={styles.circleAmt}>
                    {formatCurrency(
                      Number(c.contribution_amount || 0),
                      c.currency
                    )}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    gap: 4,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    marginLeft: -8,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.75,
  },
  sub: {
    fontSize: 16,
    color: colors.muted,
  },
  loading: {
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  grid4: {
    gap: spacing.md,
  },
  grid2: {
    gap: spacing.md,
  },
  metric: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.6,
  },
  metricSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  card: {
    marginBottom: 0,
  },
  section: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.forest,
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: colors.muted,
  },
  bars: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    width: 112,
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.forest,
  },
  memberships: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 12,
  },

  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  circleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  circleInfo: {
    flex: 1,
    minWidth: 0,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.forest,
  },
  circleMeta: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  circleAmt: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.forest,
  },
});

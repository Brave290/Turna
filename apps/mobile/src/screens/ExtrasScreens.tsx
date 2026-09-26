import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography, type Palette } from '../theme';
import { formatCurrency } from '../lib/format';
import { usePaletteStyles } from '../context/ThemeContext';

type Payout = {
  id: string;
  status: string;
  amount: number;
  actual: number | null;
  currency: string;
  created_at: string;
  circle_name: string;
};

function money(n: number, c = 'NGN') {
  return formatCurrency(n, c);
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG');
}

export function ContributionsScreen({
  onBack,
  onPush,
}: { onBack?: () => void; onPush?: (screen: any) => void } = {}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const [rows, setRows] = useState<
    {
      id: string;
      status: string;
      amount: number;
      currency: string;
      created_at: string;
      circle_name: string;
      circle_id: string;
      receipt_code: string | null;
      mine: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Same shape as web /dashboard/contributions: contributions joined to
      // cycle → circle, plus the caller's active memberships to flag "yours".
      const [contribRes, memberRes] = await Promise.all([
        supabase
          .from('contributions')
          .select(
            `id, status, reported_amount, expected_amount, receipt_code, created_at, member_id,
             contribution_cycles!inner(circle_id, circles(name, currency))`
          )
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('circle_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(200),
      ]);
      const myMemberIds = new Set(((memberRes.data ?? []) as { id: string }[]).map((m) => m.id));
      setRows(
        ((contribRes.data ?? []) as unknown as {
          id: string;
          status: string;
          reported_amount: number | null;
          expected_amount: number;
          receipt_code: string | null;
          created_at: string;
          member_id: string;
          contribution_cycles: {
            circle_id: string;
            circles: { name: string; currency: string } | null;
          } | null;
        }[]).map((c) => ({
          id: c.id,
          status: c.status,
          amount: c.reported_amount ?? c.expected_amount,
          currency: c.contribution_cycles?.circles?.currency ?? 'NGN',
          created_at: c.created_at,
          circle_name: c.contribution_cycles?.circles?.name ?? 'Circle',
          circle_id: c.contribution_cycles?.circle_id ?? '',
          receipt_code: c.receipt_code,
          mine: myMemberIds.has(c.member_id),
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

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const table = [
      ['timestamp', 'circle', 'status', 'amount', 'currency', 'receipt', 'yours'],
      ...rows.map((r) => [
        r.created_at,
        r.circle_name,
        r.status,
        String(r.amount / 100),
        r.currency,
        r.receipt_code ?? '',
        r.mine ? 'yes' : 'no',
      ]),
    ];
    const csv = table.map((row) => row.map(esc).join(',')).join('\n');
    void Share.share({
      message: csv,
      title: `turna-contributions-${new Date().toISOString().slice(0, 10)}.csv`,
    });
  };

  const shareReceipt = (row: { receipt_code: string | null; circle_name: string; amount: number; currency: string; created_at: string; status: string }) => {
    void Share.share({
      message: [
        'Turna contribution receipt',
        `Receipt: ${row.receipt_code ?? '—'}`,
        `Circle: ${row.circle_name}`,
        `Amount: ${money(row.amount, row.currency)}`,
        `Date: ${when(row.created_at)}`,
        `Status: ${row.status}`,
      ].join('\n'),
      title: `turna-${row.receipt_code ?? 'receipt'}`,
    });
  };

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <View style={styles.headRow}>
          {onBack && <Button label="← Back" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Contributions</Text>
            <Text style={styles.sub}>
              Report a payment from the circle page — the admin confirms it here.
            </Text>
          </View>
        </View>
        <View style={styles.linkRow}>
          {rows.length > 0 && (
            <Pressable onPress={exportCsv} style={styles.linkBtn}>
              <Text style={styles.linkText}>Export CSV</Text>
            </Pressable>
          )}
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
              tintColor={p.primary}
            />
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.empty}>No contributions yet.</Text>
              <Text style={styles.hint}>
                Contributions appear once a circle starts collecting.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.circle_name}
                    {item.mine && <Text style={styles.yours}> · yours</Text>}
                  </Text>
                  <Text style={styles.meta}>
                    {money(item.amount, item.currency)} · {when(item.created_at)}
                  </Text>
                  {item.receipt_code ? (
                    <Text style={styles.receipt}>Receipt {item.receipt_code}</Text>
                  ) : null}
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
              {(item.mine && (item.status === 'pending' || item.status === 'reported')) ||
              item.receipt_code ? (
                <View style={styles.actions}>
                  {item.mine && (item.status === 'pending' || item.status === 'reported') && (
                    <Button
                      label={item.status === 'reported' ? 'View report' : 'Report paid'}
                      variant="outline"
                      onPress={() => onPush?.({ name: 'circle-detail', circleId: item.circle_id })}
                      style={styles.actionBtn}
                    />
                  )}
                  {item.receipt_code && (
                    <Button
                      label="Share receipt"
                      variant="ghost"
                      onPress={() => shareReceipt(item)}
                      style={styles.actionBtn}
                    />
                  )}
                </View>
              ) : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

export function PayoutsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Web parity: payouts carry expected/actual amounts and reach the circle
      // through contribution_cycles (there is no payouts.circle_id column).
      const { data } = await supabase
        .from('payouts')
        .select(
          'id, status, expected_amount, actual_amount, created_at, contribution_cycles!inner(circle_id, circles(name, currency))'
        )
        .order('created_at', { ascending: false })
        .limit(100);
      setRows(
        ((data ?? []) as unknown as {
          id: string;
          status: string;
          expected_amount: number;
          actual_amount: number | null;
          created_at: string;
          contribution_cycles: {
            circles: { name: string; currency: string } | null;
          } | null;
        }[]).map((row) => ({
          id: row.id,
          status: row.status,
          amount: row.expected_amount,
          actual: row.actual_amount,
          currency: row.contribution_cycles?.circles?.currency ?? 'NGN',
          created_at: row.created_at,
          circle_name: row.contribution_cycles?.circles?.name ?? 'Circle',
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
            <Text style={styles.sub}>Rotating pot handoffs — expected and actual amounts.</Text>
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
              tintColor={p.primary}
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
                    {money(item.amount, item.currency)} · {when(item.created_at)}
                  </Text>
                  <Text style={styles.meta}>
                    Actual: {item.actual != null ? money(item.actual, item.currency) : '—'}
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

const makeStyles = (p: Palette) => StyleSheet.create({
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
  linkRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  linkBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.surface,
  },
  linkText: {
    fontSize: 12,
    color: p.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: p.text,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: p.textMuted,
    marginTop: 4,
  },
  loading: {
    color: p.textMuted,
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
    color: p.text,
  },
  yours: {
    fontWeight: '400',
    color: p.textMuted,
  },
  meta: {
    fontSize: typography.caption,
    color: p.textMuted,
  },
  receipt: {
    fontSize: typography.caption,
    color: p.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtn: {
    alignSelf: 'flex-start',
  },
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: p.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.caption,
    color: p.textMuted,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  empty: {
    color: p.textMuted,
    textAlign: 'center',
    fontSize: typography.body,
  },
});

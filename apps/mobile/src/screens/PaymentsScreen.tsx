import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CreditCard, Download } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge, type BadgeTone } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { formatCurrency, formatDate } from '../lib/format';

type Row = {
  id: string;
  reference: string;
  kind: string;
  amount: number;
  total: number;
  status: string;
  createdAt: string;
  circleId: string | null;
  circleName: string;
  currency: string;
  mine: boolean;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'muted',
  active: 'active',
  paused: 'pending',
  completed: 'completed',
  cancelled: 'error',
  pending: 'pending',
  collecting: 'active',
  reported: 'pending',
  confirmed: 'active',
  rejected: 'error',
  disputed: 'error',
  refunded: 'pending',
  initiated: 'pending',
  sent: 'pending',
  received: 'active',
  accepted: 'active',
  expired: 'error',
  left: 'completed',
  removed: 'error',
  read: 'completed',
  delivered: 'active',
  failed: 'error',
  payout_pending: 'pending',
  payout_initiated: 'pending',
  payout_confirmed: 'active',
};

function toneFor(status: string): BadgeTone {
  return STATUS_TONE[status] ?? 'completed';
}

function escapeCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_HEADERS = [
  'reference',
  'circle',
  'kind',
  'status',
  'amount',
  'total',
  'currency',
  'date',
];

export function PaymentsScreen({
  onBack,
  onPush,
}: { onBack?: () => void; onPush?: (screen: any) => void } = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const circlesRes = await supabase
        .from('circles')
        .select('id, name, currency')
        .order('created_at', { ascending: false })
        .limit(50);
      const circles = (circlesRes.data ?? []) as {
        id: string;
        name: string;
        currency: string;
      }[];
      const nameById = new Map(circles.map((c) => [c.id, c.name]));
      const currencyById = new Map(circles.map((c) => [c.id, c.currency]));
      const circleIds = circles.map((c) => c.id);

      const mapPayment = (p: {
        id: string;
        reference: string;
        kind: string;
        amount: number;
        total_amount: number;
        status: string;
        created_at: string;
        circle_id: string | null;
        user_id: string;
        currency: string;
      }): Row => ({
        id: p.id,
        reference: p.reference,
        kind: p.kind,
        amount: p.amount,
        total: p.total_amount,
        status: p.status,
        createdAt: p.created_at,
        circleId: p.circle_id,
        circleName: p.circle_id
          ? nameById.get(p.circle_id) ?? 'Circle'
          : '—',
        currency:
          p.currency ||
          (p.circle_id ? currencyById.get(p.circle_id) ?? 'NGN' : 'NGN'),
        mine: p.user_id === user.id,
      });

      const { data } = await supabase
        .from('payments')
        .select(
          'id, reference, kind, amount, total_amount, status, created_at, circle_id, user_id, currency'
        )
        .order('created_at', { ascending: false })
        .limit(100);

      const mapped = ((data ?? []) as unknown as Parameters<typeof mapPayment>[0][]).map(
        mapPayment
      );

      if (circleIds.length > 0) {
        const { data: owned } = await supabase
          .from('payments')
          .select(
            'id, reference, kind, amount, total_amount, status, created_at, circle_id, user_id, currency'
          )
          .in('circle_id', circleIds)
          .order('created_at', { ascending: false })
          .limit(100);

        const seen = new Set(mapped.map((r) => r.id));
        for (const p of (owned ?? []) as unknown as Parameters<
          typeof mapPayment
        >[0][]) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          mapped.push(mapPayment(p));
        }
      }

      setRows(mapped);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalIn = rows
    .filter((r) => r.status === 'success' && r.kind === 'contribution')
    .reduce((s, r) => s + r.amount, 0);

  function exportCsv() {
    const csv = [
      CSV_HEADERS.map(escapeCell).join(','),
      ...rows.map((r) =>
        [
          r.reference,
          r.circleName,
          r.kind,
          r.status,
          r.amount,
          r.total,
          r.currency,
          r.createdAt,
        ]
          .map(escapeCell)
          .join(',')
      ),
    ].join('\r\n');
    void Share.share({
      message: '\ufeff' + csv,
      title: `turna-payments-${new Date().toISOString().slice(0, 10)}.csv`,
    });
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
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.sub}>
            Paystack transactions for your circles — contributions and payouts.
          </Text>
          {rows.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={exportCsv}
              style={({ pressed }) => [styles.exportBtn, pressed && styles.exportPressed]}
            >
              <Download size={16} color={colors.forest} strokeWidth={2} />
              <Text style={styles.exportText}>Export CSV</Text>
            </Pressable>
          )}
        </View>

        <Card style={styles.card}>
          <Text style={styles.summaryLabel}>
            Confirmed contributions (all time)
          </Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalIn)}</Text>
        </Card>

        {loading ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : rows.length === 0 ? (
          <Card style={styles.emptyCard}>
            <CreditCard size={32} color={colors.muted} strokeWidth={2} />
            <Text style={styles.empty}>No payments yet.</Text>
          </Card>
        ) : (
          <Card style={styles.tableCard}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tableInner}
            >
              <View>
                <View style={styles.thead}>
                  <Text style={[styles.th, styles.cRef]}>Reference</Text>
                  <Text style={[styles.th, styles.cCircle]}>Circle</Text>
                  <Text style={[styles.th, styles.cKind]}>Kind</Text>
                  <Text style={[styles.th, styles.cDate]}>Date</Text>
                  <Text style={[styles.th, styles.cAmount]}>Amount</Text>
                  <Text style={[styles.th, styles.cFees]}>Fees</Text>
                  <Text style={[styles.th, styles.cStatus]}>Status</Text>
                </View>
                {rows.map((row, i) => (
                  <View
                    key={row.id}
                    style={[
                      styles.tr,
                      i < rows.length - 1 && styles.trBorder,
                    ]}
                  >
                    <View style={[styles.td, styles.cRef]}>
                      <Text style={styles.refText}>{row.reference}</Text>
                      {!row.mine && <Text style={styles.memberTag}>member</Text>}
                    </View>
                    <View style={[styles.td, styles.cCircle]}>
                      {row.circleId ? (
                        <Text
                          style={styles.circleLink}
                          onPress={() =>
                            onPush?.({
                              name: 'circle-detail',
                              circleId: row.circleId,
                            })
                          }
                        >
                          {row.circleName}
                        </Text>
                      ) : (
                        <Text style={styles.dash}>—</Text>
                      )}
                    </View>
                    <View style={[styles.td, styles.cKind]}>
                      <Text style={styles.kindText}>{row.kind}</Text>
                    </View>
                    <View style={[styles.td, styles.cDate]}>
                      <Text style={styles.dateText}>
                        {formatDate(row.createdAt)}
                      </Text>
                    </View>
                    <View style={[styles.td, styles.cAmount]}>
                      <Text style={styles.amountText}>
                        {formatCurrency(row.amount, row.currency)}
                      </Text>
                    </View>
                    <View style={[styles.td, styles.cFees]}>
                      <Text style={styles.dateText}>
                        {row.total > row.amount
                          ? formatCurrency(row.total - row.amount, row.currency)
                          : '—'}
                      </Text>
                    </View>
                    <View style={[styles.td, styles.cStatus]}>
                      <Badge
                        label={row.status.replace(/_/g, ' ')}
                        tone={toneFor(row.status)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
        )}
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  exportPressed: {
    backgroundColor: colors.cream,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.forest,
  },
  card: {
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  loading: {
    color: colors.muted,
  },
  emptyCard: {
    marginBottom: 0,
    paddingVertical: 56,
    alignItems: 'center',
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 12,
  },
  tableCard: {
    marginBottom: 0,
  },
  tableInner: {
    minWidth: '100%',
  },
  thead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  th: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
    paddingRight: 12,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  trBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  td: {
    paddingRight: 12,
    justifyContent: 'center',
  },
  cRef: { width: 150 },
  cCircle: { width: 150 },
  cKind: { width: 90 },
  cDate: { width: 110 },
  cAmount: { width: 110 },
  cFees: { width: 100 },
  cStatus: { width: 110 },
  refText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.forest,
  },
  memberTag: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: colors.muted,
    marginLeft: 6,
  },
  circleLink: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.forest,
  },
  dash: {
    fontSize: 14,
    color: colors.muted,
  },
  kindText: {
    fontSize: 14,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 14,
    color: colors.muted,
  },
  amountText: {
    fontSize: 14,
    color: colors.forest,
  },
});

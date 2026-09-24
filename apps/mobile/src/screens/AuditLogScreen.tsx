import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

type Event = {
  id: string;
  event_type: string;
  entity_type: string;
  created_at: string;
  circles?: { id: string; name: string } | null;
};

const MEMBER_HIDDEN = new Set([
  'CONTRIBUTION_REPORTED',
  'CONTRIBUTION_CONFIRMED',
  'CONTRIBUTION_REJECTED',
  'CONTRIBUTION_DISPUTED',
  'CONTRIBUTION_CORRECTION_REQUESTED',
  'CONTRIBUTION_CORRECTION_APPROVED',
  'CONTRIBUTION_CORRECTION_REJECTED',
  'PAYOUT_INITIATED',
  'PAYOUT_MARKED_SENT',
  'PAYOUT_RECEIPT_CONFIRMED',
  'PAYOUT_DISPUTED',
  'PAYOUT_ORDER_SET',
  'PAYOUT_ORDER_CHANGED',
]);

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AuditLogScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [approvals, setApprovals] = useState<
    { id: string; action: string; status: string; created_at: string; circle_name?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [owned, feed, ap] = await Promise.all([
        supabase.from('circles').select('id').limit(50),
        supabase
          .from('ledger_events')
          .select('id, event_type, entity_type, created_at, circles(id, name)')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('approval_requests')
          .select('id, action, status, created_at, circles(name)')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      const admin = (owned.data ?? []).length > 0;
      setIsAdmin(admin);
      let rows = (feed.data ?? []) as unknown as Event[];
      if (!admin) rows = rows.filter((e) => !MEMBER_HIDDEN.has(e.event_type));
      setEvents(rows);
      setApprovals(
        ((ap.data ?? []) as unknown as {
          id: string;
          action: string;
          status: string;
          created_at: string;
          circles?: { name: string } | null;
        }[]).map((a) => ({
          id: a.id,
          action: a.action,
          status: a.status,
          created_at: a.created_at,
          circle_name: a.circles?.name ?? null,
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
            <Text style={styles.title}>Audit log</Text>
            <Text style={styles.sub}>
              Chronological financial and admin events across your circles.
            </Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.sm, flexDirection: 'row' }}>
          <Badge label={isAdmin ? 'Admin view' : 'Privacy mode'} tone={isAdmin ? 'active' : 'muted'} />
        </View>
      </View>
      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
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
            approvals.length > 0 ? (
              <>
                <Text style={styles.section}>Approvals</Text>
                {approvals.map((a) => (
                  <Card key={a.id} style={styles.card}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.event}>{a.action.replace(/_/g, ' ')}</Text>
                        <Text style={styles.meta}>
                          {a.circle_name ?? '—'} · {when(a.created_at)}
                        </Text>
                      </View>
                      <Badge label={a.status} tone={a.status === 'approved' ? 'active' : a.status === 'rejected' ? 'error' : 'pending'} />
                    </View>
                  </Card>
                ))}
                <Text style={styles.section}>Ledger events</Text>
              </>
            ) : (
              <Text style={styles.section}>Ledger events</Text>
            )
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.empty}>No audit events yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text style={styles.event}>{item.event_type.replace(/_/g, ' ')}</Text>
              <Text style={styles.meta}>
                {item.circles?.name ?? '—'} · {item.entity_type}
              </Text>
              <Text style={styles.when}>{when(item.created_at)}</Text>
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
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: typography.body,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 20,
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
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  event: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
    textTransform: 'capitalize',
  },
  meta: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
  },
  when: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: typography.body,
  },
});

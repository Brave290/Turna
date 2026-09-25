import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cacheGet, cacheSet, drainQueue } from '../lib/offline';
import { Card, Badge } from '../components/Card';
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
    return new Date(iso).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function LedgerScreen({ onPush }: { onPush?: (screen: any) => void } = {}) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    const ck = 'ledger:' + user.id;
    const cached = await cacheGet<{ events: Event[]; isAdmin: boolean }>(ck);
    if (cached) {
      setEvents(cached.events);
      setIsAdmin(cached.isAdmin);
    }
    try {
      const [owned, feed] = await Promise.all([
        supabase
          .from('circles')
          .select('id')
          .eq('owner_id', user.id)
          .limit(50),
        supabase
          .from('ledger_events')
          .select('id, event_type, entity_type, created_at, circles(id, name)')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      const ownedCount = (owned.data ?? []).length;
      setIsAdmin(ownedCount > 0);
      let rows = (feed.data ?? []) as unknown as Event[];
      if (ownedCount === 0) {
        rows = rows.filter((e) => !MEMBER_HIDDEN.has(e.event_type));
      }
      setEvents(rows);
      void cacheSet(ck, { events: rows, isAdmin: ownedCount > 0 });
      void drainQueue();
      if (feed.error) setError(feed.error.message);
    } catch {
      if (!cached) setError('Could not load ledger.');
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
    const rows = [
      ['timestamp', 'circle', 'event', 'entity', 'event_id'],
      ...events.map((e) => [
        e.created_at,
        e.circles?.name ?? '',
        e.event_type,
        e.entity_type,
        e.id,
      ]),
    ];
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
    void Share.share({
      message: csv,
      title: `turna-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
    });
  };

  const sub = isAdmin
    ? 'Append-only history for circles you own (admin view).'
    : "General activity only. Contribution and payout events for other members are hidden to protect privacy.";

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Text style={styles.title}>Ledger</Text>
        <Text style={styles.sub}>{sub}</Text>
        <View style={styles.badgeWrap}>
          <Badge label={isAdmin ? 'Admin view' : 'Privacy mode'} tone={isAdmin ? 'active' : 'muted'} />
          {events.length > 0 && (
            <Pressable onPress={exportCsv} style={styles.linkBtn}>
              <Text style={styles.linkText}>Export CSV</Text>
            </Pressable>
          )}
          <Pressable onPress={() => onPush?.({ name: 'audit-log' })} style={styles.linkBtn}>
            <Text style={styles.linkText}>Audit log</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl }} />
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
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 1.2 }]}>When</Text>
              <Text style={[styles.th, { flex: 1 }]}>Circle</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Event</Text>
              <Text style={[styles.th, { flex: 0.9 }]}>Entity</Text>
            </View>
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.emptyBody}>{error ?? 'No ledger events yet.'}</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <View style={styles.tr}>
              <Text style={[styles.td, styles.tdMuted, { flex: 1.2 }]} numberOfLines={2}>
                {when(item.created_at)}
              </Text>
              <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
                {item.circles?.name ?? '—'}
              </Text>
              <Text style={[styles.td, styles.tdMedium, { flex: 1.2 }]} numberOfLines={2}>
                {item.event_type.replace(/_/g, ' ')}
              </Text>
              <Text style={[styles.td, styles.tdMuted, { flex: 0.9 }]} numberOfLines={1}>
                {item.entity_type}
              </Text>
            </View>
          )}
        />
      )}

      {!isAdmin && !loading && (
        <Text style={styles.privacyNote}>
          Payment and payout ledger entries only appear for the circle admin (owner). Your own
          events still show on the circle page.
        </Text>
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
    marginTop: 6,
    lineHeight: 20,
  },
  badgeWrap: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  linkBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  linkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tableHead: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: {
    fontSize: typography.caption,
    color: colors.muted,
    fontWeight: '500',
  },
  tr: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'flex-start',
  },
  td: {
    fontSize: typography.caption,
    color: colors.forest,
  },
  tdMuted: {
    color: colors.muted,
  },
  tdMedium: {
    fontWeight: '600',
  },
  emptyBody: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  privacyNote: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginTop: spacing.sm,
  },
});

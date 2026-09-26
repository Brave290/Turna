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
import { useFastRefresh } from '../lib/useFastRefresh';
import { useConnectivity } from '../lib/connectivity';
import { OfflineScreen } from '../components/OfflineScreen';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { Enter } from '../components/Enter';
import { colors, spacing, typography, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

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
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const online = useConnectivity();
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
      // Web parity: same feed as getLedgerFeed() (`*, circles(id, name)`,
      // newest first, RLS scopes rows to owned + active memberships).
      const [ownedRes, memberRes, feedRes] = await Promise.all([
        supabase
          .from('circles')
          .select('id')
          .eq('owner_id', user.id)
          .limit(50),
        supabase
          .from('circle_members')
          .select('circle_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(50),
        supabase
          .from('ledger_events')
          .select('*, circles(id, name)')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const owned = (ownedRes.data ?? []) as { id: string }[];
      const memberships = (memberRes.data ?? []) as { circle_id: string }[];
      const ownedCount = owned.length;
      const admin = !ownedRes.error && ownedCount > 0;
      setIsAdmin(admin);

      let rows = (feedRes.data ?? []) as unknown as Event[];

      // Fallback: if the global feed errored or came back empty while the
      // user belongs to circles, read each circle directly so members still
      // see their events instead of a silent empty list.
      if (feedRes.error || rows.length === 0) {
        const ids = Array.from(
          new Set([...owned.map((c) => c.id), ...memberships.map((m) => m.circle_id)])
        ).filter(Boolean);
        if (ids.length > 0) {
          const perCircle = await supabase
            .from('ledger_events')
            .select('*, circles(id, name)')
            .in('circle_id', ids)
            .order('created_at', { ascending: false })
            .limit(200);
          if (perCircle.data) {
            const seen = new Set(rows.map((r) => r.id));
            rows = rows.concat(
              ((perCircle.data ?? []) as unknown as Event[]).filter((r) => !seen.has(r.id))
            );
          } else if (perCircle.error) {
            setError(perCircle.error.message);
          }
        }
      }

      if (rows.length === 0) {
        if (feedRes.error) setError(feedRes.error.message);
        else if (memberRes.error) setError(memberRes.error.message);
      }

      if (!admin) {
        rows = rows.filter((e) => !MEMBER_HIDDEN.has(e.event_type));
      }
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setEvents(rows);
      void cacheSet(ck, { events: rows, isAdmin: admin });
      void drainQueue();
    } catch {
      if (!cached) setError('Could not load ledger. Pull to refresh to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFastRefresh(load, { busy: refreshing });

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
      <Enter delay={0}>
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
      </Enter>

      {!online && events.length === 0 ? (
        <OfflineScreen
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      ) : loading ? (
        <ActivityIndicator color={p.primary} size="large" style={{ marginTop: spacing.xl }} />
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
              tintColor={p.primary}
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
              {error && (
                <Button
                  label="Try again"
                  variant="outline"
                  onPress={() => {
                    setLoading(true);
                    void load();
                  }}
                  style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
                />
              )}
            </Card>
          }
          renderItem={({ item, index }) => (
            <Enter delay={index * 60}>
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
            </Enter>
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

const makeStyles = (p: Palette) => StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: p.text,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: typography.body,
    color: p.textMuted,
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
    borderColor: p.border,
    backgroundColor: p.surface,
  },
  linkText: {
    fontSize: 12,
    color: p.primary,
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
    borderBottomColor: p.border,
  },
  th: {
    fontSize: typography.caption,
    color: p.textMuted,
    fontWeight: '500',
  },
  tr: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: p.border,
    alignItems: 'flex-start',
  },
  td: {
    fontSize: typography.caption,
    color: p.text,
  },
  tdMuted: {
    color: p.textMuted,
  },
  tdMedium: {
    fontWeight: '600',
  },
  emptyBody: {
    fontSize: typography.caption,
    color: p.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  privacyNote: {
    fontSize: 12,
    color: p.textMuted,
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginTop: spacing.sm,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
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
  'PAYOUT_INITIATED',
  'PAYOUT_MARKED_SENT',
  'PAYOUT_RECEIPT_CONFIRMED',
  'PAYOUT_DISPUTED',
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

export function LedgerScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [owned, feed] = await Promise.all([
        supabase.from('circles').select('id').limit(50),
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
      if (feed.error) setError(feed.error.message);
    } catch {
      setError('Could not load ledger.');
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
        <Text style={styles.title}>Ledger</Text>
        <Text style={styles.sub}>
          {isAdmin
            ? 'Append-only history for circles you own.'
            : 'Activity visible to you. Other members\' payments are hidden.'}
        </Text>
        <View style={[styles.badge, isAdmin ? styles.badgeAdmin : styles.badgePrivacy]}>
          <Text style={isAdmin ? styles.badgeAdminText : styles.badgePrivacyText}>
            {isAdmin ? 'Admin view' : 'Privacy mode'}
          </Text>
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
          ListEmptyComponent={
            <Card>
              <Text style={styles.emptyBody}>{error ?? 'No ledger events yet.'}</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text style={styles.event}>
                {item.event_type.replace(/_/g, ' ')}
              </Text>
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
  },
  sub: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeAdmin: {
    backgroundColor: 'rgba(0,168,120,0.14)',
  },
  badgePrivacy: {
    backgroundColor: colors.border,
  },
  badgeAdminText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  badgePrivacyText: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  card: {
    marginBottom: 0,
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
  emptyBody: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 20,
  },
});

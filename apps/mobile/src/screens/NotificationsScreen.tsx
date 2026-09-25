import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card, Badge } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

type N = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

function rel(iso: string) {
  try {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

export function NotificationsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setRows((data ?? []) as N[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = rows.filter((n) => n.status !== 'read').length;

  async function markAll() {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('user_id', user.id)
      .neq('status', 'read');
    await load();
  }

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <View style={styles.headRow}>
          {onBack && <Button label="← Back" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.sub}>Invites, contribution reminders, and payout updates.</Text>
          </View>
          {unread > 0 && (
            <Button label="Mark all read" variant="outline" onPress={() => void markAll()} style={styles.markBtn} />
          )}
        </View>
      </View>
      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
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
              <Text style={styles.empty}>No notifications yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nTitle}>{item.title}</Text>
                  <Text style={styles.nBody}>{item.body}</Text>
                  <Text style={styles.nWhen}>{rel(item.created_at)}</Text>
                </View>
                <Badge
                  label={item.status}
                  tone={item.status === 'read' ? 'muted' : 'active'}
                />
              </View>
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
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  markBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
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
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  nTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  nBody: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  nWhen: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 6,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: typography.body,
  },
});

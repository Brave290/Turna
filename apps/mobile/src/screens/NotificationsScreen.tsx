import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bell, CheckCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatRelativeTime } from '../lib/format';
import { Button } from '../components/Button';
import { Card, Badge, type BadgeTone } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';

type N = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

// Same map as web StatusBadge (status-badge.tsx): badge tones by status.
const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'completed',
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

function MarkAllButton({
  onPress,
  busy,
}: {
  onPress: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.markBtn,
        pressed && styles.markBtnPressed,
        busy && styles.markBtnBusy,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.forest} />
      ) : (
        <CheckCheck size={16} color={colors.forest} strokeWidth={2} />
      )}
      <Text style={styles.markBtnText}>
        {busy ? 'Marking…' : 'Mark all as read'}
      </Text>
    </Pressable>
  );
}

export function NotificationsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);

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
    setMarking(true);
    try {
      await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('user_id', user.id)
        .neq('status', 'read');
      await load();
    } finally {
      setMarking(false);
    }
  }

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
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.sub}>
          Invites, contribution reminders, and payout updates.
        </Text>
        {unread > 0 && (
          <MarkAllButton onPress={() => void markAll()} busy={marking} />
        )}
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
            <Card style={styles.emptyCard}>
              <Bell size={32} color={colors.muted} strokeWidth={2} />
              <Text style={styles.empty}>No notifications yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <Bell size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.content}>
                  <View style={styles.titleRow}>
                    <Text style={styles.nTitle}>{item.title}</Text>
                    <Badge
                      label={item.status.replace(/_/g, ' ')}
                      tone={toneFor(item.status)}
                    />
                  </View>
                  <Text style={styles.nBody}>{item.body}</Text>
                  <Text style={styles.nWhen}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
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
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    marginLeft: -8,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.75,
    marginTop: spacing.xs,
  },
  sub: {
    fontSize: 16,
    color: colors.muted,
    marginTop: -spacing.xs,
  },
  markBtn: {
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
  },
  markBtnPressed: {
    backgroundColor: colors.cream,
  },
  markBtnBusy: {
    opacity: 0.6,
  },
  markBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.forest,
  },
  loading: {
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.forest,
  },
  nBody: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 20,
  },
  nWhen: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 8,
  },
  emptyCard: {
    marginBottom: 0,
    paddingVertical: 56,
    alignItems: 'center',
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 15,
    marginTop: 12,
  },
});

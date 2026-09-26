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
import { cacheGet, cacheSet, drainQueue } from '../lib/offline';
import { formatRelativeTime } from '../lib/format';
import { Button } from '../components/Button';
import { Card, Badge, type BadgeTone } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors, radius, spacing, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

type N = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

// Same map as web StatusBadge (status-badge.tsx): badge tones by status.
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

function MarkAllButton({
  onPress,
  busy,
}: {
  onPress: () => void;
  busy: boolean;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
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
        <ActivityIndicator size="small" color={p.text} />
      ) : (
        <CheckCheck size={16} color={p.text} strokeWidth={2} />
      )}
      <Text style={styles.markBtnText}>
        {busy ? 'Marking…' : 'Mark all as read'}
      </Text>
    </Pressable>
  );
}

export function NotificationsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const [rows, setRows] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const ck = 'notifications:' + user.id;
    const cached = await cacheGet<N[]>(ck);
    if (cached) setRows(cached);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      const list = (data ?? []) as N[];
      setRows(list);
      void cacheSet(ck, list);
      void drainQueue();
    } catch {
      /* offline — keep cached rows */
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

  // Web parity: opening a notification marks it read (optimistic, then server).
  async function markRead(id: string) {
    if (!user) return;
    const target = rows.find((r) => r.id === id);
    if (!target || target.status === 'read') return;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'read' } : r)));
    try {
      await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', id)
        .eq('user_id', user.id);
    } catch {
      /* offline — keep optimistic state */
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
              tintColor={p.primary}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Bell size={32} color={p.textMuted} strokeWidth={2} />
              <Text style={styles.empty}>No notifications yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notification: ${item.title}`}
              onPress={() => void markRead(item.id)}
              style={({ pressed }) => (pressed ? styles.cardPressed : undefined)}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.iconBox}>
                    <Bell size={20} color={p.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.nTitle, item.status !== 'read' && styles.nTitleUnread]}>
                        {item.title}
                      </Text>
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
            </Pressable>
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
    color: p.text,
    letterSpacing: -0.75,
    marginTop: spacing.xs,
  },
  sub: {
    fontSize: 16,
    color: p.textMuted,
    marginTop: -spacing.xs,
  },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    alignSelf: 'flex-start',
  },
  markBtnPressed: {
    backgroundColor: p.bg,
  },
  markBtnBusy: {
    opacity: 0.6,
  },
  markBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: p.text,
  },
  loading: {
    color: p.textMuted,
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
  cardPressed: {
    opacity: 0.7,
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
    color: p.text,
  },
  nTitleUnread: {
    fontWeight: '700',
  },
  nBody: {
    fontSize: 14,
    color: p.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  nWhen: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 8,
  },
  emptyCard: {
    marginBottom: 0,
    paddingVertical: 56,
    alignItems: 'center',
  },
  empty: {
    color: p.textMuted,
    textAlign: 'center',
    fontSize: 15,
    marginTop: 12,
  },
});

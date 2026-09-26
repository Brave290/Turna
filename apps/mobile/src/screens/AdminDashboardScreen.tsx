import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Check,
  CircleDot,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Badge, Card, Stat } from '../components/Card';
import { Popup, useConfirm } from '../components/Popup';
import { Screen } from '../components/Screen';
import { StaggerItem } from '../components/Stagger';
import { useToast } from '../components/Toast';
import {
  mobileAdmin,
  type AdminCircleRow,
  type AdminContributionRow,
  type AdminKycRow,
  type AdminOverview,
  type AdminUserRow,
} from '../lib/api';
import { codeInputProps, noteInputProps } from '../lib/input-props';
import { formatCurrency, formatDate } from '../lib/format';
import { colors, radius, spacing, typography, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

function flatten<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

const EMPTY: AdminOverview = {
  counts: { users: 0, circles: 0, memberships: 0, pendingKyc: 0, pendingContributions: 0 },
  recentUsers: [],
  recentCircles: [],
  kycQueue: [],
  pendingContributions: [],
};

export function AdminDashboardScreen({ onBack }: { onBack?: () => void }) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const { confirm, node: confirmNode } = useConfirm();
  const { show: toast, node: toastNode } = useToast();

  const [data, setData] = useState<AdminOverview>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [rejectKyc, setRejectKyc] = useState<AdminKycRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await mobileAdmin.overview();
    if (res.ok && res.data) setData(res.data);
    else if (!res.offline) {
      setError(
        res.error === 'Forbidden'
          ? 'This account is not on the admin allowlist yet.'
          : (res.error ?? 'Could not load the dashboard.')
      );
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.recentUsers;
    return data.recentUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.display_name.toLowerCase().includes(q)
    );
  }, [data.recentUsers, query]);

  const pendingKyc = useMemo(
    () => data.kycQueue.filter((k) => k.status === 'pending'),
    [data.kycQueue]
  );

  async function runKyc(row: AdminKycRow, decision: 'approved' | 'rejected', reason?: string) {
    setBusyId(row.id);
    const res = await mobileAdmin.kyc({ id: row.id, decision, reason });
    setBusyId(null);
    if (!res.ok) {
      toast(res.error ?? 'Could not update KYC', 'error');
      return;
    }
    toast(decision === 'approved' ? 'KYC approved' : 'KYC rejected');
    await load();
  }

  async function approveKyc(row: AdminKycRow) {
    const ok = await confirm(
      'Approve this KYC?',
      `${row.full_legal_name} · ${row.document_type.toUpperCase()} ${row.document_number}`,
      { confirmLabel: 'Approve' }
    );
    if (ok) await runKyc(row, 'approved');
  }

  function openRejectKyc(row: AdminKycRow) {
    setRejectReason('');
    setRejectKyc(row);
  }

  async function submitRejectKyc() {
    if (!rejectKyc) return;
    const row = rejectKyc;
    setRejectKyc(null);
    await runKyc(row, 'rejected', rejectReason.trim() || 'Rejected by admin');
  }

  async function decideContribution(row: AdminContributionRow, decision: 'confirmed' | 'rejected') {
    const ok = await confirm(
      decision === 'confirmed' ? 'Confirm this contribution?' : 'Reject this contribution?',
      `${row.member_name} · ${formatCurrency(row.amount)} · ${row.circle_name}`,
      { confirmLabel: decision === 'confirmed' ? 'Confirm' : 'Reject', danger: decision === 'rejected' }
    );
    if (!ok) return;
    setBusyId(row.id);
    const res = await mobileAdmin.contribution({ contribution_id: row.id, decision });
    setBusyId(null);
    if (!res.ok) {
      toast(res.error ?? 'Could not decide contribution', 'error');
      return;
    }
    toast(decision === 'confirmed' ? 'Contribution confirmed' : 'Contribution rejected');
    await load();
  }

  async function removeUser(row: AdminUserRow) {
    const ok = await confirm(
      'Delete this account?',
      `${row.email} will be signed out everywhere, removed from circles, and anonymized.`,
      { confirmLabel: 'Delete user', danger: true }
    );
    if (!ok) return;
    setBusyId(row.id);
    const res = await mobileAdmin.deleteUser(row.id);
    setBusyId(null);
    if (!res.ok) {
      toast(res.error ?? 'Could not delete that account', 'error');
      return;
    }
    toast('Account deleted');
    await load();
  }

  async function sendBroadcast() {
    const title = broadcastTitle.trim();
    const message = broadcastBody.trim();
    if (!title || !message) {
      toast('Add a title and a message first', 'error');
      return;
    }
    const target = data.counts.users;
    const ok = await confirm(
      'Send this broadcast?',
      `It reaches ${target} user${target === 1 ? '' : 's'} by email and in the app.`,
      { confirmLabel: 'Send' }
    );
    if (!ok) return;
    setSending(true);
    const res = await mobileAdmin.broadcast({ title, body: message });
    setSending(false);
    if (!res.ok) {
      toast(res.error ?? 'Could not send the broadcast', 'error');
      return;
    }
    const count = res.data?.count ?? target;
    toast(`Sent to ${count} users (email + in-app)`);
    setBroadcastTitle('');
    setBroadcastBody('');
  }

  const c = data.counts;

  return (
    <Screen tone="cream">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
          <View style={styles.headRow}>
            <View style={styles.headIcon}>
              <ShieldAlert size={20} color={p.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title}>Ops dashboard</Text>
              <Text style={styles.sub} numberOfLines={1}>
                Platform overview for {user?.email ?? 'admin'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh dashboard"
              onPress={() => {
                setRefreshing(true);
                void load();
              }}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            >
              <RefreshCw size={16} color={p.primary} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={p.primary} size="large" />
          </View>
        ) : (
          <>
            {error ? (
              <Card style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                  label="Try again"
                  variant="outline"
                  onPress={() => {
                    setLoading(true);
                    void load();
                  }}
                  style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
                />
              </Card>
            ) : null}

            <View style={styles.statGrid}>
              <Card style={styles.statCard}>
                <Stat icon={Users} label="Users" value={String(c.users)} sub="Registered accounts" />
              </Card>
              <Card style={styles.statCard}>
                <Stat
                  icon={CircleDot}
                  label="Circles"
                  value={String(c.circles)}
                  sub={`${c.memberships} memberships`}
                />
              </Card>
              <Card style={styles.statCard}>
                <Stat
                  icon={UserCheck}
                  label="KYC pending"
                  value={String(c.pendingKyc)}
                  sub={`${data.kycQueue.length} in queue`}
                />
              </Card>
              <Card style={styles.statCard}>
                <Stat
                  icon={Wallet}
                  label="Contributions"
                  value={String(c.pendingContributions)}
                  sub="Awaiting a decision"
                />
              </Card>
            </View>

            <Text style={styles.section}>Members</Text>
            <Card style={styles.panel}>
              <View style={styles.searchWrap}>
                <Search size={16} color={p.textMuted} strokeWidth={2} />
                <TextInput
                  style={styles.search}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search by name or email"
                  placeholderTextColor={p.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  importantForAutofill="no"
                />
                {query ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <X size={15} color={p.textMuted} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.panelHint}>
                {users.length} of {data.recentUsers.length} recent accounts
              </Text>
              {users.length === 0 ? (
                <Text style={styles.emptyLine}>No accounts match that search.</Text>
              ) : (
                users.slice(0, 30).map((u, i) => (
                  <StaggerItem key={u.id} index={i}>
                    <View style={[styles.row, i > 0 && styles.rowBorder]}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(u.display_name)}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {u.display_name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {u.email}
                        </Text>
                        <Text style={styles.rowTiny}>Joined {formatDate(u.created_at)}</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${u.email}`}
                        disabled={busyId === u.id}
                        onPress={() => void removeUser(u)}
                        style={({ pressed }) => [styles.trash, pressed && styles.trashPressed]}
                      >
                        {busyId === u.id ? (
                          <ActivityIndicator size="small" color={p.error} />
                        ) : (
                          <Trash2 size={16} color={p.error} strokeWidth={2} />
                        )}
                      </Pressable>
                    </View>
                  </StaggerItem>
                ))
              )}
            </Card>

            <Text style={styles.section}>Circles</Text>
            <Card style={styles.panel}>
              {data.recentCircles.length === 0 ? (
                <Text style={styles.emptyLine}>No circles yet.</Text>
              ) : (
                data.recentCircles.slice(0, 10).map((ci, i) => (
                  <View key={ci.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {ci.name}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {formatCurrency(ci.contribution_amount, ci.currency)} ·{' '}
                        {formatDate(ci.created_at)}
                      </Text>
                    </View>
                    <Badge
                      label={ci.status}
                      tone={ci.status === 'active' ? 'active' : ci.status === 'paused' ? 'pending' : 'muted'}
                    />
                  </View>
                ))
              )}
            </Card>

            <Text style={styles.section}>KYC queue</Text>
            <Card style={styles.panel}>
              <Text style={styles.panelHint}>{pendingKyc.length} awaiting review</Text>
              {data.kycQueue.length === 0 ? (
                <Text style={styles.emptyLine}>No KYC submissions yet.</Text>
              ) : (
                data.kycQueue.map((k, i) => {
                  const profile = flatten<{ email?: string; display_name?: string }>(
                    k.profiles as never
                  );
                  return (
                    <StaggerItem key={k.id} index={i}>
                      <View style={[styles.row, i > 0 && styles.rowBorder]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {k.full_legal_name}
                          </Text>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            {profile?.email ?? '—'} · {k.document_type.toUpperCase()}{' '}
                            {k.document_number}
                          </Text>
                          <Text style={styles.rowTiny}>Submitted {formatDate(k.created_at)}</Text>
                          {k.status !== 'pending' && k.rejection_reason ? (
                            <Text style={styles.reason}>{k.rejection_reason}</Text>
                          ) : null}
                        </View>
                        <View style={styles.rowSide}>
                          <Badge
                            label={k.status}
                            tone={
                              k.status === 'approved'
                                ? 'active'
                                : k.status === 'rejected'
                                  ? 'error'
                                  : 'pending'
                            }
                          />
                          {k.status === 'pending' ? (
                            <View style={styles.inlineActions}>
                              <Pressable
                                accessibilityRole="button"
                                disabled={busyId === k.id}
                                onPress={() => void approveKyc(k)}
                                style={({ pressed }) => [
                                  styles.miniBtn,
                                  styles.miniApprove,
                                  pressed && styles.miniPressed,
                                ]}
                              >
                                <Check size={14} color={colors.white} strokeWidth={2.5} />
                                <Text style={styles.miniApproveText}>Approve</Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                disabled={busyId === k.id}
                                onPress={() => openRejectKyc(k)}
                                style={({ pressed }) => [
                                  styles.miniBtn,
                                  styles.miniReject,
                                  pressed && styles.miniPressed,
                                ]}
                              >
                                <X size={14} color={p.error} strokeWidth={2.5} />
                                <Text style={styles.miniRejectText}>Reject</Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </StaggerItem>
                  );
                })
              )}
            </Card>

            <Text style={styles.section}>Pending contributions</Text>
            <Card style={styles.panel}>
              {data.pendingContributions.length === 0 ? (
                <Text style={styles.emptyLine}>Nothing is waiting on a decision.</Text>
              ) : (
                data.pendingContributions.map((row, i) => (
                  <StaggerItem key={row.id} index={i}>
                    <View style={[styles.row, i > 0 && styles.rowBorder]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {formatCurrency(row.amount)} · {row.circle_name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {row.member_name} · {row.member_email}
                        </Text>
                        <Text style={styles.rowTiny}>{formatDate(row.created_at)}</Text>
                      </View>
                      <View style={styles.inlineActions}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={busyId === row.id}
                          onPress={() => void decideContribution(row, 'confirmed')}
                          style={({ pressed }) => [
                            styles.miniBtn,
                            styles.miniApprove,
                            pressed && styles.miniPressed,
                          ]}
                        >
                          <Check size={14} color={colors.white} strokeWidth={2.5} />
                          <Text style={styles.miniApproveText}>Confirm</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={busyId === row.id}
                          onPress={() => void decideContribution(row, 'rejected')}
                          style={({ pressed }) => [
                            styles.miniBtn,
                            styles.miniReject,
                            pressed && styles.miniPressed,
                          ]}
                        >
                          <X size={14} color={p.error} strokeWidth={2.5} />
                          <Text style={styles.miniRejectText}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  </StaggerItem>
                ))
              )}
            </Card>

            <Text style={styles.section}>Broadcast</Text>
            <Card style={styles.panel}>
              <View style={styles.broadcastHead}>
                <View style={styles.headIcon}>
                  <Megaphone size={16} color={p.primary} strokeWidth={2} />
                </View>
                <Text style={styles.broadcastTitle}>Message every user</Text>
              </View>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
                placeholder="Scheduled maintenance tonight"
                placeholderTextColor={p.textMuted}
                maxLength={120}
                {...codeInputProps}
              />
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={broadcastBody}
                onChangeText={setBroadcastBody}
                placeholder="Write what every member should know."
                placeholderTextColor={p.textMuted}
                maxLength={2000}
                multiline
                {...noteInputProps}
              />
              <Button
                label={`Send to ${c.users} user${c.users === 1 ? '' : 's'}`}
                onPress={() => void sendBroadcast()}
                loading={sending}
                style={{ marginTop: spacing.md }}
              />
              <Text style={styles.broadcastNote}>
                Delivered by email and as an in-app notification.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>

      <Popup
        visible={rejectKyc !== null}
        onClose={() => setRejectKyc(null)}
        title="Reject KYC"
        subtitle={
          rejectKyc
            ? `${rejectKyc.full_legal_name} · ${rejectKyc.document_type.toUpperCase()}`
            : ''
        }
        footer={
          <View style={styles.formActions}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => setRejectKyc(null)}
              style={{ flex: 1 }}
            />
            <Button label="Reject" variant="danger" onPress={() => void submitRejectKyc()} style={{ flex: 1 }} />
          </View>
        }
      >
        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={rejectReason}
          onChangeText={setRejectReason}
          placeholder="Document unreadable"
          placeholderTextColor={p.textMuted}
          maxLength={300}
          multiline
          {...noteInputProps}
        />
      </Popup>

      {confirmNode}
      {toastNode}
    </Screen>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
    },
    header: {
      marginBottom: spacing.md,
    },
    backBtn: {
      alignSelf: 'flex-start',
      minHeight: 36,
      marginLeft: -8,
    },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    headIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(0,122,101,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnPressed: {
      backgroundColor: p.bg,
    },
    title: {
      fontSize: typography.title,
      fontWeight: '700',
      color: p.text,
      letterSpacing: -0.4,
    },
    sub: {
      fontSize: typography.caption,
      color: p.textMuted,
      marginTop: 2,
    },
    loadingBox: {
      paddingVertical: spacing.xxl,
      alignItems: 'center',
    },
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    statCard: {
      width: '48%',
      minWidth: 150,
      flexGrow: 1,
      marginBottom: 0,
    },
    section: {
      fontSize: typography.body,
      fontWeight: '700',
      color: p.text,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    panel: {
      padding: 0,
      overflow: 'hidden',
    },
    panelHint: {
      fontSize: 12,
      color: p.textMuted,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      margin: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radius.md,
      backgroundColor: p.surface,
    },
    search: {
      flex: 1,
      fontSize: typography.body,
      color: p.text,
      paddingVertical: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: p.border,
    },
    rowSide: {
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    rowTitle: {
      fontSize: typography.body,
      fontWeight: '600',
      color: p.text,
    },
    rowMeta: {
      fontSize: 12,
      color: p.textMuted,
      marginTop: 2,
    },
    rowTiny: {
      fontSize: 11,
      color: p.textMuted,
      marginTop: 3,
    },
    reason: {
      fontSize: 11,
      color: p.error,
      marginTop: 3,
    },
    emptyLine: {
      fontSize: typography.caption,
      color: p.textMuted,
      padding: spacing.md,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: 'rgba(0,122,101,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '700',
      color: p.primary,
    },
    trash: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trashPressed: {
      opacity: 0.7,
    },
    inlineActions: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    },
    miniBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: radius.sm,
      borderWidth: 1,
    },
    miniApprove: {
      backgroundColor: p.primarySolid,
      borderColor: p.primarySolid,
    },
    miniApproveText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '600',
    },
    miniReject: {
      backgroundColor: 'transparent',
      borderColor: p.error,
    },
    miniRejectText: {
      color: p.error,
      fontSize: 12,
      fontWeight: '600',
    },
    miniPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.97 }],
    },
    broadcastHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      paddingBottom: 0,
    },
    broadcastTitle: {
      fontSize: typography.body,
      fontWeight: '600',
      color: p.text,
    },
    broadcastNote: {
      fontSize: 11,
      color: p.textMuted,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    label: {
      fontSize: typography.caption,
      fontWeight: '600',
      color: p.textMuted,
      marginTop: spacing.sm,
      marginBottom: 6,
      paddingHorizontal: spacing.md,
    },
    input: {
      marginHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: p.text,
      fontSize: typography.body,
      backgroundColor: p.surface,
    },
    textarea: {
      minHeight: 96,
      paddingTop: 12,
      textAlignVertical: 'top',
      marginBottom: spacing.sm,
    },
    formActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    errorCard: {
      borderColor: p.error,
    },
    errorText: {
      color: p.error,
      fontSize: typography.caption,
    },
  });

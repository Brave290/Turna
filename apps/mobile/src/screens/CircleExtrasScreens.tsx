import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { mobileInvites } from '../lib/api';
import { Button } from '../components/Button';
import { AppSelect } from '../components/AppSelect';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Popup';
import { enqueueOp, isOfflineError } from '../lib/offline';
import { offlineUuid } from '../lib/solo-store';
import { Card, Badge } from '../components/Card';
import { Screen } from '../components/Screen';
import { ContributionPanel, PayoutPanel } from '../components/CyclePanels';
import {
  leaveCircle,
  movePayoutPosition,
  removeMember,
  setMemberRole,
  updateCircleDetails,
  updateCircleFees,
} from '../lib/circle-actions';
import { colors, spacing, typography, type Palette } from '../theme';
import { formatCurrency, formatDate } from '../lib/format';
import { usePaletteStyles } from '../context/ThemeContext';

type Circle = {
  id: string;
  name: string;
  status: string;
  description?: string | null;
  contribution_amount: number;
  currency: string;
  frequency: string;
  current_cycle?: string | null;
  member_count?: number | null;
  member_limit?: number;
  owner_id?: string;
  fee_bps?: number;
  network_charge_bps?: number;
  fee_payer?: string;
};

type Member = {
  id: string;
  status: string;
  role?: string;
  payout_position?: number | null;
  profiles?: { display_name?: string | null; email?: string | null } | null;
};

type Invite = {
  id: string;
  invitee_email?: string | null;
  is_open?: boolean;
  status: string;
  expires_at: string;
  created_at: string;
};

function money(n: number, c = 'NGN') {
  return formatCurrency(n, c);
}

export function CircleDetailScreen({
  circleId,
  onBack,
  onOpenMembers,
}: {
  circleId: string;
  onBack: () => void;
  onOpenMembers?: () => void;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const { confirm, node: confirmNode } = useConfirm();
  const { show: toast, node: toastNode } = useToast();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cRes, mRes] = await Promise.all([
        supabase.from('circles').select('*').eq('id', circleId).maybeSingle(),
        supabase
          .from('circle_members')
          .select('id')
          .eq('circle_id', circleId)
          .eq('status', 'active')
          .eq('user_id', user?.id ?? '')
          .maybeSingle(),
      ]);
      setCircle((cRes.data as Circle | null) ?? null);
      setMyMemberId((mRes.data as { id: string } | null)?.id ?? null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [circleId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = !!circle && circle.owner_id === user?.id;

  async function handleDelete() {
    if (!circle) return;
    const ok = await confirm(
      'Delete circle',
      `Delete "${circle.name}" permanently? Members, invites, cycles, and ledger history for this circle will be removed. This cannot be undone.`,
      { confirmLabel: 'Delete', danger: true }
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('circles').delete().eq('id', circle.id);
      if (error) throw new Error(error.message);
      onBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (isOfflineError(e)) {
        await enqueueOp({
          table: 'circles',
          action: 'delete',
          match: { id: circle.id },
        });
        toast('Offline — the circle will be removed when you’re back online.');
      } else if (msg.includes('23503')) {
        toast('This circle still has related records and cannot be deleted yet.', 'error');
      } else if (msg.includes('row-level security') || msg.includes('permission')) {
        toast('Only the owner can delete this circle', 'error');
      } else {
        toast('Could not delete circle', 'error');
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleLeave() {
    if (!circle) return;
    const ok = await confirm(
      'Leave circle',
      `Leave "${circle.name}"? You drop out of the contribution schedule and payout order for this circle.`,
      { confirmLabel: 'Leave', danger: true }
    );
    if (!ok) return;
    setLeaving(true);
    const res = await leaveCircle(circle.id);
    setLeaving(false);
    if (res.ok) {
      toast(res.success ?? 'You left the circle');
      onBack();
      return;
    }
    toast(res.error ?? 'Could not leave circle', 'error');
  }

  if (loading) {
    return (
      <Screen tone="cream">
        <View style={styles.header}>
          <Button label="← Circles" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
          <ActivityIndicator color={p.primary} style={{ marginTop: spacing.lg }} />
        </View>
      </Screen>
    );
  }

  if (!circle) {
    return (
      <Screen tone="cream">
        <View style={styles.header}>
          <Button label="← Circles" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
          <Text style={styles.title}>Circle not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="cream">
      <FlatList
        data={[] as never[]}
        keyExtractor={() => 'x'}
        renderItem={() => null}
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
          <>
            <Button label="← Circles" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{circle.name}</Text>
                <Text style={styles.amount}>
                  {money(circle.contribution_amount, circle.currency)}
                  <Text style={styles.amountNormal}> / {circle.frequency}</Text>
                </Text>
              </View>
              <Badge
                label={circle.status}
                tone={circle.status === 'active' ? 'active' : circle.status === 'paused' ? 'pending' : 'muted'}
              />
            </View>
            {circle.description ? <Text style={styles.desc}>{circle.description}</Text> : null}
            <View style={styles.badgeRow}>
              <Badge label={`Cycle ${circle.current_cycle || 0}`} tone="muted" />
              {circle.member_count != null && <Badge label={`${circle.member_count} members`} tone="muted" />}
            </View>
            <View style={styles.actions}>
              <Button label="Members" variant="outline" onPress={() => onOpenMembers?.()} style={{ flex: 1 }} />
              <Button label="Invite members" variant="primary" onPress={() => onOpenMembers?.()} style={{ flex: 1 }} />
            </View>
            <View style={styles.actions}>
              <Button label="Back" variant="ghost" onPress={onBack} style={{ flex: 1 }} />
            </View>
            <ContributionPanel
              circleId={circle.id}
              currency={circle.currency}
              expectedAmount={circle.contribution_amount}
              isOwner={isOwner}
              onChanged={() => void load()}
            />
            <PayoutPanel
              circleId={circle.id}
              currency={circle.currency}
              isOwner={isOwner}
              myMemberId={myMemberId}
              onChanged={() => void load()}
            />
            {isOwner && <CircleSettingsCard circle={circle} onSaved={() => void load()} />}
            {!isOwner && (
              <Card style={{ marginTop: spacing.md }}>
                <Text style={styles.section}>Leave circle</Text>
                <Text style={styles.hint}>
                  Leaving removes you from the contribution schedule and the payout order for
                  this circle. The circle owner is notified.
                </Text>
                <Button
                  label="Leave circle"
                  variant="danger"
                  loading={leaving}
                  onPress={() => void handleLeave()}
                  style={{ marginTop: spacing.sm }}
                />
              </Card>
            )}
            {isOwner && (
              <Card style={{ marginTop: spacing.md }}>
                <Text style={styles.section}>Danger zone</Text>
                <Text style={styles.hint}>
                  Permanently removes {circle.name}, its members, invites, cycles, and ledger
                  history. This cannot be undone.
                </Text>
                <Button
                  label="Delete circle"
                  variant="danger"
                  loading={deleting}
                  onPress={() => void handleDelete()}
                  style={{ marginTop: spacing.sm }}
                />
              </Card>
            )}
          </>
        }
      />
      {confirmNode}
      {toastNode}
    </Screen>
  );
}

/**
 * One roster row — owner controls mirror web's members table: role change,
 * payout position edit, and remove member.
 */
function MemberRowCard({
  circleId,
  member,
  isOwner,
  onChanged,
}: {
  circleId: string;
  member: Member;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { confirm, node: confirmNode } = useConfirm();
  const { show: toast, node: toastNode } = useToast();
  const [role, setRole] = useState(member.role ?? 'member');
  const [position, setPosition] = useState(
    member.payout_position != null ? String(member.payout_position) : ''
  );
  const [busy, setBusy] = useState(false);

  const isOwnerRow = member.role === 'owner';
  const label = member.profiles?.display_name || member.profiles?.email || 'Member';

  async function changeRole(next: string) {
    const previous = role;
    setRole(next);
    setBusy(true);
    const res = await setMemberRole({ circleId, memberId: member.id, role: next });
    setBusy(false);
    if (res.ok) {
      toast(res.success ?? 'Role updated');
      onChanged();
      return;
    }
    setRole(previous);
    toast(res.error ?? 'Could not update role', 'error');
  }

  async function savePosition() {
    const n = Number.parseInt(position.replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(n) || n < 1) {
      toast('Enter a position of 1 or more', 'error');
      return;
    }
    setBusy(true);
    const res = await movePayoutPosition({ circleId, memberId: member.id, position: n });
    setBusy(false);
    if (res.ok) {
      toast(res.success ?? 'Payout position updated');
      onChanged();
      return;
    }
    toast(res.error ?? 'Could not change payout order', 'error');
  }

  async function remove() {
    const ok = await confirm(
      'Remove member?',
      `Remove ${label} from this circle? They lose access to its contributions and payouts.`,
      { confirmLabel: 'Remove', danger: true }
    );
    if (!ok) return;
    setBusy(true);
    const res = await removeMember({ circleId, memberId: member.id });
    setBusy(false);
    if (res.ok) {
      toast(res.success ?? 'Member removed');
      onChanged();
      return;
    }
    toast(res.error ?? 'Could not remove member', 'error');
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{label}</Text>
          <Text style={styles.meta}>
            {member.role ?? 'member'}
            {member.payout_position != null ? ` · Pos ${member.payout_position}` : ''}
          </Text>
        </View>
        <Badge
          label={member.status}
          tone={member.status === 'active' ? 'active' : 'muted'}
        />
      </View>
      {isOwner && !isOwnerRow && (
        <View style={styles.memberControls}>
          <AppSelect
            label="Role"
            value={role}
            onChange={(v) => void changeRole(v)}
            options={[
              { value: 'treasurer', label: 'Treasurer' },
              { value: 'member', label: 'Member' },
              { value: 'observer', label: 'Observer' },
            ]}
            disabled={busy}
            style={{ flex: 1, minWidth: 150 }}
          />
          <View style={{ flex: 1, minWidth: 150 }}>
            <Text style={styles.label}>Payout position</Text>
            <View style={styles.posRow}>
              <TextInput
                style={[styles.input, styles.posInput]}
                value={position}
                onChangeText={setPosition}
                onEndEditing={() => void savePosition()}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={p.textMuted}
                accessibilityLabel={`Payout position for ${label}`}
              />
              <Button
                label="Set"
                variant="outline"
                onPress={() => void savePosition()}
                disabled={busy}
                style={styles.posBtn}
              />
            </View>
          </View>
          <Button
            label="Remove member"
            variant="danger"
            onPress={() => void remove()}
            disabled={busy}
            style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}
          />
        </View>
      )}
      {confirmNode}
      {toastNode}
    </Card>
  );
}

/**
 * Owner-only circle settings — details (name, description, amount,
 * frequency) plus the platform fee / network charge panel web shows on the
 * circle detail page (fee_bps + network_charge_bps are basis points, 100 = 1%).
 */
function CircleSettingsCard({ circle, onSaved }: { circle: Circle; onSaved: () => void }) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { show: toast, node: toastNode } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(circle.name);
  const [description, setDescription] = useState(circle.description ?? '');
  const [amount, setAmount] = useState(String(Math.round(circle.contribution_amount / 100)));
  const [frequency, setFrequency] = useState(circle.frequency);
  const [feePct, setFeePct] = useState(String((circle.fee_bps ?? 0) / 100));
  const [netPct, setNetPct] = useState(String((circle.network_charge_bps ?? 0) / 100));
  const [feePayer, setFeePayer] = useState(circle.fee_payer ?? 'member');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(circle.name);
    setDescription(circle.description ?? '');
    setAmount(String(Math.round(circle.contribution_amount / 100)));
    setFrequency(circle.frequency);
    setFeePct(String((circle.fee_bps ?? 0) / 100));
    setNetPct(String((circle.network_charge_bps ?? 0) / 100));
    setFeePayer(circle.fee_payer ?? 'member');
  }, [circle]);

  const feeBps = Math.round(Number(feePct.replace(/[^\d.]/g, '') || '0') * 100);
  const netBps = Math.round(Number(netPct.replace(/[^\d.]/g, '') || '0') * 100);
  const feePreview = Math.floor((circle.contribution_amount * feeBps) / 10000);
  const netPreview = Math.floor((circle.contribution_amount * netBps) / 10000);

  async function save() {
    setBusy(true);
    const details = await updateCircleDetails({
      circleId: circle.id,
      name,
      description,
      contributionAmountKobo: Math.round(
        Number(amount.replace(/[^\d.]/g, '') || '0') * 100
      ),
      frequency,
    });
    if (!details.ok) {
      setBusy(false);
      toast(details.error ?? 'Could not save circle details', 'error');
      return;
    }
    const fees = await updateCircleFees({
      circleId: circle.id,
      feeBps,
      networkChargeBps: netBps,
      feePayer,
    });
    setBusy(false);
    if (!fees.ok) {
      toast(fees.error ?? 'Could not save fee settings', 'error');
      return;
    }
    toast('Circle settings saved');
    onSaved();
  }

  return (
    <Card style={{ marginTop: spacing.md }}>
      <Text style={styles.section}>Circle settings</Text>
      {!open ? (
        <>
          <Text style={styles.hint}>
            Name, schedule, and fees for {circle.name}. Only the owner can edit these.
          </Text>
          <Button
            label="Edit settings"
            variant="outline"
            onPress={() => setOpen(true)}
            style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Circle name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Office ajo"
            placeholderTextColor={p.textMuted}
          />
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Saves every month on the 5th"
            placeholderTextColor={p.textMuted}
          />
          <Text style={styles.label}>Contribution amount (₦)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="5000"
            placeholderTextColor={p.textMuted}
          />
          <AppSelect
            label="Frequency"
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            style={{ marginTop: spacing.sm }}
          />
          <Text style={styles.label}>Platform fee (%)</Text>
          <TextInput
            style={styles.input}
            value={feePct}
            onChangeText={setFeePct}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={p.textMuted}
          />
          <Text style={styles.hint}>
            Currently {(feeBps / 100).toFixed(2)}% · {money(feePreview, circle.currency)}
          </Text>
          <Text style={styles.label}>Network charge / VAT (%)</Text>
          <TextInput
            style={styles.input}
            value={netPct}
            onChangeText={setNetPct}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={p.textMuted}
          />
          <Text style={styles.hint}>
            Currently {(netBps / 100).toFixed(2)}% · {money(netPreview, circle.currency)}
          </Text>
          <AppSelect
            label="Who pays the fees"
            value={feePayer}
            onChange={setFeePayer}
            options={[
              { value: 'member', label: 'Member pays' },
              { value: 'owner', label: 'Owner pays' },
              { value: 'shared', label: 'Shared' },
            ]}
            style={{ marginTop: spacing.sm }}
          />
          <View style={styles.settingsActions}>
            <Button label="Save settings" onPress={() => void save()} loading={busy} style={{ flex: 1 }} />
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} disabled={busy} style={{ flex: 1 }} />
          </View>
        </>
      )}
      {toastNode}
    </Card>
  );
}

export function CircleMembersScreen({
  circleId,
  onBack,
}: {
  circleId: string;
  onBack: () => void;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const { show: toast, node: toastNode } = useToast();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [rows, setRows] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cRes, mRes, iRes] = await Promise.all([
        supabase
          .from('circles')
          .select('id, name, owner_id, member_limit')
          .eq('id', circleId)
          .maybeSingle(),
        supabase
          .from('circle_members')
          .select('id, status, role, payout_position, profiles(display_name, email)')
          .eq('circle_id', circleId)
          .order('payout_position', { ascending: true, nullsFirst: false })
          .limit(100),
        supabase
          .from('invitations')
          .select('id, invitee_email, is_open, status, expires_at, created_at')
          .eq('circle_id', circleId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setCircle((cRes.data as Circle | null) ?? null);
      setRows((mRes.data ?? []) as unknown as Member[]);
      setInvites((iRes.data ?? []) as unknown as Invite[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [circleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = !!circle && circle.owner_id === user?.id;
  const pendingInvites = invites.filter(
    (i) => i.status === 'pending' && (!i.is_open || !!i.invitee_email)
  );

  async function sendInvite() {
    if (!user) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Enter a valid email address.');
      return;
    }
    if (email === (user.email ?? '').toLowerCase()) {
      setInviteError('You cannot invite yourself to your own circle.');
      return;
    }
    setSending(true);
    setInviteError(null);
    const token = offlineUuid();
    const res = await mobileInvites.send({
      circle_id: circleId,
      invitee_email: email,
      payout_position: rows.length + 1,
      token,
    });
    if (res.ok) {
      setInviteEmail('');
      toast(`Invite created for ${email}`);
      void load();
    } else if (res.offline) {
      await enqueueOp({
        table: 'invitations',
        action: 'insert',
        payload: {
          circle_id: circleId,
          inviter_id: user.id,
          invitee_email: email,
          token,
          status: 'pending',
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      });
      setInviteEmail('');
      toast('Offline — invite saved on this device; it syncs when you’re back online.');
    } else {
      setInviteError(res.error ?? 'Could not send invite.');
    }
    setSending(false);
  }

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Button label="← Circle" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
        <Text style={styles.title}>Members</Text>
        <Text style={styles.sub}>Active roster and payout positions.</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={p.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={rows.filter((m) => m.status === 'active')}
          keyExtractor={(m) => m.id}
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
            <>
              {isOwner && (
                <Card style={styles.inviteCard}>
                  <Text style={styles.section}>Invite member</Text>
                  <Text style={styles.hint}>
                    We email them a link to join {circle?.name ?? 'this circle'}.
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={inviteEmail}
                    onChangeText={(v: string) => {
                      setInviteEmail(v);
                      if (inviteError) setInviteError(null);
                    }}
                    placeholder="friend@example.com"
                    placeholderTextColor={p.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Invitee email"
                  />
                  {inviteError && <Text style={styles.error}>{inviteError}</Text>}
                  <Button
                    label="Send invite"
                    onPress={() => void sendInvite()}
                    loading={sending}
                    disabled={!inviteEmail.trim()}
                    style={{ marginTop: spacing.sm }}
                  />
                </Card>
              )}
              {pendingInvites.length > 0 && (
                <Card style={styles.inviteCard}>
                  <Text style={styles.section}>Pending invites</Text>
                  {pendingInvites.map((inv) => (
                    <View key={inv.id} style={styles.inviteRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.inviteEmail} numberOfLines={1}>
                          {inv.is_open ? 'Open share link' : inv.invitee_email}
                        </Text>
                        <Text style={styles.inviteMeta}>
                          exp {formatDate(inv.expires_at)}
                        </Text>
                      </View>
                      <Badge
                        label={inv.status}
                        tone={inv.status === 'pending' ? 'pending' : 'muted'}
                      />
                    </View>
                  ))}
                </Card>
              )}
            </>
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.hint}>No members yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <MemberRowCard
              circleId={circleId}
              member={item}
              isOwner={isOwner}
              onChanged={() => void load()}
            />
          )}
        />
      )}
      {toastNode}
    </Screen>
  );
}

export function NewCircleScreen({ onDone, onBack }: { onDone?: () => void; onBack?: () => void }) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { show: toast, node: toastNode } = useToast();

  async function create() {
    if (!name.trim() || !user) {
      setError('Enter a circle name.');
      return;
    }
    setBusy(true);
    setError(null);
    const row = {
      name: name.trim(),
      owner_id: user.id,
      status: 'draft',
      contribution_amount: Math.round(Number(amount.replace(/[^\d.]/g, '') || '0') * 100),
      currency: 'NGN',
      frequency,
      description: description.trim() || null,
    };
    try {
      const { error: e } = await supabase.from('circles').insert(row);
      if (e) throw e;
      onDone?.();
    } catch (e) {
      if (isOfflineError(e)) {
        await enqueueOp({
          table: 'circles',
          action: 'insert',
          payload: { id: offlineUuid(), ...row, created_at: new Date().toISOString() },
        });
        toast('Offline — your circle will sync when you’re back online.');
        onDone?.();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not create circle.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Button label="← Circles" variant="ghost" onPress={() => onDone?.()} style={{ alignSelf: 'flex-start' }} />
        <Text style={styles.title}>New Circle</Text>
        <Text style={styles.sub}>Create a savings circle, then invite members by email.</Text>
      </View>
      <View style={styles.list}>
        <Card>
          <Text style={styles.label}>Circle name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Office ajo"
            placeholderTextColor={p.textMuted}
          />
          <Text style={styles.label}>Contribution amount (₦)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="5000"
            placeholderTextColor={p.textMuted}
          />
          <AppSelect
            label="Frequency"
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            style={{ marginTop: spacing.sm }}
          />
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Saves every month on the 5th"
            placeholderTextColor={p.textMuted}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Create circle" onPress={() => void create()} loading={busy} style={{ marginTop: spacing.md }} />
        </Card>
        {toastNode}
      </View>
    </Screen>
  );
}

export function HelpScreen({ onBack }: { onBack: () => void }) {
  const { p, styles } = usePaletteStyles(makeStyles);
  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Button label="← Settings" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
        <Text style={styles.title}>Help & support</Text>
        <Text style={styles.sub}>Guides and contact for Turna.</Text>
      </View>
      <View style={styles.list}>
        <Card>
          <Text style={styles.section}>Contact</Text>
          <Text style={styles.hint}>
            Email support.turna@gmail.com — include your circle name and what you expected to
            happen. We reply by email only (no phone/SMS).
          </Text>
        </Card>
        <Card>
          <Text style={styles.section}>Common</Text>
          <Text style={styles.hint}>
            · Invite not received? Check Spam/Junk for mail from support.turna@gmail.com.{'\n'}
            · Contribution proof: paste the transfer note when you report a paid
            contribution.{'\n'}
            · Solo Ledger works offline and syncs when you're back online.
          </Text>
        </Card>
      </View>
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
    marginTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: p.text,
    letterSpacing: -0.4,
    marginTop: spacing.sm,
  },
  sub: {
    fontSize: 15,
    color: p.textMuted,
    marginTop: 4,
  },
  amount: {
    fontSize: typography.body,
    color: p.primary,
    fontWeight: '500',
    marginTop: 6,
  },
  amountNormal: {
    color: p.textMuted,
    fontWeight: '400',
  },
  desc: {
    fontSize: typography.caption,
    color: p.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    marginBottom: 0,
  },
  inviteCard: {
    marginBottom: 0,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: p.bg,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  inviteEmail: {
    fontSize: typography.caption + 1,
    color: p.text,
    fontWeight: '500',
  },
  inviteMeta: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: p.text,
  },
  meta: {
    fontSize: typography.caption,
    color: p.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
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
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '500',
    color: p.textMuted,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: p.text,
    fontSize: typography.body,
    backgroundColor: p.surface,
  },
  error: {
    color: p.error,
    fontSize: typography.caption,
    marginTop: spacing.sm,
  },
  memberControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: p.border,
  },
  posRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  posInput: {
    flex: 1,
    paddingVertical: 8,
  },
  posBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  settingsActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

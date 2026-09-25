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
import { Button } from '../components/Button';
import { AppSelect } from '../components/AppSelect';
import { Card, Badge } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../lib/format';

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
  owner_id?: string;
};

type Member = {
  id: string;
  status: string;
  role?: string;
  payout_position?: number | null;
  profiles?: { display_name?: string | null; email?: string | null } | null;
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
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('circles')
        .select('*')
        .eq('id', circleId)
        .maybeSingle();
      setCircle((data as Circle | null) ?? null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [circleId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen tone="cream">
        <View style={styles.header}>
          <Button label="← Circles" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
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
            tintColor={colors.primary}
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
              <Button label="Back" variant="ghost" onPress={onBack} style={{ flex: 1 }} />
            </View>
            <Card style={{ marginTop: spacing.md }}>
              <Text style={styles.section}>Overview</Text>
              <Text style={styles.hint}>
                Contribution schedule, cycle progress, and admin actions match the web circle
                detail page. Open Members for the roster and invite status.
              </Text>
            </Card>
          </>
        }
      />
    </Screen>
  );
}

export function CircleMembersScreen({
  circleId,
  onBack,
}: {
  circleId: string;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('circle_members')
        .select('id, status, role, payout_position, profiles(display_name, email)')
        .eq('circle_id', circleId)
        .order('payout_position', { ascending: true, nullsFirst: false })
        .limit(100);
      setRows((data ?? []) as unknown as Member[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [circleId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Button label="← Circle" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
        <Text style={styles.title}>Members</Text>
        <Text style={styles.sub}>Active roster and payout positions.</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(m) => m.id}
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
              <Text style={styles.hint}>No members yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.profiles?.display_name || item.profiles?.email || 'Member'}
                  </Text>
                  <Text style={styles.meta}>
                    {item.role ?? 'member'}
                    {item.payout_position != null ? ` · Pos ${item.payout_position}` : ''}
                  </Text>
                </View>
                <Badge
                  label={item.status}
                  tone={item.status === 'active' ? 'active' : item.status === 'invited' ? 'pending' : 'muted'}
                />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

export function NewCircleScreen({ onDone, onBack }: { onDone?: () => void; onBack?: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim() || !user) {
      setError('Enter a circle name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase.from('circles').insert({
        name: name.trim(),
        owner_id: user.id,
        status: 'draft',
        contribution_amount: Math.round(Number(amount.replace(/[^\d.]/g, '') || '0') * 100),
        currency: 'NGN',
        frequency,
        description: description.trim() || null,
      });
      if (e) throw e;
      onDone?.();
    } catch (e) {
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
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Contribution amount (₦)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="5000"
            placeholderTextColor={colors.muted}
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
            placeholderTextColor={colors.muted}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Create circle" onPress={() => void create()} loading={busy} style={{ marginTop: spacing.md }} />
        </Card>
      </View>
    </Screen>
  );
}

export function HelpScreen({ onBack }: { onBack: () => void }) {
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
            · Contribution proof: upload on the web circle Contributions tab.{'\n'}
            · Solo Ledger works offline and syncs when you're back online.
          </Text>
        </Card>
      </View>
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
    color: colors.forest,
    letterSpacing: -0.4,
    marginTop: spacing.sm,
  },
  sub: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
  },
  amount: {
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 6,
  },
  amountNormal: {
    color: colors.muted,
    fontWeight: '400',
  },
  desc: {
    fontSize: typography.caption,
    color: colors.muted,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 20,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.forest,
    fontSize: typography.body,
    backgroundColor: colors.white,
  },
  error: {
    color: colors.error,
    fontSize: typography.caption,
    marginTop: spacing.sm,
  },
});

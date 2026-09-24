import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { Card, Badge, Stat } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, typography } from '../theme';
import {
  getSoloLedger,
  putSoloLedger,
  queueEntry,
  queueContributor,
  takePending,
  clearPending,
  pullSoloFromServer,
  pushSoloToServer,
  shiftPeriod,
  periodKey,
  formatPeriodLabel,
  offlineUuid,
  type SoloLedger,
} from '../lib/solo-store';
import { supabase } from '../lib/supabase';

function money(n: number) {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(n / 100);
  } catch {
    return `₦${Math.round(n / 100)}`;
  }
}

export function SoloLedgerDetailScreen({
  ledgerId,
  onBack,
}: {
  ledgerId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [ledger, setLedger] = useState<SoloLedger | null>(null);
  const [period, setPeriod] = useState(periodKey());
  const [refreshing, setRefreshing] = useState(false);
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [sheet, setSheet] = useState<{ id: string; name: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const load = useCallback(async () => {
    const L = await getSoloLedger(ledgerId);
    setLedger(L);
    if (L) {
      try {
        await pullSoloFromServer();
        await pushSoloToServer();
        setLedger(await getSoloLedger(ledgerId));
      } catch {
        /* offline */
      }
    }
  }, [ledgerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    if (!ledger) return;
    const pending = await takePending(ledger.id);
    if (pending.entries.length) {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const rows = pending.entries.map((e) => ({
        ledger_id: ledger.id,
        contributor_id: e.contributor_id,
        user_id: uid,
        period: e.period,
        status: e.status,
        amount_paid: e.amount_paid,
        paid_on: e.paid_on,
        note: e.note,
        local_updated_at: e.local_updated_at,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('solo_entries').upsert(rows, {
        onConflict: 'contributor_id,period',
      });
      if (!error) {
        await clearPending(
          ledger.id,
          rows.map((r) => `${r.contributor_id}|${r.period}`),
          []
        );
      }
    }
  }

  const rows = useMemo(() => {
    if (!ledger) return [];
    return ledger.contributors
      .filter((c) => !c.archived)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        c,
        entry:
          ledger.entries.find(
            (e) => e.contributor_id === c.id && e.period === period
          ) ?? null,
      }));
  }, [ledger, period]);

  const stats = useMemo(() => {
    let collected = 0;
    let expected = 0;
    let paid = 0;
    rows.forEach(({ c, entry }) => {
      expected += c.expected_amount || ledger?.default_amount || 0;
      if (entry && entry.status !== 'unpaid') {
        collected += entry.amount_paid;
        if (entry.status === 'paid') paid += 1;
      }
    });
    return { collected, expected, paid };
  }, [rows, ledger?.default_amount]);

  async function markPaid(contributorId: string) {
    if (!ledger) return;
    const c = ledger.contributors.find((x) => x.id === contributorId);
    const expected = c?.expected_amount || ledger.default_amount;
    setSheet({ id: contributorId, name: c?.name ?? 'Contributor' });
    setAmount(String(expected / 100));
  }

  async function addPerson() {
    if (!ledger || !newName.trim()) return;
    const custom = Number(newAmount.replace(/[^\d.]/g, '') || '0');
    const expected = custom > 0 ? Math.round(custom * 100) : ledger.default_amount;
    const c = {
      id: offlineUuid(),
      ledger_id: ledger.id,
      name: newName.trim(),
      phone: null,
      note: null,
      expected_amount: expected,
      sort_order: ledger.contributors.length + 1,
      archived: false,
      local_updated_at: new Date().toISOString(),
    };
    await queueContributor(ledger.id, c);
    setLedger(await getSoloLedger(ledger.id));
    setNewName('');
    setNewAmount('');
    setShowAdd(false);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { data } = await supabase
        .from('solo_contributors')
        .insert({
          ledger_id: ledger.id,
          user_id: uid,
          name: c.name,
          expected_amount: c.expected_amount,
          sort_order: c.sort_order,
          local_updated_at: c.local_updated_at,
        })
        .select('id')
        .single();
      if (data) {
        // remap local id
        const L = await getSoloLedger(ledger.id);
        if (L) {
          L.contributors = L.contributors.map((x) =>
            x.id === c.id ? { ...x, id: data.id } : x
          );
          L.entries = L.entries.map((e) =>
            e.contributor_id === c.id ? { ...e, contributor_id: data.id } : e
          );
          L.pendingContributors = L.pendingContributors.filter(
            (x) => x.id !== c.id
          );
          await putSoloLedger(L);
          setLedger(L);
        }
      }
    } catch {
      /* offline */
    }
  }

  async function savePartial(status: 'paid' | 'partial' | 'unpaid') {
    if (!ledger || !sheet) return;
    const paid = Number(amount.replace(/[^\d.]/g, '') || '0');
    const entry = {
      contributor_id: sheet.id,
      ledger_id: ledger.id,
      period,
      status,
      amount_paid:
        status === 'unpaid' ? 0 : Math.round(paid * 100),
      paid_on: status === 'unpaid' ? null : new Date().toISOString().slice(0, 10),
      note: null,
      local_updated_at: new Date().toISOString(),
    };
    await queueEntry(ledger.id, entry);
    setLedger(await getSoloLedger(ledger.id));
    await sync();
    setSheet(null);
    setAmount('');
  }

  if (!ledger) {
    return (
      <Screen tone="cream">
        <View style={styles.header}>
          <Button label="Back" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
          <Text style={styles.title}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Button label="← All solo ledgers" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
        <View style={styles.periodRow}>
          <Button label="‹" variant="outline" onPress={() => setPeriod(shiftPeriod(period, -1))} style={styles.periodBtn} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.periodLabel}>{formatPeriodLabel(period)}</Text>
            <Pressable onPress={() => setPeriod(periodKey())}>
              <Text style={styles.thisMonth}>This month</Text>
            </Pressable>
          </View>
          <Button label="›" variant="outline" onPress={() => setPeriod(shiftPeriod(period, 1))} style={styles.periodBtn} />
        </View>
        <Text style={styles.ledgerName}>{ledger.name}</Text>
        <Badge label="Solo" tone="active" style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        {ledger.description ? (
          <Text style={styles.meta}>{ledger.description}</Text>
        ) : null}
        <Text style={styles.periodHint}>Current view: {formatPeriodLabel(period)}</Text>
        <View style={styles.stats}>
          <Stat label="Collected" value={money(stats.collected)} />
          <View style={{ width: spacing.sm }} />
          <Stat label="Paid" value={`${stats.paid}/${rows.length}`} />
        </View>
        <Button
          label={showAdd ? 'Close' : 'Add person'}
          variant={showAdd ? 'outline' : 'primary'}
          onPress={() => setShowAdd((v) => !v)}
          style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
        />
      </View>

      {showAdd && (
        <Card style={{ marginHorizontal: spacing.lg }}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Contributor name"
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={[styles.input, { marginTop: spacing.sm }]}
            value={newAmount}
            onChangeText={setNewAmount}
            keyboardType="numeric"
            placeholder={`Amount (₦) — default ${money(ledger.default_amount)}`}
            placeholderTextColor={colors.muted}
          />
          <Button label="Add" onPress={addPerson} disabled={!newName.trim()} style={{ marginTop: spacing.sm }} />
        </Card>
      )}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.c.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyBody}>
              No contributors yet. Add people who pay you each month.
            </Text>
          </Card>
        }
        renderItem={({ item }) => {
          const status = item.entry?.status ?? 'unpaid';
          return (
            <Card style={styles.card}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.c.name}</Text>
                  <Text style={styles.meta}>
                    Due {money(item.c.expected_amount || ledger.default_amount)} ·{' '}
                    paid {money(item.entry?.amount_paid ?? 0)}
                  </Text>
                </View>
                <Badge
                  label={status}
                  tone={status === 'paid' ? 'active' : status === 'partial' ? 'pending' : 'muted'}
                />
              </View>
              <View style={styles.actions}>
                <Button
                  label="Mark paid"
                  onPress={() => void markPaid(item.c.id)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Details"
                  variant="outline"
                  onPress={() => {
                    setSheet({ id: item.c.id, name: item.c.name });
                    setAmount(String((item.entry?.amount_paid || item.c.expected_amount || ledger.default_amount) / 100));
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          );
        }}
      />

      {sheet && (
        <View style={styles.overlay}>
          <Card style={styles.sheet}>
            <Text style={styles.sheetTitle}>{sheet.name}</Text>
            <Text style={styles.meta}>{formatPeriodLabel(period)}</Text>
            <Text style={styles.meta}>
              Due: {money(rows.find((r) => r.c.id === sheet.id)?.c.expected_amount || ledger.default_amount)}
            </Text>
            <TextInput
              style={[styles.input, { marginTop: spacing.sm }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Amount paid (₦)"
              placeholderTextColor={colors.muted}
            />
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Button label="Mark paid" onPress={() => void savePartial('paid')} />
              <Button label="Partial" variant="outline" onPress={() => void savePartial('partial')} />
              <Button label="Unpaid" variant="ghost" onPress={() => void savePartial('unpaid')} />
              <Button label="Cancel" variant="outline" onPress={() => setSheet(null)} />
            </View>
          </Card>
        </View>
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
    marginTop: spacing.sm,
  },
  ledgerName: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.forest,
    marginTop: spacing.md,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  periodBtn: {
    minWidth: 48,
    paddingHorizontal: spacing.sm,
  },
  periodLabel: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.forest,
  },
  thisMonth: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  periodHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.md,
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  card: { marginBottom: 0 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyBody: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,22,40,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    margin: 0,
  },
  sheetTitle: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.forest,
  },
});

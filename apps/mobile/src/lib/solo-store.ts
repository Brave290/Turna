/** Local Solo Ledger store (AsyncStorage) + sync queue. */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoloContributor = {
  id: string;
  ledger_id: string;
  name: string;
  phone?: string | null;
  note?: string | null;
  expected_amount: number;
  sort_order: number;
  archived?: boolean;
  local_updated_at: string;
};

export type SoloEntry = {
  contributor_id: string;
  ledger_id: string;
  period: string;
  status: string;
  amount_paid: number;
  paid_on: string | null;
  note: string | null;
  local_updated_at: string;
};

export type SoloLedger = {
  id: string;
  name: string;
  currency: string;
  default_amount: number;
  description?: string | null;
  contributors: SoloContributor[];
  entries: SoloEntry[];
  pendingEntries: SoloEntry[];
  pendingContributors: SoloContributor[];
  updated_at: string;
};

const KEY = 'turna.solo.mobile.v1';

/** Offline IDs must be valid UUIDs for DB uuid columns. */
export function offlineUuid(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function readAll(): Promise<Record<string, SoloLedger>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, SoloLedger>) : {};
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, SoloLedger>) {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function getSoloLedgers(): Promise<SoloLedger[]> {
  const map = await readAll();
  return Object.values(map).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
}

export async function getSoloLedger(id: string): Promise<SoloLedger | null> {
  return (await readAll())[id] ?? null;
}

export async function putSoloLedger(ledger: SoloLedger) {
  const map = await readAll();
  map[ledger.id] = { ...ledger, updated_at: new Date().toISOString() };
  await writeAll(map);
}

export async function deleteSoloLedger(id: string) {
  const map = await readAll();
  delete map[id];
  await writeAll(map);
  try {
    await import('./supabase').then(({ supabase }) =>
      supabase.from('solo_ledgers').delete().eq('id', id)
    );
  } catch {
    /* offline — local delete is enough */
  }
}

export async function queueEntry(ledgerId: string, entry: SoloEntry) {
  const map = await readAll();
  const L = map[ledgerId];
  if (!L) return;
  const key = `${entry.contributor_id}|${entry.period}`;
  const idx = L.entries.findIndex(
    (e) => `${e.contributor_id}|${e.period}` === key
  );
  if (idx >= 0) L.entries[idx] = entry;
  else L.entries.push(entry);
  L.pendingEntries = L.pendingEntries.filter(
    (e) => `${e.contributor_id}|${e.period}` !== key
  );
  L.pendingEntries.push(entry);
  L.updated_at = new Date().toISOString();
  await writeAll(map);
}

export async function queueContributor(ledgerId: string, c: SoloContributor) {
  const map = await readAll();
  const L = map[ledgerId];
  if (!L) return;
  const idx = L.contributors.findIndex((x) => x.id === c.id);
  if (idx >= 0) L.contributors[idx] = c;
  else L.contributors.push(c);
  L.pendingContributors = L.pendingContributors.filter((x) => x.id !== c.id);
  L.pendingContributors.push(c);
  L.updated_at = new Date().toISOString();
  await writeAll(map);
}

export async function takePending(ledgerId: string) {
  const L = (await readAll())[ledgerId];
  if (!L) return { entries: [] as SoloEntry[], contributors: [] as SoloContributor[] };
  return {
    entries: [...L.pendingEntries],
    contributors: [...L.pendingContributors],
  };
}

export async function clearPending(
  ledgerId: string,
  entryKeys: string[],
  contributorIds: string[]
) {
  const map = await readAll();
  const L = map[ledgerId];
  if (!L) return;
  L.pendingEntries = L.pendingEntries.filter(
    (e) => !entryKeys.includes(`${e.contributor_id}|${e.period}`)
  );
  L.pendingContributors = L.pendingContributors.filter(
    (c) => !contributorIds.includes(c.id)
  );
  await writeAll(map);
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return periodKey(d);
}

export function periodKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });
}

/** Pull remote solo data into local cache (login / foreground). */
export async function pullSoloFromServer(): Promise<void> {
  const { supabase } = await import('../lib/supabase');
  const { data: ledgers } = await supabase
    .from('solo_ledgers')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (!ledgers) return;
  const map = await readAll();
  for (const l of ledgers as {
    id: string;
    name: string;
    currency: string;
    default_amount: number;
    description: string | null;
    updated_at: string;
  }[]) {
    const [{ data: cs }, { data: es }] = await Promise.all([
      supabase.from('solo_contributors').select('*').eq('ledger_id', l.id),
      supabase.from('solo_entries').select('*').eq('ledger_id', l.id),
    ]);
    const local = map[l.id];
    const pendingEntryKeys = new Set(
      (local?.pendingEntries ?? []).map((e) => `${e.contributor_id}|${e.period}`)
    );
    const pendingContributorIds = new Set(
      (local?.pendingContributors ?? []).map((c) => c.id)
    );
    const serverContributors = (cs ?? []) as SoloContributor[];
    const contributors = serverContributors.filter(
      (c) => !pendingContributorIds.has(c.id)
    );
    for (const p of local?.pendingContributors ?? []) {
      if (!contributors.some((c) => c.id === p.id)) {
        contributors.push(p);
      }
    }
    const entries = ((es ?? []) as SoloEntry[]).map((e) => {
      const key = `${e.contributor_id}|${e.period}`;
      const hit = local?.entries.find(
        (x) => `${x.contributor_id}|${x.period}` === key
      );
      if (pendingEntryKeys.has(key) && hit) return hit;
      return {
        ...e,
        local_updated_at: e.local_updated_at || new Date().toISOString(),
      };
    });
    for (const p of local?.pendingEntries ?? []) {
      const key = `${p.contributor_id}|${p.period}`;
      if (!entries.some((e) => `${e.contributor_id}|${e.period}` === key)) {
        entries.push(p);
      }
    }
    map[l.id] = {
      id: l.id,
      name: l.name,
      currency: l.currency,
      default_amount: l.default_amount,
      description: l.description,
      contributors,
      entries,
      pendingEntries: local?.pendingEntries ?? [],
      pendingContributors: local?.pendingContributors ?? [],
      updated_at: new Date().toISOString(),
    };
  }
  await writeAll(map);
}

/** Push queued offline mutations to Supabase. */
export async function pushSoloToServer(): Promise<number> {
  const { supabase } = await import('../lib/supabase');
  const map = await readAll();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return 0;
  let synced = 0;
  for (const L of Object.values(map)) {
    if (L.pendingEntries.length) {
      const rows = L.pendingEntries.map((e) => ({
        ledger_id: L.id,
        contributor_id: e.contributor_id,
        user_id: userId,
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
        synced += rows.length;
        await clearPending(
          L.id,
          rows.map((r) => `${r.contributor_id}|${r.period}`),
          []
        );
      }
    }
    if (L.pendingContributors.length) {
      for (const c of L.pendingContributors) {
        const { error } = await supabase.from('solo_contributors').insert({
          id: c.id.startsWith('local-') ? undefined : c.id,
          ledger_id: L.id,
          user_id: userId,
          name: c.name,
          phone: c.phone,
          note: c.note,
          expected_amount: c.expected_amount,
          sort_order: c.sort_order,
          local_updated_at: c.local_updated_at,
        });
        if (!error) {
          await clearPending(L.id, [], [c.id]);
          synced += 1;
        }
      }
    }
  }
  return synced;
}

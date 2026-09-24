/** Local-first Solo Ledger cache (browser localStorage). */
export type CachedContributor = {
  id: string;
  name: string;
  phone?: string | null;
  note?: string | null;
  expected_amount: number;
  sort_order: number;
  archived?: boolean;
  local_updated_at: string;
};

export type CachedEntry = {
  contributor_id: string;
  period: string;
  status: string;
  amount_paid: number;
  paid_on: string | null;
  note: string | null;
  local_updated_at: string;
};

export type CachedLedger = {
  id: string;
  name: string;
  currency: string;
  default_amount: number;
  description?: string | null;
  contributors: CachedContributor[];
  entries: CachedEntry[];
  pendingEntries: CachedEntry[];
  pendingContributors: CachedContributor[];
  updated_at: string;
};

const KEY = 'turna.solo.v1';

/** Stable offline IDs must be valid UUIDs (DB columns are uuid). */
export function offlineUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readAll(): Record<string, CachedLedger> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}') as Record<
      string,
      CachedLedger
    >;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, CachedLedger>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

export function getCachedLedger(id: string): CachedLedger | null {
  return readAll()[id] ?? null;
}

export function putCachedLedger(ledger: CachedLedger) {
  const map = readAll();
  map[ledger.id] = { ...ledger, updated_at: new Date().toISOString() };
  writeAll(map);
}

export function queueEntry(id: string, entry: CachedEntry) {
  const map = readAll();
  const L = map[id];
  if (!L) return;
  const idx = L.entries.findIndex(
    (e) => e.contributor_id === entry.contributor_id && e.period === entry.period
  );
  if (idx >= 0) L.entries[idx] = entry;
  else L.entries.push(entry);
  L.pendingEntries = L.pendingEntries.filter(
    (e) => !(e.contributor_id === entry.contributor_id && e.period === entry.period)
  );
  L.pendingEntries.push(entry);
  L.updated_at = new Date().toISOString();
  writeAll(map);
}

export function queueContributor(id: string, c: CachedContributor) {
  const map = readAll();
  const L = map[id];
  if (!L) return;
  const idx = L.contributors.findIndex((x) => x.id === c.id);
  if (idx >= 0) L.contributors[idx] = c;
  else L.contributors.push(c);
  L.pendingContributors = L.pendingContributors.filter((x) => x.id !== c.id);
  L.pendingContributors.push(c);
  L.updated_at = new Date().toISOString();
  writeAll(map);
}

export function takePending(id: string): {
  entries: CachedEntry[];
  contributors: CachedContributor[];
} {
  const L = readAll()[id];
  if (!L) return { entries: [], contributors: [] };
  return {
    entries: [...L.pendingEntries],
    contributors: [...L.pendingContributors],
  };
}

export function clearPending(id: string, entryKeys: string[], contributorIds: string[]) {
  const map = readAll();
  const L = map[id];
  if (!L) return;
  L.pendingEntries = L.pendingEntries.filter(
    (e) => !entryKeys.includes(`${e.contributor_id}|${e.period}`)
  );
  L.pendingContributors = L.pendingContributors.filter(
    (c) => !contributorIds.includes(c.id)
  );
  writeAll(map);
}

export function mergeServerIntoCache(
  id: string,
  server: {
    name: string;
    currency: string;
    default_amount: number;
    description?: string | null;
    contributors: Omit<CachedContributor, 'local_updated_at'>[];
    entries: (Omit<CachedEntry, 'local_updated_at'> & { local_updated_at?: string })[];
  }
): CachedLedger {
  const map = readAll();
  const local = map[id];
  const localEntryMap = new Map(
    (local?.entries ?? []).map((e) => [`${e.contributor_id}|${e.period}`, e])
  );
  const pendingKeys = new Set(
    (local?.pendingEntries ?? []).map((e) => `${e.contributor_id}|${e.period}`)
  );

  const mergedEntries: CachedEntry[] = server.entries.map((e) => {
    const key = `${e.contributor_id}|${e.period}`;
    const localHit = localEntryMap.get(key);
    if (pendingKeys.has(key) && localHit) return localHit;
    if (
      localHit &&
      e.local_updated_at &&
      new Date(localHit.local_updated_at) > new Date(e.local_updated_at)
    ) {
      return localHit;
    }
    return {
      contributor_id: e.contributor_id,
      period: e.period,
      status: e.status,
      amount_paid: e.amount_paid,
      paid_on: e.paid_on,
      note: e.note,
      local_updated_at: e.local_updated_at ?? new Date().toISOString(),
    };
  });

  // keep pending local entries not yet on server
  for (const p of local?.pendingEntries ?? []) {
    const key = `${p.contributor_id}|${p.period}`;
    if (!mergedEntries.some((e) => `${e.contributor_id}|${e.period}` === key)) {
      mergedEntries.push(p);
    }
  }

  const localCMap = new Map((local?.contributors ?? []).map((c) => [c.id, c]));
  const pendingC = new Set((local?.pendingContributors ?? []).map((c) => c.id));
  const mergedContributors: CachedContributor[] = server.contributors.map((c) => {
    const hit = localCMap.get(c.id);
    if (pendingC.has(c.id) && hit) return hit;
    return {
      ...c,
      local_updated_at: hit?.local_updated_at ?? new Date().toISOString(),
    };
  });
  for (const p of local?.pendingContributors ?? []) {
    if (!mergedContributors.some((c) => c.id === p.id)) mergedContributors.push(p);
  }

  const merged: CachedLedger = {
    id,
    name: server.name,
    currency: server.currency,
    default_amount: server.default_amount,
    description: server.description ?? null,
    contributors: mergedContributors,
    entries: mergedEntries,
    pendingEntries: local?.pendingEntries ?? [],
    pendingContributors: local?.pendingContributors ?? [],
    updated_at: new Date().toISOString(),
  };
  map[id] = merged;
  writeAll(map);
  return merged;
}

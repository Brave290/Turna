/**
 * Local Debts store (AsyncStorage, one namespace per user) — fully offline,
 * no mutation queue: every row lives on device only.
 *
 * Sync-ready shape: all writes go through `upsertDebt`/`deleteDebt`, which
 * stamp `updated_at`, so a future server sync can diff by timestamp (pull →
 * merge newer rows → push changed ones) without touching call sites.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineUuid } from './solo-store';

export type DebtKind = 'owed' | 'owe';

export type Debt = {
  id: string;
  kind: DebtKind;
  /** Person the money is owed to / borrowed from. */
  name: string;
  /** Kobo (integer) — same unit as formatCurrency. */
  amount: number;
  /** ISO date the money was collected / borrowed. */
  date: string;
  note?: string | null;
  /** Settled (owed) or paid (owe). */
  settled: boolean;
  created_at: string;
  updated_at: string;
};

export type DebtInput = {
  kind: DebtKind;
  name: string;
  amount: number;
  date: string;
  note?: string | null;
};

const KEY_PREFIX = 'turna.debts.v1:';

function keyFor(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

/** Cache key for the last-synced line (local save time until server sync). */
export function debtsCacheKey(userId: string) {
  return `debts:${userId}`;
}

async function readAll(userId: string): Promise<Debt[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const rows = JSON.parse(raw) as Debt[];
    if (!Array.isArray(rows)) return [];
    return rows.filter((r) => r && typeof r.id === 'string');
  } catch {
    return [];
  }
}

async function writeAll(userId: string, rows: Debt[]) {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(rows));
}

export async function listDebts(userId: string): Promise<Debt[]> {
  const rows = await readAll(userId);
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDebt(userId: string, id: string): Promise<Debt | null> {
  const rows = await readAll(userId);
  return rows.find((r) => r.id === id) ?? null;
}

export async function upsertDebt(
  userId: string,
  input: DebtInput & { id?: string }
): Promise<Debt> {
  const rows = await readAll(userId);
  const now = new Date().toISOString();
  const id = input.id ?? offlineUuid();
  const idx = rows.findIndex((r) => r.id === id);
  const existing = idx >= 0 ? rows[idx] : null;
  const next: Debt = {
    id,
    kind: input.kind,
    name: input.name.trim(),
    amount: Math.max(0, Math.round(input.amount)),
    date: input.date,
    note: input.note?.trim() ? input.note.trim() : null,
    settled: existing?.settled ?? false,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  await writeAll(userId, rows);
  return next;
}

export async function setDebtSettled(
  userId: string,
  id: string,
  settled: boolean
): Promise<void> {
  const rows = await readAll(userId);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], settled, updated_at: new Date().toISOString() };
  await writeAll(userId, rows);
}

export async function deleteDebt(userId: string, id: string): Promise<void> {
  const rows = await readAll(userId);
  await writeAll(
    userId,
    rows.filter((r) => r.id !== id)
  );
}

export async function clearDebts(userId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(userId));
}

export type DebtTotals = {
  owedTotal: number;
  oweTotal: number;
  owedPeople: number;
  owePeople: number;
  /** + when owed exceeds owe, − otherwise (kobo). */
  net: number;
};

function people(rows: Debt[]): number {
  const names = new Set(
    rows.map((r) => r.name.trim().toLowerCase()).filter(Boolean)
  );
  return names.size;
}

export function debtTotals(rows: Debt[]): DebtTotals {
  const owed = rows.filter((r) => r.kind === 'owed' && !r.settled);
  const owe = rows.filter((r) => r.kind === 'owe' && !r.settled);
  const owedTotal = owed.reduce((s, r) => s + r.amount, 0);
  const oweTotal = owe.reduce((s, r) => s + r.amount, 0);
  return {
    owedTotal,
    oweTotal,
    owedPeople: people(owed),
    owePeople: people(owe),
    net: owedTotal - oweTotal,
  };
}

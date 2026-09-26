/**
 * Offline layer — read cache + mutation queue.
 * Everything works offline: reads hydrate from cache first, failed writes
 * are queued and drained (in order) whenever the app gets connectivity back.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CACHE_PREFIX = 'turna:cache:';
const QUEUE_KEY = 'turna:opqueue:v1';

/* ── Read cache ── */

export async function cacheSet(key: string, data: unknown): Promise<void> {
  try {
    const now = Date.now();
    // `syncedAt` is when this payload last came from the server — screens show
    // it as "Last synced: …". `t` is kept as an alias for older readers.
    await AsyncStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ t: now, syncedAt: now, data })
    );
  } catch {
    /* cache is best-effort */
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as { data: T };
    return env.data;
  } catch {
    return null;
  }
}

/** Epoch ms of the last successful sync for `key` (null when never synced). */
export async function cacheSyncedAt(key: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as { syncedAt?: number; t?: number };
    const at = env.syncedAt ?? env.t;
    return typeof at === 'number' && Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

/* ── Mutation queue ── */

export type QueuedOp = {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  match?: Record<string, string | number | boolean>;
  payload?: Record<string, unknown>;
  ts: string;
};

export async function readQueue(): Promise<QueuedOp[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const q = JSON.parse(raw) as QueuedOp[];
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

export async function enqueueOp(
  op: Omit<QueuedOp, 'id' | 'ts'>
): Promise<void> {
  const q = await readQueue();
  q.push({
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

/** True when the failure is connectivity (offline) rather than validation/RLS. */
export function isOfflineError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return /network request failed|failed to fetch|fetch failed|networkerror|offline/i.test(
    msg
  );
}

/** Apply queued ops in order; keep failures for the next drain. */
export async function drainQueue(): Promise<{ synced: number; failed: number }> {
  const q = await readQueue();
  if (q.length === 0) return { synced: 0, failed: 0 };

  const remain: QueuedOp[] = [];
  let synced = 0;

  for (const op of [...q].sort((a, b) => a.ts.localeCompare(b.ts))) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let builder: any = supabase.from(op.table);
      if (op.action === 'insert') {
        builder = builder.insert(op.payload);
      } else if (op.action === 'update') {
        builder = builder.update(op.payload);
      } else {
        builder = builder.delete();
      }
      for (const [k, v] of Object.entries(op.match ?? {})) {
        builder = builder.eq(k, v);
      }
      const { error } = await builder;
      if (error) remain.push(op);
      else synced += 1;
    } catch {
      remain.push(op);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remain));
  return { synced, failed: remain.length };
}

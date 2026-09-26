/**
 * `user_preferences` cache + change bus.
 *
 * Settings saves go through here so the theme/motion contexts re-render live
 * without every screen re-reading the table. Hydrates from local storage first
 * (offline-friendly), then the account row (same columns as web settings).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { enqueueOp, isOfflineError } from './offline';

export type Prefs = Record<string, unknown>;

const CACHE_KEY = 'turna:prefs:v1';

let memory: Prefs | null = null;
let loadedFor: string | null | undefined = undefined;
const listeners = new Set<(p: Prefs) => void>();

function emit(next: Prefs) {
  memory = next;
  listeners.forEach((cb) => cb(next));
}

async function persistCache(p: Prefs) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(p));
  } catch {
    /* cache is best-effort */
  }
}

/** Current preferences (empty until `loadPrefs` resolves its local pass). */
export function getPrefs(): Prefs {
  return memory ?? {};
}

/** Subscribe to preference changes; returns an unsubscribe function. */
export function subscribePrefs(cb: (p: Prefs) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Read local cache once, then the account row. Safe to call repeatedly. */
export async function loadPrefs(userId: string | null | undefined): Promise<void> {
  if (memory === null) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      emit(raw ? (JSON.parse(raw) as Prefs) : {});
    } catch {
      if (memory === null) emit({});
    }
  }
  if (loadedFor === userId) return;
  loadedFor = userId;
  if (!userId) return;
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      const next = { ...(memory ?? {}), ...(data as Prefs) };
      emit(next);
      void persistCache(next);
    }
  } catch {
    /* offline — keep whatever the cache says */
  }
}

export type SavePrefsResult = 'saved' | 'offline' | 'error';

/**
 * Optimistic local update + remote upsert (queued when offline).
 * Listeners fire immediately, so toggles apply before the network settles.
 */
export async function savePrefs(
  userId: string | null | undefined,
  patch: Prefs
): Promise<SavePrefsResult> {
  const next = { ...(memory ?? {}), ...patch };
  emit(next);
  void persistCache(next);
  if (!userId) return 'saved';
  const payload = { ...patch, updated_at: new Date().toISOString() };
  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, ...payload } as never);
    if (error) throw new Error(error.message);
    return 'saved';
  } catch (e) {
    if (isOfflineError(e)) {
      await enqueueOp({
        table: 'user_preferences',
        action: 'update',
        match: { user_id: userId },
        payload,
      });
      return 'offline';
    }
    return 'error';
  }
}

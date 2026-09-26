/** First-install and last-update timestamps, persisted locally. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCAL_VERSION_NAME } from '../generated/version';

const KEY = 'turna.appmeta.v1';

type AppMeta = {
  installedAt: string;
  updatedAt: string;
  version: string;
};

export async function getAppMeta(): Promise<AppMeta> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const meta = JSON.parse(raw) as AppMeta;
      if (meta.version !== LOCAL_VERSION_NAME) {
        const next: AppMeta = { ...meta, updatedAt: new Date().toISOString(), version: LOCAL_VERSION_NAME };
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }
      return meta;
    }
  } catch {
    /* fall through to fresh meta */
  }
  const now = new Date().toISOString();
  const meta: AppMeta = { installedAt: now, updatedAt: now, version: LOCAL_VERSION_NAME };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* best effort */
  }
  return meta;
}

export function formatStamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { colors, spacing, typography } from '../theme';
import { APP_API_URL } from '../lib/supabase';

type VersionInfo = {
  versionCode: number;
  versionName: string;
  minSupportedCode: number;
  downloadUrl: string;
  notes: string;
};

const LOCAL_VERSION_CODE = 2;
const DISMISS_KEY = 'turna.mobile.update.dismissals';
const REMIND_MS = 1000 * 60 * 60 * 12;

async function getDismissCount(): Promise<number> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage'))
      .default;
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    if (!raw) return 0;
    const p = JSON.parse(raw) as { count: number; last: number };
    const stale = Date.now() - (p.last || 0) > REMIND_MS;
    if (stale && (p.count || 0) < 2) return 0;
    return p.count || 0;
  } catch {
    return 0;
  }
}

async function setDismissCount(count: number) {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage'))
      .default;
    await AsyncStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ count, last: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Update popup: fetch /api/app/version on login.
 * Policy: Later allowed twice; third notification is forced (no dismiss).
 */
export function UpdatePopup() {
  const { status } = useAuth();
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [forced, setForced] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== 'signedIn') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${APP_API_URL}/api/app/version`);
        if (!res.ok) return;
        const data = (await res.json()) as VersionInfo;
        if (cancelled || data.versionCode <= LOCAL_VERSION_CODE) return;
        const count = await getDismissCount();
        if (count === 0 || count >= 2) {
          setDismissCount(count);
          setForced(count >= 2);
          setInfo(data);
        }
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function later() {
    if (forced) return;
    const next = dismissCount + 1;
    await setDismissCount(next);
    setDismissCount(next);
    setInfo(null);
  }

  async function download() {
    if (!info) return;
    setBusy(true);
    try {
      await Linking.openURL(info.downloadUrl);
    } finally {
      setBusy(false);
    }
  }

  if (!info) return null;

  return (
    <Modal transparent animationType="fade" visible={!!info} onRequestClose={() => void later()}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {forced ? 'Update required' : 'Update ready'}
          </Text>
          <Text style={styles.version}>
            v{info.versionName} · build {info.versionCode}
          </Text>
          <Text style={styles.body}>
            {info.notes || 'Bug fixes and improvements. Download the latest Turna app.'}
            {forced ? ' This update is required to continue.' : ''}
          </Text>
          <Button label={busy ? 'Opening…' : 'Download update'} onPress={download} disabled={busy} />
          {!forced && (
            <Button label="Later" variant="ghost" onPress={() => void later()} style={{ marginTop: spacing.sm }} />
          )}
          <Text style={styles.hint}>Installs over your app — data stays.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,22,40,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.forest,
  },
  version: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
  },
  body: {
    fontSize: typography.body,
    color: colors.muted,
    lineHeight: 22,
    marginVertical: spacing.md,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

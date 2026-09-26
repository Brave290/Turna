import React, { useCallback, useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { typography, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';
import { cacheSyncedAt } from '../lib/offline';

function formatSynced(at: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - at);
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  const d = new Date(at);
  const time = d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  const yesterday = new Date(now - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return `${d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} ${time}`;
}

/**
 * Slim "Last synced: …" line driven by the screen's cache key — shows how old
 * the data on screen really is (stays proudly stale while offline).
 */
export function SyncedLine({
  cacheKey,
  style,
}: {
  cacheKey: string | null;
  style?: StyleProp<TextStyle>;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const [at, setAt] = useState<number | null>(null);

  const read = useCallback(() => {
    if (!cacheKey) {
      setAt(null);
      return;
    }
    void cacheSyncedAt(cacheKey).then((v) => setAt(v));
  }, [cacheKey]);

  useEffect(() => {
    read();
    const id = setInterval(read, 30_000);
    return () => clearInterval(id);
  }, [read]);

  if (!at) return null;

  return (
    <View style={[styles.wrap, style]}>
      <RefreshCw size={11} color={p.textMuted} strokeWidth={2} />
      <Text style={styles.text}>Last synced: {formatSynced(at)}</Text>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
    },
    text: {
      fontSize: 11,
      color: p.textMuted,
      letterSpacing: 0.1,
      fontWeight: '500',
    },
  });

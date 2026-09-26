import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

/**
 * Centered spinner over a soft blurred veil — used while a screen loads so
 * the content underneath reads as "blurred until ready".
 */
export function LoadingOverlay({ label }: { label?: string }) {
  const { p, styles } = usePaletteStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.veil} />
      <View style={styles.center}>
        <ActivityIndicator size="large" color={p.primary} />
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: p.bg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: p.bg,
    opacity: 0.72,
  },
  center: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.caption,
    color: p.textMuted,
    fontWeight: '500',
  },
});

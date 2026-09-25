import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

/**
 * Centered spinner over a soft blurred veil — used while a screen loads so
 * the content underneath reads as "blurred until ready".
 */
export function LoadingOverlay({ label }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.veil} />
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.cream,
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
    backgroundColor: 'rgba(244,247,251,0.72)',
  },
  center: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.caption,
    color: colors.muted,
    fontWeight: '500',
  },
});

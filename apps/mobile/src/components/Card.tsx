import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export type BadgeTone = 'active' | 'pending' | 'muted' | 'error';

export function Badge({
  label,
  tone = 'muted',
  style,
}: {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.badge, badgeTone[tone], style]}>
      <Text style={[styles.badgeText, badgeTextTone[tone]]}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minWidth: 0,
  },
  statValue: {
    color: colors.forest,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
});

const badgeTone = StyleSheet.create({
  active: { backgroundColor: 'rgba(0,122,101,0.12)' },
  pending: { backgroundColor: 'rgba(138,90,0,0.12)' },
  muted: { backgroundColor: colors.cream },
  error: { backgroundColor: 'rgba(180,35,59,0.12)' },
});

const badgeTextTone = StyleSheet.create({
  active: { color: colors.primary },
  pending: { color: colors.warning },
  muted: { color: colors.muted },
  error: { color: colors.error },
});

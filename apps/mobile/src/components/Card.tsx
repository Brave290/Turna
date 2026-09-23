import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({children, style}: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type BadgeTone = 'active' | 'pending' | 'muted' | 'error';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

const toneStyles: Record<
  BadgeTone,
  {container: Record<string, unknown>; label: Record<string, unknown>}
> = {
  active: {
    container: {backgroundColor: 'rgba(0, 168, 120, 0.14)'},
    label: {color: colors.primary},
  },
  pending: {
    container: {backgroundColor: 'rgba(217, 164, 65, 0.16)'},
    label: {color: colors.warning},
  },
  muted: {
    container: {backgroundColor: colors.border},
    label: {color: colors.forest},
  },
  error: {
    container: {backgroundColor: 'rgba(217, 74, 74, 0.14)'},
    label: {color: colors.error},
  },
};

export function Badge({label, tone = 'muted', style}: BadgeProps) {
  const tones = toneStyles[tone];
  return (
    <View style={[styles.badge, tones.container, style] as StyleProp<ViewStyle>}>
      <Text style={[styles.badgeLabel, tones.label]}>{label}</Text>
    </View>
  );
}

type StatProps = {
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
};

export function Stat({label, value, style}: StatProps) {
  return (
    <View style={[styles.stat, style]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeLabel: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statValue: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.forest,
  },
  statLabel: {
    marginTop: 4,
    fontSize: typography.caption,
    color: colors.muted,
  },
});

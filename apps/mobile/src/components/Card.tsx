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

export type BadgeTone = 'active' | 'pending' | 'muted' | 'error' | 'completed';

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

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<any>;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHead}>
        <Text style={styles.statLabel}>{label}</Text>
        {Icon ? (
          <View style={styles.statIcon}>
            <Icon size={16} color={colors.primary} strokeWidth={2} />
          </View>
        ) : null}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
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
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
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
    flex: 1,
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});

const badgeTone = StyleSheet.create({
  active: { backgroundColor: 'rgba(0,122,101,0.10)' },
  pending: { backgroundColor: 'rgba(138,90,0,0.15)' },
  muted: { backgroundColor: colors.cream },
  error: { backgroundColor: 'rgba(180,35,59,0.10)' },
  completed: { backgroundColor: 'rgba(10,22,40,0.10)' },
});

const badgeTextTone = StyleSheet.create({
  active: { color: colors.primary },
  pending: { color: colors.warning },
  muted: { color: colors.muted },
  error: { color: colors.error },
  completed: { color: colors.forest },
});

import React, { ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { radius, spacing, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = usePaletteStyles(makeStyles);
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
  const { p, styles } = usePaletteStyles(makeStyles);
  const badgeTone = useMemo(() => makeBadgeTone(p), [p]);
  const badgeTextTone = useMemo(() => makeBadgeTextTone(p), [p]);
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
  const { p, styles } = usePaletteStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <View style={styles.statHead}>
        <Text style={styles.statLabel}>{label}</Text>
        {Icon ? (
          <View style={styles.statIcon}>
            <Icon size={16} color={p.primary} strokeWidth={2} />
          </View>
        ) : null}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  card: {
    backgroundColor: p.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: p.border,
    padding: 20,
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
    backgroundColor: p.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: p.border,
    padding: spacing.md,
    minWidth: 0,
  },
  statValue: {
    color: p.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  statLabel: {
    color: p.textMuted,
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
    color: p.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});

const makeBadgeTone = (p: Palette) => StyleSheet.create({
  active: { backgroundColor: 'rgba(0,122,101,0.10)' },
  pending: { backgroundColor: 'rgba(138,90,0,0.15)' },
  muted: { backgroundColor: 'rgba(74,93,115,0.15)' },
  error: { backgroundColor: 'rgba(180,35,59,0.10)' },
  completed: { backgroundColor: 'rgba(10,22,40,0.10)' },
});

const makeBadgeTextTone = (p: Palette) => StyleSheet.create({
  active: { color: p.primary },
  pending: { color: p.warning },
  muted: { color: p.muted },
  error: { color: p.error },
  completed: { color: p.text },
});

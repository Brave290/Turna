import {APP_NAME} from '@turna/config';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Badge, Card, Stat} from './components/Card';
import {Button} from './components/Button';
import {Screen} from './components/Screen';
import {colors, radius, spacing, typography} from './theme';

export default function App(): React.ReactElement {
  return (
    <Screen tone="forest">
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markLetter}>T</Text>
        </View>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Save together. Grow together.</Text>
        <View style={styles.badgeRow}>
          <Badge label="Live circles" tone="active" />
          <Badge label="Member payouts" tone="muted" />
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Your circle, one place</Text>
        <Text style={styles.cardBody}>
          Track contributions, confirmations, and payouts with a clear ledger built for trust.
        </Text>
        <View style={styles.stats}>
          <Stat label="Members" value="2–100" />
          <View style={styles.gap} />
          <Stat label="Currency" value="NGN" />
        </View>
        <Button label="Continue to dashboard" style={styles.cta} />
        <Button label="Sign in" variant="outline" style={styles.cta} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  markLetter: {
    color: colors.forest,
    fontSize: 36,
    fontWeight: '700',
  },
  title: {
    color: colors.cream,
    fontSize: typography.display,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.muted,
    fontSize: typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.lg,
  },
  cardTitle: {
    color: colors.forest,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.muted,
    fontSize: typography.body,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  gap: {
    width: spacing.sm,
  },
  cta: {
    marginTop: spacing.md,
  },
});

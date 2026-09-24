import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Card, Badge } from '../components/Card';
import { Screen } from '../components/Screen';
import { Logo } from '../components/Logo';
import { colors, radius, spacing, typography } from '../theme';

const SLIDES = [
  {
    title: 'Save together',
    body: 'Create or join a savings circle. Everyone contributes on schedule.',
  },
  {
    title: 'Pay in seconds',
    body: 'Card or bank transfer via Paystack with transparent fees.',
  },
  {
    title: 'Private by design',
    body: 'Members see masked identities. Admins see the full ledger.',
  },
  {
    title: 'Payouts on autopilot',
    body: 'Save your bank once — when it is your turn, the pot ships to you.',
  },
];

export function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  async function next() {
    if (busy) return;
    if (!last) {
      setI((v) => v + 1);
      return;
    }
    setBusy(true);
    await completeOnboarding();
  }

  return (
    <Screen tone="forest">
      <View style={styles.logoWrap}>
        <Logo variant="on-dark" size={56} />
      </View>
      <View style={styles.dots}>
        {SLIDES.map((_, idx) => (
          <View
            key={idx}
            style={[styles.dot, idx === i && styles.dotActive]}
          />
        ))}
      </View>
      <Card style={styles.card}>
        <Badge label={`Step ${i + 1} of ${SLIDES.length}`} tone="active" />
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
        <Button label={last ? 'Get started' : 'Continue'} onPress={next} loading={busy} style={styles.cta} />
        {!last && (
          <Button label="Skip" variant="ghost" onPress={() => setI(SLIDES.length - 1)} style={styles.skip} />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  card: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: colors.forest,
    fontSize: typography.title,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  body: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 24,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  cta: {},
  skip: { marginTop: spacing.sm },
});

// silence unused radius import if tree-shaken
void radius;

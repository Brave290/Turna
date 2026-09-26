import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Enter } from '../components/Enter';
import { useMotion } from '../context/MotionContext';
import { colors, spacing, typography, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '👥',
    title: 'Save together',
    body: 'Create or join a savings circle. Everyone contributes on schedule, and the pot rotates to each member.',
    bg: '#0A1628',
  },
  {
    emoji: '💸',
    title: 'Pay directly',
    body: 'Send your contribution straight to the circle admin, then report it in-app. Simple and transparent.',
    bg: '#0D2137',
  },
  {
    emoji: '🔒',
    title: 'Private by design',
    body: 'Members see masked identities. Admins see the full ledger. Your data stays yours.',
    bg: '#0A1628',
  },
  {
    emoji: '🎉',
    title: 'Payouts to you',
    body: 'When it is your turn, the pot is sent straight to you and recorded right here. No delays, no drama.',
    bg: '#0D2137',
  },
];

export function OnboardingScreen() {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { completeOnboarding } = useAuth();
  const { reduceMotion } = useMotion();
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<Animated.FlatList>(null);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  async function next() {
    if (busy) return;
    if (!last) {
      const nextIdx = i + 1;
      setI(nextIdx);
      scrollRef.current?.scrollToOffset({ offset: nextIdx * SCREEN_W, animated: !reduceMotion });
      return;
    }
    setBusy(true);
    await completeOnboarding();
  }

  function onMomentumEnd(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== i && idx >= 0 && idx < SLIDES.length) setI(idx);
  }

  return (
    <View style={styles.root}>
      <Animated.FlatList
        ref={scrollRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { backgroundColor: item.bg }]}>
            <Enter delay={index === i ? 0 : 200}>
              <View style={styles.emojiWrap}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
            </Enter>
            <Enter delay={index === i ? 120 : 320}>
              <Text style={styles.title}>{item.title}</Text>
            </Enter>
            <Enter delay={index === i ? 240 : 440}>
              <Text style={styles.body}>{item.body}</Text>
            </Enter>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, idx === i && styles.dotActive]}
            />
          ))}
        </View>
        <Enter delay={360}>
          <Button
            label={last ? 'Get started' : 'Continue'}
            onPress={next}
            loading={busy}
            style={styles.cta}
          />
        </Enter>
        {!last && (
          <Enter delay={440}>
            <Button
              label="Skip"
              variant="ghost"
              onPress={() => {
                const lastIdx = SLIDES.length - 1;
                setI(lastIdx);
                scrollRef.current?.scrollToOffset({ offset: lastIdx * SCREEN_W, animated: !reduceMotion });
              }}
              style={styles.skip}
            />
          </Enter>
        )}
      </View>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#0A1628',
    },
    slide: {
      width: SCREEN_W,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    emojiWrap: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(255,255,255,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    emoji: {
      fontSize: 72,
    },
    title: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.8,
      marginBottom: spacing.md,
    },
    body: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 320,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      paddingTop: spacing.lg,
      backgroundColor: '#0A1628',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: spacing.lg,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
      width: 28,
      backgroundColor: colors.primary,
    },
    cta: {
      borderRadius: 999,
      minHeight: 52,
    },
    skip: {
      marginTop: spacing.sm,
    },
  });

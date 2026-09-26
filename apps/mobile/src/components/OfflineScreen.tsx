import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { colors, radius, spacing, typography, type Palette } from '../theme';
import { useMotion } from '../context/MotionContext';
import { usePaletteStyles } from '../context/ThemeContext';
import { useConnectivity } from '../lib/connectivity';
import { Button } from './Button';

const AView = Animated.View as unknown as React.ComponentType<{
  style?: unknown;
  children?: React.ReactNode;
}>;

/**
 * Full-screen offline state — replaces the bare spinner/error whenever a
 * screen is loading (or failed) while the device is offline and there is no
 * saved copy to show. Layered breathing rings + a primary retry that also
 * re-fires automatically when connectivity returns.
 */
export function OfflineScreen({
  onRetry,
  onContinue,
  title = "You're offline",
  sub = "Your data will sync automatically when you're back online.",
}: {
  onRetry: () => void;
  onContinue?: () => void;
  title?: string;
  sub?: string;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { reduceMotion } = useMotion();
  const online = useConnectivity();
  const prevOnline = useRef<boolean | null>(null);

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const icon = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const was = prevOnline.current;
    prevOnline.current = online;
    // Auto-retry as soon as connectivity comes back (first render is skipped:
    // `was === null` means we have not actually gone offline yet).
    if (online && was === false) onRetry();
  }, [online, onRetry]);

  useEffect(() => {
    if (reduceMotion) {
      ring1.setValue(0.55);
      ring2.setValue(0.4);
      ring3.setValue(0.3);
      icon.setValue(1);
      return;
    }
    const loop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    const loops = [loop(ring1, 0), loop(ring2, 520), loop(ring3, 1040)];
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(icon, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(icon, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loops.forEach((l) => l.start());
    breathe.start();
    return () => {
      loops.forEach((l) => l.stop());
      breathe.stop();
    };
  }, [ring1, ring2, ring3, icon, reduceMotion]);

  const ringStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] }) }],
  });

  return (
    <AView style={styles.root}>
      <View style={styles.motif}>
        <AView style={[styles.ring, styles.ring1, ringStyle(ring1)]} />
        <AView style={[styles.ring, styles.ring2, ringStyle(ring2)]} />
        <AView style={[styles.ring, styles.ring3, ringStyle(ring3)]} />
        <AView
          style={[
            styles.iconWrap,
            {
              opacity: reduceMotion ? 1 : icon.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
              transform: [
                { scale: reduceMotion ? 1 : icon.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) },
              ],
            },
          ]}
        >
          <WifiOff size={34} color={p.primary} strokeWidth={2} />
        </AView>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>

      <View style={styles.actions}>
        <Button label="Try again" onPress={onRetry} style={styles.primary} />
        {onContinue ? (
          <Button
            label="Continue with saved data"
            variant="outline"
            onDark
            onPress={onContinue}
            style={styles.secondary}
          />
        ) : null}
      </View>
    </AView>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.forest,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
    },
    motif: {
      width: 168,
      height: 168,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    ring: {
      position: 'absolute',
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: p.primary,
    },
    ring1: { width: 168, height: 168 },
    ring2: { width: 120, height: 120 },
    ring3: { width: 78, height: 78 },
    iconWrap: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: 'rgba(124,232,215,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(124,232,215,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: colors.white,
      fontSize: typography.title,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    sub: {
      color: 'rgba(255,255,255,0.66)',
      fontSize: typography.body,
      lineHeight: 22,
      textAlign: 'center',
      marginTop: spacing.sm,
      maxWidth: 320,
    },
    actions: {
      alignSelf: 'stretch',
      maxWidth: 360,
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    primary: {
      borderRadius: radius.full,
      minHeight: 50,
    },
    secondary: {
      borderRadius: radius.full,
      minHeight: 50,
      borderColor: 'rgba(255,255,255,0.4)',
    },
  });

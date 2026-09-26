import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Wifi, WifiOff } from 'lucide-react-native';
import { colors, radius, spacing, typography, type Palette } from '../theme';
import { useMotion } from '../context/MotionContext';
import { usePaletteStyles } from '../context/ThemeContext';
import { useConnectivity } from '../lib/connectivity';

type Phase = 'hidden' | 'offline' | 'online';

const AnimatedView = Animated.View as unknown as React.ComponentType<{
  style?: unknown;
  children?: React.ReactNode;
}>;

/**
 * Global connectivity strip — persistent while offline, flashes
 * "Back online" for a moment when connectivity returns. Rendered inside
 * Screen (below the safe area) so it never covers the status bar.
 */
export function OfflineBanner() {
  const online = useConnectivity();
  const { p, styles } = usePaletteStyles(makeStyles);
  const { reduceMotion } = useMotion();
  const [phase, setPhase] = useState<Phase>('hidden');
  const prev = useRef<boolean | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const was = prev.current;
    prev.current = online;
    if (!online) {
      setPhase('offline');
      return;
    }
    if (was !== false) return;
    setPhase('online');
    const t = setTimeout(() => setPhase('hidden'), 2600);
    return () => clearTimeout(t);
  }, [online]);

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(phase === 'hidden' ? 0 : 1);
      return;
    }
    Animated.timing(anim, {
      toValue: phase === 'hidden' ? 0 : 1,
      duration: phase === 'hidden' ? 180 : 220,
      useNativeDriver: true,
    }).start();
  }, [phase, anim, reduceMotion]);

  if (phase === 'hidden') return null;
  const offline = phase === 'offline';

  return (
    <AnimatedView
      style={[
        styles.wrap,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] },
        offline ? styles.offline : styles.online,
      ]}
    >
      <View style={styles.row}>
        {offline ? (
          <WifiOff size={15} color={colors.white} strokeWidth={2.25} />
        ) : (
          <Wifi size={15} color={p.primarySolid} strokeWidth={2.25} />
        )}
        <Text style={[styles.text, offline ? styles.textOffline : styles.textOnline]}>
          {offline
            ? "You're offline — changes will sync when you're back online."
            : 'Back online'}
        </Text>
      </View>
    </AnimatedView>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 1,
    },
    offline: {
      backgroundColor: '#0A1628',
    },
    online: {
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    text: {
      flex: 1,
      fontSize: typography.caption,
      lineHeight: 18,
    },
    textOffline: {
      color: colors.white,
      fontWeight: '500',
    },
    textOnline: {
      color: p.primarySolid,
      fontWeight: '600',
    },
  });

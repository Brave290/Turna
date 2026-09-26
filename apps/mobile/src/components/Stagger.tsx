import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useMotion } from '../context/MotionContext';

const AnimatedView = Animated.View as unknown as React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}>;

/** Only the first rows animate — long lists stay instant. */
const MAX_ANIMATED_ROWS = 8;
const DURATION = 240;
const STAGGER_MS = 24;

/**
 * Staggered entrance (fade + 8px slide up) for list rows — MotionContext aware,
 * ≤240ms per row, and disabled entirely once `index` passes the first 8 rows.
 */
export function StaggerItem({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduceMotion } = useMotion();
  const anim = useRef(new Animated.Value(reduceMotion || index >= MAX_ANIMATED_ROWS ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion || index >= MAX_ANIMATED_ROWS) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    const timing = Animated.timing(anim, {
      toValue: 1,
      duration: DURATION,
      delay: index * STAGGER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    timing.start();
    return () => timing.stop();
  }, [anim, index, reduceMotion]);

  return (
    <AnimatedView
      style={[
        style,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </AnimatedView>
  );
}

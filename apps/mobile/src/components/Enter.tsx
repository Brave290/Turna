import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useMotion } from '../context/MotionContext';

/**
 * Entrance wrapper — fade + rise-in, staggered by `delay`.
 * Respect the reduce-motion preference (shows content instantly).
 * Use `key` on the parent to replay when the view content changes.
 */
export function Enter({
  delay = 0,
  duration = 420,
  children,
  style,
}: {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduceMotion } = useMotion();
  const value = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const started = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      value.setValue(1);
      return;
    }
    if (started.current) return;
    started.current = true;
    Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, duration, reduceMotion, value]);

  return (
    <Animated.View
      style={[
        {
          opacity: value,
          transform: [
            {
              translateY: value.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

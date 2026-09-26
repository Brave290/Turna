import React, { ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, type Palette } from '../theme';
import { useMotion } from '../context/MotionContext';
import { usePaletteStyles, useTheme } from '../context/ThemeContext';

const AView = Animated.View as unknown as React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}>;

export function Screen({
  children,
  tone = 'cream',
  style,
}: {
  children: ReactNode;
  tone?: 'forest' | 'cream';
  style?: StyleProp<ViewStyle>;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { resolved } = useTheme();
  const { reduceMotion } = useMotion();
  const forest = tone === 'forest';
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, reduceMotion]);

  return (
    <SafeAreaView style={[styles.root, forest ? styles.forest : styles.cream, style]}>
      <StatusBar
        barStyle={forest || resolved === 'dark' ? 'light-content' : 'dark-content'}
      />
      <AView
        style={{
          flex: 1,
          opacity: fade,
          transform: [
            { translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        }}
      >
        {children}
      </AView>
    </SafeAreaView>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  root: {
    flex: 1,
  },
  forest: {
    backgroundColor: p.brand,
  },
  cream: {
    backgroundColor: p.bg,
  },
});

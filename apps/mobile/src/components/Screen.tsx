import React, { ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, type Palette } from '../theme';
import { useMotion } from '../context/MotionContext';
import { usePaletteStyles, useTheme } from '../context/ThemeContext';
import { OfflineBanner } from './OfflineBanner';

const BG_IMAGE = require('../../assets/bg-screen.jpg');

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
      <View
        style={[styles.bgLayer, { opacity: resolved === 'dark' ? 0.22 : 0.12 }]}
        pointerEvents="none"
      >
        <Image source={BG_IMAGE} style={styles.bgImage} resizeMode="cover" />
      </View>
      <StatusBar
        barStyle={forest || resolved === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={forest ? p.brand : p.bg}
      />
      <OfflineBanner />
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
  bgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
});

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

const LOGO = require('../../assets/logo.png');
const LOGO_ON_DARK = require('../../assets/logo-on-dark.png');

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
      <View style={styles.watermarkLayer} pointerEvents="none">
        <Image
          source={resolved === 'dark' ? LOGO_ON_DARK : LOGO}
          style={styles.watermark}
          resizeMode="contain"
        />
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
  watermarkLayer: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: '78%',
    height: '46%',
    opacity: 0.05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermark: {
    width: '100%',
    height: '100%',
  },
});

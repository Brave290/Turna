import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { useMotion } from '../context/MotionContext';
import { colors } from '../theme';

const BRAND_MARK = require('../../assets/logo-clean.png');

/**
 * The one and only splash: the native app icon is untouched; this in-app
 * continuation uses only the centered transparent brand mark with a
 * restrained spring entrance — no text or white panel.
 */
export function SplashAnimated() {
  const { reduceMotion } = useMotion();
  const iconScale = useRef(new Animated.Value(0.72)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      iconScale.setValue(1);
      iconOpacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [iconScale, iconOpacity, reduceMotion]);

  return (
    <View style={styles.root}>
      <Animated.View
        style={{
          opacity: iconOpacity,
          transform: [{ scale: iconScale }],
        }}
      >
        <Image source={BRAND_MARK} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.forest,
  },
  icon: {
    width: 116,
    height: 116,
  },
});

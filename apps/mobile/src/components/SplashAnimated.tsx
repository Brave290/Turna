import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useMotion } from '../context/MotionContext';
import { colors } from '../theme';

const BRAND_MARK = require('../../assets/logo-clean.png');

/**
 * The one and only splash: the native app icon is untouched; this in-app
 * continuation uses the centered transparent brand mark with a restrained
 * spring and wordmark entrance.
 */
export function SplashAnimated() {
  const { reduceMotion } = useMotion();
  const iconScale = useRef(new Animated.Value(0.72)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(16)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      iconScale.setValue(1);
      iconOpacity.setValue(1);
      textY.setValue(0);
      textOpacity.setValue(1);
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
    Animated.sequence([
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(textY, {
          toValue: 0,
          duration: 440,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 440,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [iconScale, iconOpacity, textY, textOpacity, reduceMotion]);

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
      <Animated.Text
        style={[
          styles.word,
          {
            opacity: textOpacity,
            transform: [{ translateY: textY }],
          },
        ]}
      >
        Turna
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  icon: {
    width: 116,
    height: 116,
  },
  word: {
    marginTop: 18,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.forest,
  },
});

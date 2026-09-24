import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

const LOGO = require('../../assets/logo.png');
const LOGO_ON_DARK = require('../../assets/logo-on-dark.png');

/**
 * Turna logo — same brand assets as web (/logo.png, /logo-on-dark.png).
 * Do not invent letter marks or alternate icons.
 */
export function Logo({
  size = 40,
  variant = 'default',
  withWordmark = false,
  style,
}: {
  size?: number;
  variant?: 'default' | 'on-dark';
  withWordmark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const src = variant === 'on-dark' ? LOGO_ON_DARK : LOGO;
  if (!withWordmark) {
    return (
      <Image
        source={src}
        accessibilityLabel="Turna"
        style={[{ width: size, height: size, borderRadius: size * 0.2 }, style]}
        resizeMode="contain"
      />
    );
  }
  return (
    <View style={[styles.row, style]}>
      <Image
        source={src}
        accessibilityLabel="Turna"
        style={{ width: size, height: size, borderRadius: size * 0.2 }}
        resizeMode="contain"
      />
      <Text style={[styles.word, variant === 'on-dark' && styles.wordOnDark]}>Turna</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  word: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.4,
  },
  wordOnDark: {
    color: colors.white,
  },
});

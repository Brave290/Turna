import React, { ReactNode } from 'react';
import { SafeAreaView, StatusBar, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

export function Screen({
  children,
  tone = 'cream',
  style,
}: {
  children: ReactNode;
  tone?: 'forest' | 'cream';
  style?: StyleProp<ViewStyle>;
}) {
  const forest = tone === 'forest';
  return (
    <SafeAreaView style={[styles.root, forest ? styles.forest : styles.cream, style]}>
      <StatusBar barStyle={forest ? 'light-content' : 'dark-content'} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  forest: {
    backgroundColor: colors.forest,
  },
  cream: {
    backgroundColor: colors.cream,
  },
});

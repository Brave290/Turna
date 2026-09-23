import React from 'react';
import {SafeAreaView, StatusBar, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {colors, spacing} from '../theme';

type ScreenProps = {
  children: React.ReactNode;
  tone?: 'forest' | 'cream';
  style?: StyleProp<ViewStyle>;
};

export function Screen({children, tone = 'cream', style}: ScreenProps) {
  const isForest = tone === 'forest';
  return (
    <SafeAreaView style={[styles.safe, isForest ? styles.forest : styles.cream, style]}>
      <StatusBar
        barStyle={isForest ? 'light-content' : 'dark-content'}
        backgroundColor={isForest ? colors.forest : colors.cream}
      />
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  forest: {
    backgroundColor: colors.forest,
  },
  cream: {
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});

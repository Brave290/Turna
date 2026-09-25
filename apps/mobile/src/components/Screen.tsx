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
import { colors } from '../theme';

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
  const forest = tone === 'forest';
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <SafeAreaView style={[styles.root, forest ? styles.forest : styles.cream, style]}>
      <StatusBar barStyle={forest ? 'light-content' : 'dark-content'} />
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

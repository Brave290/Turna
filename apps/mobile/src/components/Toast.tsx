import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type Tone = 'ok' | 'error';

const AnimatedView = Animated.View as unknown as React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}>;

/** Branded toast — replaces native Alert for success/notice/error messages. */
export function useToast() {
  const [state, setState] = useState<{ message: string; tone: Tone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  function show(message: string, tone: Tone = 'ok') {
    if (timer.current) clearTimeout(timer.current);
    setState({ message, tone });
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => finished && setState(null));
    }, 2600);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const node = state ? (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => setState(null)}>
      <Pressable style={styles.wrap} onPress={() => setState(null)}>
        <AnimatedView
          style={[
            styles.toast,
            state.tone === 'error' ? styles.err : styles.ok,
            {
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            },
          ]}
        >
          <Text style={styles.text}>{state.message}</Text>
        </AnimatedView>
      </Pressable>
    </Modal>
  ) : null;

  return { show, node };
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 96,
    paddingHorizontal: spacing.lg,
  },
  toast: {
    maxWidth: 440,
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#0A1628',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ok: {
    backgroundColor: colors.forest,
    borderColor: 'rgba(124,232,215,0.35)',
  },
  err: {
    backgroundColor: colors.error,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  text: {
    color: colors.white,
    fontSize: typography.body - 1,
    fontWeight: '600',
    textAlign: 'center',
  },
});

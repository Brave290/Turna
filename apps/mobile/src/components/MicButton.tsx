import React, { useRef } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';
import { useMotion } from '../context/MotionContext';
import { useToast } from './Toast';
import { useVoiceTyping } from '../lib/voice';

/**
 * Mic affordance for text inputs — press to dictate (locale en-US), press
 * again to stop. Transcript text is appended to the current value.
 * Degrades to a disabled button with a toast when speech is unavailable.
 */
export function MicButton({
  value,
  onChangeText,
  style,
  accessibilityLabel = 'Voice typing',
}: {
  value: string;
  onChangeText: (next: string) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { reduceMotion } = useMotion();
  const { show: toast, node: toastNode } = useToast();
  // Value as it stood when dictation began — the final result is appended
  // exactly once onto this base (partials are never committed).
  const baseRef = useRef(value);

  const { listening, supported, toggle } = useVoiceTyping({
    onResult: (text) => {
      const base = baseRef.current.trim();
      onChangeText(base ? `${base} ${text}` : text);
    },
    onError: (message) => {
      toast(message, 'error');
    },
    onUnavailable: (reason) => {
      toast(reason, 'error');
    },
  });

  const disabled = !supported && !listening;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop voice typing' : accessibilityLabel}
        accessibilityState={{ disabled, busy: listening }}
        disabled={disabled}
        hitSlop={8}
        onPress={() => {
          if (!listening) baseRef.current = value;
          void toggle();
        }}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: listening ? p.primarySolid : p.bg },
          pressed && !reduceMotion && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        {listening ? (
          <Square size={15} color="#ffffff" strokeWidth={2.5} fill="#ffffff" />
        ) : (
          <Mic size={16} color={listening ? '#ffffff' : p.textMuted} strokeWidth={2} />
        )}
      </Pressable>
      {toastNode}
    </>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    btn: {
      position: 'absolute',
      right: 6,
      top: 5,
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: p.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      transform: [{ scale: 0.94 }],
      opacity: 0.85,
    },
    disabled: {
      opacity: 0.4,
    },
  });

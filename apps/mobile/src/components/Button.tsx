import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography, type Palette } from '../theme';
import { useMotion } from '../context/MotionContext';
import { usePaletteStyles } from '../context/ThemeContext';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  onDark = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Swap outline/ghost colours for light text on a dark surface. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const variantStyles = useMemo(() => makeVariantStyles(p, onDark), [p, onDark]);
  const labelStyles = useMemo(() => makeLabelStyles(p, onDark), [p, onDark]);
  const { reduceMotion } = useMotion();
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled && !reduceMotion && styles.pressed,
        pressed && !isDisabled && !reduceMotion && styles.pressedScale,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || onDark ? colors.white : p.primary
          }
        />
      ) : (
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
  },
  label: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

const makeVariantStyles = (p: Palette, onDark = false): Record<Variant, ViewStyle> => ({
  primary: { backgroundColor: p.primarySolid },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: onDark ? 'rgba(255,255,255,0.45)' : p.primary,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: p.errorSolid },
});

const makeLabelStyles = (p: Palette, onDark = false) =>
  StyleSheet.create({
    primary: { color: colors.white },
    outline: { color: onDark ? colors.white : p.primary },
    ghost: { color: onDark ? colors.white : p.primary },
    danger: { color: colors.white },
  });

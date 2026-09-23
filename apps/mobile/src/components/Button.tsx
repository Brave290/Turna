import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonProps = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

const variantStyles: Record<
  Variant,
  {container: ViewStyle; text: TextStyle}
> = {
  primary: {
    container: {backgroundColor: colors.primary},
    text: {color: colors.white},
  },
  secondary: {
    container: {backgroundColor: colors.forest},
    text: {color: colors.white},
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {color: colors.forest},
  },
  ghost: {
    container: {backgroundColor: 'transparent'},
    text: {color: colors.primary},
  },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  size = 'md',
  disabled,
  style,
  labelStyle,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const palette = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({pressed}) => [
        styles.base,
        size === 'sm' && styles.sm,
        palette.container,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
        />
      ) : (
        <Text
          style={[
            styles.label,
            palette.text,
            size === 'sm' && styles.labelSm,
            labelStyle,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 14,
  },
});

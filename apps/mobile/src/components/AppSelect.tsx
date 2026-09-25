import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../theme';
import { Popup } from './Popup';

export interface SelectOption {
  value: string;
  label: string;
}

/** Branded selector — tap the field, pick from a branded popup list. */
export function AppSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  style,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          disabled && styles.fieldDisabled,
          pressed && !disabled && styles.fieldPressed,
        ]}
      >
        <Text
          style={[styles.valueText, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color={colors.muted} />
      </Pressable>

      <Popup
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? 'Select'}
      >
        <View style={styles.list}>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  on && styles.optionOn,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={[styles.optionText, on && styles.optionTextOn]}>
                  {o.label}
                </Text>
                {on ? (
                  <Check size={16} color={colors.primary} strokeWidth={2.5} />
                ) : (
                  <View style={{ width: 16 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Popup>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.xs + 2,
  },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  fieldPressed: {
    borderColor: colors.primary,
    backgroundColor: '#F7FBFA',
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  valueText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.forest,
    fontWeight: '500',
  },
  placeholder: {
    color: colors.muted,
    fontWeight: '400',
  },
  list: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionOn: {
    borderColor: colors.primary,
    backgroundColor: '#E8F6F3',
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.forest,
  },
  optionTextOn: {
    color: colors.primary,
    fontWeight: '700',
  },
});

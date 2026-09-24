import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type TabKey = 'home' | 'circles' | 'ledger' | 'solo' | 'profile';

const TABS: { key: TabKey; label: string; glyph: string }[] = [
  { key: 'home', label: 'Home', glyph: '⌂' },
  { key: 'circles', label: 'Circles', glyph: '◎' },
  { key: 'ledger', label: 'Ledger', glyph: '☰' },
  { key: 'solo', label: 'Solo', glyph: '▦' },
  { key: 'profile', label: 'Me', glyph: '●' },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t.key)}
            style={[styles.tab, on && styles.tabOn]}
          >
            <Text style={[styles.glyph, on && styles.glyphOn]}>{t.glyph}</Text>
            <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginHorizontal: 4,
  },
  tabOn: {
    backgroundColor: 'rgba(0,168,120,0.1)',
  },
  glyph: {
    fontSize: 16,
    color: colors.muted,
    lineHeight: 20,
  },
  glyphOn: {
    color: colors.primary,
  },
  label: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  labelOn: {
    color: colors.primary,
    fontWeight: '700',
  },
});

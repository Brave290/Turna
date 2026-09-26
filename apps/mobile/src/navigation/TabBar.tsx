import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Home, Users, FileText, NotebookPen, User } from 'lucide-react-native';
import { colors, spacing, type Palette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

type TabKey = 'home' | 'circles' | 'ledger' | 'solo' | 'profile';

type TabIcon = React.ComponentType<any>;

/** Same order/icons as web bottomNav in dashboard/nav.tsx: Home, Circles, Ledger, Solo, Profile */
const TABS: { key: TabKey; label: string; icon: TabIcon }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'circles', label: 'Circles', icon: Users },
  { key: 'ledger', label: 'Ledger', icon: FileText },
  { key: 'solo', label: 'Solo', icon: NotebookPen },
  { key: 'profile', label: 'Profile', icon: User },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = t.key === active;
        const Icon = t.icon;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t.key)}
            style={styles.tab}
          >
            {on && <View style={styles.indicator} accessibilityElementsHidden />}
            <Icon
              size={20}
              strokeWidth={on ? 2.25 : 1.75}
              color={on ? p.primary : p.textMuted}
            />
            <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: p.surface,
    borderTopWidth: 1,
    borderTopColor: p.border,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    gap: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    height: 4,
    width: 32,
    left: '50%',
    marginLeft: -16,
    borderRadius: 2,
    backgroundColor: p.primarySolid,
  },
  label: {
    fontSize: 11,
    color: p.textMuted,
    fontWeight: '500',
  },
  labelOn: {
    color: p.primary,
    fontWeight: '600',
  },
});

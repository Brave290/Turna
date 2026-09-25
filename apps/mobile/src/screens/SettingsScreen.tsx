import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

type Tile = { label: string; description: string; onPress?: () => void };
type Section = { title: string; tiles: Tile[] };

export function SettingsScreen({ onNavigate, onBack }: { onNavigate?: (route: string) => void; onBack?: () => void } = {}) {
  const { signOut, email } = useAuth();
  const [profile, setProfile] = useState<{ display_name?: string | null } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.from('profiles').select('display_name').limit(1).maybeSingle();
      setProfile((data as { display_name?: string | null } | null) ?? null);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sections: Section[] = [
    {
      title: 'Account',
      tiles: [
        { label: 'Personal info', description: 'Name, username, country', onPress: () => onNavigate?.('settings/profile') },
        { label: 'Email', description: 'Sign-in & verification', onPress: () => onNavigate?.('settings/email') },
        { label: 'Security', description: 'Password, OTP, sessions', onPress: () => onNavigate?.('settings/security') },
        { label: 'Bank', description: 'Payout account (locked)', onPress: () => onNavigate?.('settings/payout-account') },
        { label: 'Identity', description: 'KYC for larger payouts', onPress: () => onNavigate?.('settings/kyc') },
      ],
    },
    {
      title: 'Preferences',
      tiles: [
        { label: 'Notifications', description: 'Email & in-app alerts', onPress: () => onNavigate?.('settings/notifications') },
        { label: 'Appearance', description: 'Theme & motion', onPress: () => onNavigate?.('settings/appearance') },
        { label: 'Language', description: 'App language', onPress: () => onNavigate?.('settings/language') },
        { label: 'Currency', description: 'Display currency', onPress: () => onNavigate?.('settings/currency') },
      ],
    },
    {
      title: 'Circle',
      tiles: [
        { label: 'Circle preferences', description: 'Defaults for new circles', onPress: () => onNavigate?.('settings/circle-preferences') },
        { label: 'Reminders', description: 'Contribution reminders', onPress: () => onNavigate?.('settings/reminders') },
      ],
    },
    {
      title: 'Support',
      tiles: [
        { label: 'Privacy', description: 'Data and visibility', onPress: () => onNavigate?.('settings/privacy') },
        { label: 'Help', description: 'Guides and contact', onPress: () => onNavigate?.('settings/help') },
        { label: 'Report a problem', description: 'Tell us what broke', onPress: () => onNavigate?.('settings/report') },
        { label: 'Legal', description: 'Terms and policies', onPress: () => onNavigate?.('settings/legal') },
        { label: 'About', description: 'Version and credits', onPress: () => onNavigate?.('settings/about') },
      ],
    },
  ];

  return (
    <Screen tone="cream">
      <FlatList
        data={sections}
        keyExtractor={(s) => s.title}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {onBack && <Button label="← Back" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start', marginBottom: spacing.xs }} />}
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.sub}>
              Signed in as {email ?? 'member'}
              {profile?.display_name ? ` · ${profile.display_name}` : ''}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.section}>{item.title}</Text>
            {item.tiles.map((t) => (
              <Pressable key={t.label} style={styles.row} onPress={t.onPress}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  <Text style={styles.rowDesc}>{t.description}</Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            ))}
          </Card>
        )}
        ListFooterComponent={
          <Pressable style={styles.signOut} onPress={() => void signOut()}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 4,
  },
  card: {
    marginBottom: 0,
  },
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.body,
    color: colors.forest,
    fontWeight: '500',
  },
  rowDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  chev: {
    fontSize: 18,
    color: colors.muted,
  },
  signOut: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '600',
  },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

type RowDef = {
  label: string;
  description: string;
  onPress?: () => void;
};

export function ProfileScreen({
  onNavigate,
  onPush,
}: {
  onNavigate?: (tab: string) => void;
  onPush?: (screen: any) => void;
} = {}) {
  const { user, displayName, email, signOut } = useAuth();
  const initials = (displayName || email || 'TU')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'TU';

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const accountRows: RowDef[] = [
    { label: 'Settings', description: 'Account, preferences, privacy', onPress: () => onPush?.({ name: 'settings' }) },
    { label: 'My circles', description: 'Active savings circles', onPress: () => onNavigate?.('circles') },
    { label: 'Security', description: 'Password, sessions, OTP', onPress: () => onPush?.({ name: 'settings-sub', route: 'settings/security' }) },
    { label: 'Notifications', description: 'Email and in-app alerts', onPress: () => onPush?.({ name: 'settings-sub', route: 'settings/notifications' }) },
    { label: 'Appearance', description: 'Theme and motion', onPress: () => onPush?.({ name: 'settings-sub', route: 'settings/appearance' }) },
    { label: 'Ledger', description: 'Append-only contribution history', onPress: () => onNavigate?.('ledger') },
    { label: 'Help & support', description: 'Guides and contact', onPress: () => onPush?.({ name: 'help' }) },
  ];

  return (
    <Screen tone="cream">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHead}>
          <Text style={styles.pageTitle}>Profile</Text>
          <Text style={styles.pageSub}>
            Your identity across circles. Members only see a masked version.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{displayName || 'Member'}</Text>
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
              <Text style={styles.since}>Member since {memberSince}</Text>
              <Badge label={user?.email_confirmed_at ? 'Active' : 'Pending'} tone="active" style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>Account</Text>
          <MetaRow label="User ID" value={(user?.id ?? '').slice(0, 8) + '…'} />
          <MetaRow label="Email verified" value={user?.email_confirmed_at ? 'Yes' : 'Pending'} />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>Account hub</Text>
          {accountRows.map((r) => (
            <View key={r.label} style={styles.hubRow}>
              <PressableRow row={r} />
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.hubTitle}>Edit details</Text>
          <Text style={styles.hint}>
            Name, contact info, and short bio are edited on the web dashboard under Profile →
            Edit profile.
          </Text>
        </Card>

        <Button label="Log out" variant="outline" onPress={() => void signOut()} style={styles.signOut} />
        <Text style={styles.delete}>Delete account</Text>
      </ScrollView>
    </Screen>
  );
}

function PressableRow({ row }: { row: RowDef }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        <Text style={styles.rowDesc}>{row.description}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  pageHead: {
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.4,
  },
  pageSub: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
  },
  card: {
    marginBottom: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryLight,
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.forest,
  },
  email: {
    fontSize: typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  since: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  metaLabel: {
    fontSize: typography.caption,
    color: colors.muted,
  },
  metaValue: {
    fontSize: typography.caption,
    color: colors.forest,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  hubRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  hubTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.forest,
    marginBottom: 4,
  },
  hint: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 20,
  },
  signOut: {
    marginTop: spacing.sm,
    borderColor: colors.border,
  },
  delete: {
    textAlign: 'center',
    color: colors.error,
    marginTop: spacing.lg,
    fontSize: typography.body,
    fontWeight: '500',
    paddingVertical: spacing.sm,
  },
});

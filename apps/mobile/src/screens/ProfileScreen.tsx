import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Card, Badge } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

export function ProfileScreen() {
  const { user, displayName, email, signOut } = useAuth();
  const initials = (displayName || email || 'TU')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'TU';

  return (
    <Screen tone="cream">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{displayName || 'Member'}</Text>
          <Text style={styles.email}>{email}</Text>
          <Badge label="Active" tone="active" style={styles.badge} />
        </View>

        <Card style={styles.card}>
          <Text style={styles.section}>Account</Text>
          <Row label="User ID" value={(user?.id ?? '').slice(0, 8) + '…'} />
          <Row
            label="Email verified"
            value={user?.email_confirmed_at ? 'Yes' : 'Pending'}
          />
          <Row
            label="Member since"
            value={
              user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'
            }
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>Preferences</Text>
          <Text style={styles.hint}>
            Notification, currency, payout bank, and security settings live on the
            web dashboard under Settings.
          </Text>
          <Button label="Sign out" variant="outline" onPress={() => void signOut()} style={styles.signOut} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 28,
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
    marginTop: 4,
  },
  badge: {
    marginTop: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
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
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.caption,
    color: colors.muted,
  },
  rowValue: {
    fontSize: typography.caption,
    color: colors.forest,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  hint: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: 20,
  },
  signOut: {
    marginTop: spacing.md,
  },
});

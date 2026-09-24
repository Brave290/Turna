import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

/** Settings sub-pages — same labels/copy as web settings nav-config. */
export type SettingsRoute =
  | 'settings'
  | 'settings/profile'
  | 'settings/personal-information'
  | 'settings/email'
  | 'settings/security'
  | 'settings/payout-account'
  | 'settings/kyc'
  | 'settings/notifications'
  | 'settings/appearance'
  | 'settings/language'
  | 'settings/currency'
  | 'settings/circle-preferences'
  | 'settings/reminders'
  | 'settings/privacy'
  | 'settings/help'
  | 'settings/report'
  | 'settings/legal'
  | 'settings/about'
  | 'settings/delete';

const COPY: Record<string, { title: string; sub: string; body: string }> = {
  'settings/profile': {
    title: 'Edit profile',
    sub: 'Name, contact info, and short bio visible to you.',
    body: 'Full profile editing lives on the web under Profile → Edit profile. Avatar upload uses the same storage bucket.',
  },
  'settings/personal-information': {
    title: 'Personal info',
    sub: 'Name, username, country',
    body: 'Update display name, username, and country. Changes apply across circles you belong to.',
  },
  'settings/email': {
    title: 'Email',
    sub: 'Sign-in & verification',
    body: 'Your email is your sign-in. Verification uses a 6-digit code from support.turna@gmail.com (check Spam/Junk if missing).',
  },
  'settings/security': {
    title: 'Security',
    sub: 'Password, OTP, sessions',
    body: 'Change password, review sessions, and sign out other devices from the web security settings.',
  },
  'settings/payout-account': {
    title: 'Bank',
    sub: 'Payout account (locked)',
    body: 'Payout bank details are locked after save. Unlock with an email OTP (purpose: bank_change). Edit on the web.',
  },
  'settings/kyc': {
    title: 'Identity',
    sub: 'KYC for larger payouts',
    body: 'Submit ID for higher payout limits. Status shows Pending / Approved / Rejected on the web KYC settings.',
  },
  'settings/notifications': {
    title: 'Notifications',
    sub: 'Email & in-app alerts',
    body: 'Choose which emails and in-app alerts you receive for invites, contributions, and payouts.',
  },
  'settings/appearance': {
    title: 'Appearance',
    sub: 'Theme & motion',
    body: 'Light or dark theme. System theme is respected on web; mobile follows system appearance.',
  },
  'settings/language': {
    title: 'Language',
    sub: 'App language',
    body: 'English is the primary language today. More locales are planned.',
  },
  'settings/currency': {
    title: 'Currency',
    sub: 'Display currency',
    body: 'Default display currency is NGN. Circle amounts keep their own currency.',
  },
  'settings/circle-preferences': {
    title: 'Circle preferences',
    sub: 'Defaults for new circles',
    body: 'Default frequency, contribution mode, and fee payer for circles you create.',
  },
  'settings/reminders': {
    title: 'Reminders',
    sub: 'Contribution reminders',
    body: 'Email reminders fire via cron at 09:00 for contributions awaiting action.',
  },
  'settings/privacy': {
    title: 'Privacy',
    sub: 'Data and visibility',
    body: 'Members see masked identities. Admins see the full ledger. Delete account from web settings.',
  },
  'settings/report': {
    title: 'Report a problem',
    sub: 'Tell us what broke',
    body: 'Email support.turna@gmail.com with steps to reproduce. No phone support.',
  },
  'settings/legal': {
    title: 'Legal',
    sub: 'Terms and policies',
    body: 'Terms of Service and Privacy Policy at turna.name.ng/terms and /privacy.',
  },
  'settings/about': {
    title: 'About',
    sub: 'Version and credits',
    body: 'Turna — save together, grow together. Package com.hx.turna.',
  },
  'settings/delete': {
    title: 'Delete account',
    sub: 'Permanent — cannot be undone',
    body: 'Deletion anonymizes your profile and removes the auth user. Complete this on the web under Settings → Delete account with email confirmation.',
  },
};

export function SettingsSubScreen({
  route,
  onBack,
}: {
  route: SettingsRoute;
  onBack: () => void;
}) {
  const { displayName, email } = useAuth();
  const [name, setName] = useState(displayName || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const copy = COPY[route] ?? { title: route, sub: '', body: '' };
  const editable = route === 'settings/personal-information' || route === 'settings/profile';

  async function save() {
    setBusy(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from('profiles').upsert({
          id: auth.user.id,
          display_name: name.trim(),
          email: email ?? auth.user.email,
        });
      }
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen tone="cream">
      <ScrollView contentContainerStyle={styles.content}>
        <Button label="← Settings" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>

        <Card style={{ marginTop: spacing.lg }}>
          {editable ? (
            <>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, { opacity: 0.7 }]}
                value={email ?? ''}
                editable={false}
              />
              <Button
                label={saved ? 'Saved' : 'Save'}
                onPress={() => void save()}
                loading={busy}
                style={{ marginTop: spacing.md }}
              />
            </>
          ) : (
            <Text style={styles.body}>{copy.body}</Text>
          )}
        </Card>

        {route === 'settings/delete' && (
          <Text style={styles.danger}>Delete account is web-only with email confirmation.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.forest,
    letterSpacing: -0.4,
    marginTop: spacing.sm,
  },
  sub: {
    fontSize: typography.body,
    color: colors.muted,
    marginTop: 4,
  },
  body: {
    fontSize: typography.body,
    color: colors.muted,
    lineHeight: 22,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.forest,
    fontSize: typography.body,
    backgroundColor: colors.white,
  },
  danger: {
    color: colors.error,
    fontSize: typography.caption,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

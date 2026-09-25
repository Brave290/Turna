import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckCircle2, Mail } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { acceptInvitation, extractInviteToken } from '../lib/join';
import { colors, spacing, typography } from '../theme';

const YEAR = new Date().getFullYear();

export function JoinCircleScreen({
  onBack,
  onJoined,
}: {
  onBack?: () => void;
  onJoined?: (circleId: string) => void;
} = {}) {
  const { email } = useAuth();
  const [input, setInput] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; circleId: string } | null>(
    null
  );

  const runAccept = async (t: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await acceptInvitation(t);
      if (res.error) {
        setError(res.error);
      } else if (res.circleId) {
        setResult({
          message: res.success ?? 'You have joined the circle',
          circleId: res.circleId,
        });
      }
    } catch {
      setError('Could not join the circle. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onContinue = () => {
    const t = extractInviteToken(input);
    if (!t) {
      setError('Invalid invitation link');
      return;
    }
    setToken(t);
    void runAccept(t);
  };

  const shell = (children: React.ReactNode) => (
    <Screen tone="forest" style={styles.shell}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Logo size={24} variant="on-dark" withWordmark />
        </View>
        <View style={styles.main}>{children}</View>
        <Text style={styles.footer}>&copy; {YEAR} Turna. All rights reserved.</Text>
      </ScrollView>
    </Screen>
  );

  if (result) {
    return shell(
      <>
        <View style={styles.successIcon}>
          <CheckCircle2 size={48} color={colors.primaryLight} strokeWidth={2} />
        </View>
        <Text style={styles.title}>You're in!</Text>
        <Text style={styles.sub}>{result.message}</Text>
        <Button
          label="View circle"
          onPress={() => onJoined?.(result.circleId)}
          style={styles.btn}
        />
      </>
    );
  }

  if (token) {
    return shell(
      <>
        <Text style={styles.title}>
          {email ? 'Confirm to join' : 'Join a savings circle'}
        </Text>
        <Text style={styles.sub}>
          {email ? (
            <>
              You're signed in as{' '}
              <Text style={styles.email}>{email}</Text>. Accept to join this
              circle.
            </>
          ) : (
            <>
              You've been invited to join a Turna circle. Create an account or
              sign in with the invited email — we'll bring you back here and join
              automatically.
            </>
          )}
        </Text>

        <View style={styles.infoCard}>
          <Mail size={20} color={colors.primaryLight} strokeWidth={2} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Use the email that received this invitation. Your place is reserved
            while you finish signing up.
          </Text>
        </View>

        <Button
          label={busy ? 'Joining circle...' : 'Accept invitation'}
          onPress={() => void runAccept(token)}
          loading={busy}
          disabled={busy}
          style={styles.btn}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.link} onPress={onBack}>
          Back to Turna
        </Text>
      </>
    );
  }

  return shell(
    <>
      <View style={styles.centerLogo}>
        <Logo size={48} variant="on-dark" />
      </View>
      <Text style={styles.title}>
        {email ? 'Join with an invite code' : 'Join a savings circle'}
      </Text>
      <Text style={styles.sub}>
        Paste the invite code or link you received from the circle owner.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Invite code or link</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Paste code or link"
          placeholderTextColor="rgba(255,255,255,0.4)"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          editable={!busy}
        />
        <Button
          label={busy ? 'Joining circle...' : 'Continue'}
          onPress={onContinue}
          loading={busy}
          disabled={busy || !input.trim()}
          style={styles.btn}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Text style={styles.link} onPress={onBack}>
        Back to Turna
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
  },
  centerLogo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.4,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sub: {
    fontSize: typography.body,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  email: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: typography.caption,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.white,
  },
  btn: {
    marginTop: spacing.sm,
  },
  error: {
    fontSize: typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  link: {
    fontSize: typography.caption,
    color: colors.primaryLight,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
});

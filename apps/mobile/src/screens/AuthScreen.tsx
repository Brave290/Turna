import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { colors, radius, spacing, typography } from '../theme';

type Mode = 'login' | 'signup' | 'verify-pending';

export function AuthScreen({ onSwitch }: { onSwitch?: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setInfo(null);
    if (!email.includes('@') || password.length < 8) {
      setError('Enter a valid email and a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      (globalThis as { __turna_pending_password?: string }).__turna_pending_password =
        password;
      if (mode === 'login') {
        const res = await signIn(email, password);
        if (res.needsVerify) {
          setInfo('We sent a 6-digit code to your email. Enter it below.');
          setMode('verify-pending');
        } else if (res.error) {
          setError(res.error);
        }
      } else {
        if (!name.trim()) {
          setError('Enter your name.');
          return;
        }
        const res = await signUp(email, password, name.trim());
        if (res.needsVerify) {
          setInfo('We sent a 6-digit code to your email. Enter it below.');
          setMode('verify-pending');
        } else if (res.error) {
          setError(res.error);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'verify-pending') {
    return <VerifyGate email={email} onBack={() => setMode('login')} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.mark}>
          <Text style={styles.markLetter}>T</Text>
        </View>
        <Text style={styles.title}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>
        <Text style={styles.sub}>
          {mode === 'login'
            ? 'Sign in to pick up where you left off.'
            : 'Save together. Grow together.'}
        </Text>

        {mode === 'signup' && (
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Jane Okafor"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}

        <Button
          label={mode === 'login' ? 'Sign in' : 'Create account'}
          onPress={submit}
          loading={busy}
          style={styles.cta}
        />

        <Button
          label={mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          variant="ghost"
          onPress={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
            setInfo(null);
          }}
          style={styles.switch}
        />
        {onSwitch && (
          <Button label="Continue as guest view" variant="outline" onPress={onSwitch} style={styles.switch} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VerifyGate({ email, onBack }: { email: string; onBack: () => void }) {
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await verifyOtp(code);
      if (res.error) setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.mark}>
          <Text style={styles.markLetter}>T</Text>
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.sub}>Enter the 6-digit code sent to {email}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Code</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {resent && <Text style={styles.info}>New code sent.</Text>}

        <Button label="Verify" onPress={submit} loading={busy} disabled={code.length !== 6} style={styles.cta} />
        <Button
          label="Resend code"
          variant="ghost"
          onPress={async () => {
            const r = await resendOtp();
            if (r.error) setError(r.error);
            else setResent(true);
          }}
          style={styles.switch}
        />
        <ActivityIndicator style={{ display: 'none' }} />
        <Button label="Back" variant="outline" onPress={onBack} style={styles.switch} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.forest },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  markLetter: { color: colors.white, fontSize: 32, fontWeight: '700' },
  title: {
    color: colors.white,
    fontSize: typography.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    color: colors.muted,
    fontSize: typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.md },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.white,
    fontSize: typography.body,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: '700',
  },
  error: {
    color: '#FF8A8A',
    fontSize: typography.caption,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  info: {
    color: colors.mint,
    fontSize: typography.caption,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  cta: { marginTop: spacing.sm },
  switch: { marginTop: spacing.sm },
});

import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Popup } from '../components/Popup';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, typography } from '../theme';
import { Eye, EyeOff } from 'lucide-react-native';

const REMEMBER_KEY = 'turna_remember_email';

async function readRemember(): Promise<string | null> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return await AsyncStorage.getItem(REMEMBER_KEY);
  } catch {
    return null;
  }
}

async function writeRemember(email: string | null) {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    if (email) await AsyncStorage.setItem(REMEMBER_KEY, email);
    else await AsyncStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* ignore */
  }
}

type Mode = 'login' | 'signup' | 'verify-pending';

export function AuthScreen({ onSwitch }: { onSwitch?: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function sendReset() {
    const target = resetEmail.trim();
    if (!target || !target.includes('@')) {
      setResetError('Enter a valid email address.');
      return;
    }
    setResetBusy(true);
    setResetError(null);
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: 'https://turnaapp.vercel.app/auth/reset-password',
      });
      if (e) {
        setResetError(e.message);
        return;
      }
      setResetSent(true);
    } catch {
      setResetError('Could not send the reset email. Check your connection and try again.');
    } finally {
      setResetBusy(false);
    }
  }

  useEffect(() => {
    void readRemember().then((saved) => {
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    });
  }, []);

  async function submit() {
    setError(null);
    setInfo(null);
    if (!agreed) {
      setError('You must agree to the Terms and Privacy Policy to continue.');
      return;
    }
    if (!email.includes('@') || password.length < 8) {
      setError('Enter a valid email and a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await writeRemember(remember ? email : null);
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
        <View style={styles.logoWrap}>
          <Logo variant="on-dark" size={48} />
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
              placeholderTextColor="rgba(255,255,255,0.4)"
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
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <View style={styles.passwordHead}>
            <Text style={styles.label}>Password</Text>
            {mode === 'login' && (
              <Text
                style={styles.forgot}
                onPress={() => {
                  setResetEmail(email);
                  setResetSent(false);
                  setResetError(null);
                  setResetOpen(true);
                }}
              >
                Forgot password?
              </Text>
            )}
          </View>
          <View style={styles.pwWrap}>
            <TextInput
              style={[styles.input, styles.pwInput]}
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry={!showPw}
              autoComplete="password"
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPw((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? (
                <EyeOff size={18} color="rgba(255,255,255,0.55)" />
              ) : (
                <Eye size={18} color="rgba(255,255,255,0.55)" />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.checkRow}>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
            thumbColor={colors.white}
          />
          <Text style={styles.checkLabel}>Remember my email</Text>
        </View>

        <Pressable style={styles.checkRow} onPress={() => setAgreed((v) => !v)}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>
            I agree to the{' '}
            <Text style={styles.link} onPress={() => void Linking.openURL('https://turnaapp.vercel.app/terms')}>
              Terms
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={() => void Linking.openURL('https://turnaapp.vercel.app/privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}

        <Button
          label={mode === 'login' ? 'Sign In' : 'Create account'}
          onPress={submit}
          loading={busy}
          disabled={!agreed}
          style={styles.cta}
        />

        <Text style={styles.switchText}>
          {mode === 'login' ? 'No account yet? ' : 'Have an account? '}
          <Text
            style={styles.link}
            onPress={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
              setInfo(null);
            }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </Text>
        </Text>
        {onSwitch && (
          <Button label="Continue as guest view" variant="outline" onPress={onSwitch} style={styles.switch} />
        )}

        <Popup
          visible={resetOpen}
          onClose={() => {
            setResetOpen(false);
            setResetSent(false);
          }}
          title="Reset password"
          subtitle={
            resetSent
              ? undefined
              : 'Enter your email and we’ll send you a reset link.'
          }
          footer={
            resetSent ? (
              <Button
                label="Back to sign in"
                onPress={() => {
                  setResetOpen(false);
                  setResetSent(false);
                }}
              />
            ) : (
              <View style={{ gap: spacing.sm }}>
                <Button
                  label="Send reset link"
                  onPress={() => void sendReset()}
                  loading={resetBusy}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setResetOpen(false)}
                />
              </View>
            )
          }
        >
          {resetSent ? (
            <Text style={styles.resetDone}>
              Check your inbox — open the link in the email to set a new
              password. The email can take a minute to arrive.
            </Text>
          ) : (
            <>
              <Text style={styles.resetLabel}>Email</Text>
              <TextInput
                style={styles.resetInput}
                value={resetEmail}
                onChangeText={(v: string) => {
                  setResetEmail(v);
                  setResetError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
              {resetError ? <Text style={styles.resetError}>{resetError}</Text> : null}
            </>
          )}
        </Popup>
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
        <View style={styles.logoWrap}>
          <Logo variant="on-dark" size={48} />
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.sub}>Enter the 6-digit code sent to {email}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Code</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={(t: string) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor="rgba(255,255,255,0.4)"
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
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.white,
    fontSize: typography.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.md },
  pwWrap: { position: 'relative' },
  pwInput: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgot: {
    color: colors.primaryLight,
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: 6,
  },
  resetLabel: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  resetInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.body,
    color: colors.forest,
    backgroundColor: colors.white,
  },
  resetError: {
    color: colors.error,
    fontSize: typography.caption,
    marginTop: 6,
  },
  resetDone: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.caption,
    lineHeight: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  link: {
    color: colors.primaryLight,
    textDecorationLine: 'underline',
  },
  error: {
    color: '#FF8A8A',
    fontSize: typography.caption,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  info: {
    color: colors.primaryLight,
    fontSize: typography.caption,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  cta: { marginTop: spacing.sm },
  switchText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.body,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  switch: { marginTop: spacing.sm },
});

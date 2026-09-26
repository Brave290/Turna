import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Download,
  Eye,
  EyeOff,
  FileText,
  Info,
  KeyRound,
  Landmark,
  Languages,
  LifeBuoy,
  Lock,
  Mail,
  MessageSquare,
  MonitorSmartphone,
  Scale,
  Shield,
  ShieldCheck,
  SunMoon,
  Trash2,
  User,
  Users,
  Wallet,
  Clock,
  ExternalLink,
  Globe,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase, APP_API_URL } from '../lib/supabase';
import { enqueueOp, isOfflineError } from '../lib/offline';
import { getPrefs, loadPrefs, savePrefs, subscribePrefs } from '../lib/prefs';
import { Badge, Card } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { Popup, useConfirm } from '../components/Popup';
import { AppSelect } from '../components/AppSelect';
import { useToast } from '../components/Toast';
import { colors, spacing, typography, type Palette } from '../theme';
import { LOCAL_VERSION_CODE, LOCAL_VERSION_NAME } from '../generated/version';
import { usePaletteStyles } from '../context/ThemeContext';

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

type Ctx = {
  toast: (message: string, tone?: 'ok' | 'error') => void;
  confirm: (
    title: string,
    message: string,
    opts?: { confirmLabel?: string; danger?: boolean }
  ) => Promise<boolean>;
  go: (route: string) => void;
  push?: (screen: any) => void;
};

type ApiRes = { ok: boolean; data?: any; error?: string };

/* ─── API helpers — same routes as web, Bearer session token ─── */

async function apiCall(
  method: 'POST' | 'PUT',
  path: string,
  body: Record<string, unknown>,
  opts?: { networkError?: string; failError?: string }
): Promise<ApiRes> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`${APP_API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof json?.error === 'string' && json.error
          ? json.error
          : opts?.failError ?? 'Request failed';
      return { ok: false, error: msg };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: opts?.networkError ?? 'Network error — check your connection' };
  }
}

function apiPost(
  path: string,
  body: Record<string, unknown>,
  opts?: { networkError?: string; failError?: string }
) {
  return apiCall('POST', path, body, opts);
}

function apiPut(
  path: string,
  body: Record<string, unknown>,
  opts?: { networkError?: string; failError?: string }
) {
  return apiCall('PUT', path, body, opts);
}

async function requestSensitiveOtp(purpose: 'bank_change' | 'profile_change') {
  return apiPost(
    '/api/auth/sensitive-otp',
    { purpose },
    { networkError: 'Network error sending code', failError: 'Could not send code' }
  );
}

async function verifySensitiveOtp(purpose: 'bank_change' | 'profile_change', code: string) {
  return apiPut(
    '/api/auth/sensitive-otp',
    { purpose, code },
    { networkError: 'Network error verifying code', failError: 'Invalid or expired code' }
  );
}

function openUrl(url: string, onError?: () => void) {
  Linking.openURL(url).catch(() => onError?.());
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TU';
  return parts
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

/* ─── Header copy — web nav-config labels + descriptions ─── */

const ROUTE_META: Record<string, { title: string; sub: string }> = {
  'settings/profile': { title: 'Profile', sub: 'Photo and public profile.' },
  'settings/personal-information': {
    title: 'Personal information',
    sub: 'Name, username, country, currency',
  },
  'settings/email': {
    title: 'Email & verification',
    sub: 'Sign-in email and verification status',
  },
  'settings/security': { title: 'Security', sub: 'Password, OTP, active sessions' },
  'settings/payout-account': {
    title: 'Payout account',
    sub: 'Bank account for receiving payouts',
  },
  'settings/kyc': { title: 'Identity (KYC)', sub: 'Verify identity for larger payouts' },
  'settings/notifications': {
    title: 'Notifications',
    sub: 'Email, push, and in-app alerts',
  },
  'settings/appearance': { title: 'Appearance', sub: 'Theme and motion' },
  'settings/language': { title: 'Language', sub: 'App language' },
  'settings/currency': { title: 'Currency', sub: 'How amounts are displayed' },
  'settings/circle-preferences': {
    title: 'Circle preferences',
    sub: 'Defaults for newly created circles',
  },
  'settings/reminders': {
    title: 'Contribution reminders',
    sub: 'Timing and which reminders you get',
  },
  'settings/privacy': { title: 'Privacy', sub: 'Visibility and data controls' },
  'settings/help': { title: 'Help & support', sub: 'Guides and contact' },
  'settings/report': { title: 'Report a problem', sub: 'Tell us what went wrong' },
  'settings/legal': { title: 'Terms & privacy', sub: 'Legal documents' },
  'settings/about': { title: 'About Turna', sub: 'Version and product info' },
  'settings/delete': {
    title: 'Delete account',
    sub: 'This permanently deletes your Turna account and associated personal data.',
  },
  settings: { title: 'Settings', sub: 'Manage your account and preferences' },
};

/* ─── Shared building blocks — mirror web shell.tsx / pref-controls.tsx ─── */

function Panel({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return (
    <Card>
      {title ? <Text style={s.panelTitle}>{title}</Text> : null}
      {description ? <Text style={s.panelDesc}>{description}</Text> : null}
      {children}
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return <Text style={s.sectionLabel}>{children}</Text>;
}

function Group({ title, children }: { title?: string; children?: React.ReactNode }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={s.groupWrap}>
      {title ? <Text style={s.sectionLabel}>{title}</Text> : null}
      <Card style={s.groupCard}>
        {items.map((child, i) => (
          <View key={i} style={i < items.length - 1 ? s.groupDivider : undefined}>
            {child}
          </View>
        ))}
      </Card>
    </View>
  );
}

function Row({
  icon: Icon,
  label,
  description,
  value,
  onPress,
  danger,
  right,
  disabled,
}: {
  icon?: React.ComponentType<any>;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const body = (
    <>
      {Icon ? (
        <View style={[s.rowIcon, danger && s.rowIconDanger]}>
          <Icon size={18} color={danger ? p.error : p.primary} strokeWidth={2} />
        </View>
      ) : null}
      <View style={s.rowText}>
        <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
        {description ? <Text style={s.rowDesc}>{description}</Text> : null}
      </View>
      {value ? (
        <Text style={s.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {onPress ? <ChevronRight size={16} color={p.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={s.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.rowPressed, disabled && s.rowDisabled]}
    >
      {body}
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  note,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  note?: string;
}) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        s.row,
        pressed && !disabled && s.rowPressed,
        disabled && s.rowDisabled,
      ]}
    >
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        {description ? <Text style={s.rowDesc}>{description}</Text> : null}
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      <View style={[s.track, value && s.trackOn]}>
        <View style={[s.thumb, value && s.thumbOn]} />
      </View>
    </Pressable>
  );
}

function RadioRow({
  label,
  description,
  checked,
  onPress,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        pressed && !disabled && s.rowPressed,
        disabled && s.rowDisabled,
      ]}
    >
      <View style={[s.radio, checked && s.radioOn]}>{checked ? <View style={s.radioDot} /> : null}</View>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        {description ? <Text style={s.rowDesc}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
      {hint && !error ? <Text style={s.hintSmall}>{hint}</Text> : null}
    </View>
  );
}

function ErrorBox({ message }: { message: string }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return (
    <View style={s.errorBox}>
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

function LoadingRow({ label }: { label?: string }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return (
    <View style={s.loadingRow}>
      <ActivityIndicator size="small" color={p.primary} />
      <Text style={s.loadingText}>{label ?? 'Loading…'}</Text>
    </View>
  );
}

/** Shared 6-digit code entry — unlocks profile and payout account edits. */
function OtpEntry({
  message,
  busy,
  onVerify,
  onResend,
  onCancel,
}: {
  message?: string | null;
  busy: boolean;
  onVerify: (code: string) => void;
  onResend: () => void;
  onCancel: () => void;
}) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const [code, setCode] = useState('');
  return (
    <View style={s.otpCard}>
      <Text style={s.otpTitle}>Enter the 6-digit code we emailed you</Text>
      {message ? <Text style={s.otpMsg}>{message}</Text> : null}
      <TextInput
        style={[s.input, s.otpInput]}
        value={code}
        onChangeText={(v: string) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="numeric"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={p.textMuted}
        accessibilityLabel="Verification code"
      />
      <Button
        label="Unlock"
        onPress={() => onVerify(code)}
        disabled={code.length !== 6 || busy}
        loading={busy}
      />
      <View style={s.otpActions}>
        <Button
          label="Resend code"
          variant="ghost"
          onPress={() => {
            setCode('');
            onResend();
          }}
          disabled={busy}
          style={s.otpAction}
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => {
            setCode('');
            onCancel();
          }}
          disabled={busy}
          style={s.otpAction}
        />
      </View>
    </View>
  );
}

/* ─── user_preferences — same keys as web lib/settings-actions.ts ─── */

function isBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function isStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v ? v : fallback;
}

function isNum(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function usePreferences(ctx: Ctx) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, any>>(() => getPrefs());

  useEffect(() => {
    void loadPrefs(user?.id);
    setPrefs(getPrefs());
    return subscribePrefs((p) => setPrefs(p as Record<string, any>));
  }, [user?.id]);

  async function save(patch: Record<string, unknown>) {
    if (!user?.id) return;
    const res = await savePrefs(user.id, patch);
    if (res === 'saved') {
      ctx.toast('Settings updated');
    } else if (res === 'offline') {
      ctx.toast('Saved — will sync when you’re back online.');
    } else {
      ctx.toast('Could not save settings', 'error');
    }
  }

  return { prefs, save };
}

/* ─── Profile ─── */

type ProfileRow = {
  display_name?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  avatar_version?: number | null;
  username?: string | null;
};

type ProfileValues = {
  display_name: string;
  email: string;
  date_of_birth: string;
  phone: string;
  city: string;
  country: string;
  bio: string;
};

const PROFILE_COLS =
  'display_name, email, date_of_birth, phone, bio, city, country, avatar_url, avatar_version, username';

function useProfile() {
  const { user, displayName, email } = useAuth();
  const [row, setRow] = useState<ProfileRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select(PROFILE_COLS)
          .eq('id', user?.id ?? '')
          .maybeSingle();
        if (alive) setRow((data as ProfileRow | null) ?? null);
      } catch {
        /* keep defaults */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const values: ProfileValues = {
    display_name:
      row?.display_name || displayName || (email ?? '').split('@')[0] || '',
    email: row?.email || email || '',
    date_of_birth: row?.date_of_birth ?? '',
    phone: row?.phone ?? '',
    city: row?.city ?? '',
    country: row?.country ?? 'NG',
    bio: row?.bio ?? '',
  };

  return { row, loaded, values, displayName, email, user };
}

function ProfileFormCard({ initial, ctx }: { initial: ProfileValues; ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { user } = useAuth();
  const [f, setF] = useState<ProfileValues>(initial);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof ProfileValues) =>
    (v: string) =>
      setF((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setNameError(null);
    setFormError(null);
    const display_name = f.display_name.trim();
    const date_of_birth = f.date_of_birth.trim() || null;
    const phone = f.phone.trim() || null;
    const bio = f.bio.trim().slice(0, 500) || null;
    const city = f.city.trim() || null;
    const country = f.country.trim() || null;

    if (!display_name || display_name.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    if (date_of_birth && Number.isNaN(Date.parse(date_of_birth))) {
      setFormError('Enter a valid date of birth');
      return;
    }
    if (phone && !/^[+\d][\d\s-]{6,20}$/.test(phone)) {
      setFormError('Enter a valid phone number');
      return;
    }
    if (!user) return;

    const payload = {
      id: user.id,
      email: user.email ?? '',
      display_name,
      date_of_birth,
      phone,
      bio,
      city,
      country,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      const { error } = existing
        ? await supabase.from('profiles').update(payload).eq('id', user.id)
        : await supabase.from('profiles').insert(payload);
      if (error) {
        if (isOfflineError(new Error(error.message))) {
          await enqueueOp({
            table: 'profiles',
            action: 'update',
            match: { id: user.id },
            payload,
          });
          ctx.toast('Saved — will sync when you’re back online.');
          return;
        }
        setFormError(error.message);
        return;
      }
      try {
        await supabase.auth.updateUser({ data: { display_name } });
      } catch {
        /* metadata optional */
      }
      ctx.toast('Profile updated');
    } catch (e) {
      if (isOfflineError(e)) {
        await enqueueOp({
          table: 'profiles',
          action: 'update',
          match: { id: user.id },
          payload,
        });
        ctx.toast('Saved — will sync when you’re back online.');
        return;
      }
      setFormError('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Field label="Full name" error={nameError}>
        <TextInput
          style={[s.input, nameError && s.inputError]}
          value={f.display_name}
          onChangeText={set('display_name')}
          maxLength={100}
          autoComplete="name"
          placeholder="Full name"
          placeholderTextColor={p.textMuted}
        />
      </Field>
      <Field label="Email" hint="Sign-in identity — cannot change here.">
        <TextInput
          style={[s.input, s.inputDisabled]}
          value={f.email}
          editable={false}
          autoCapitalize="none"
        />
      </Field>
      <View style={s.fieldRow}>
        <View style={s.fieldHalf}>
          <Field label="Date of birth" hint="YYYY-MM-DD">
            <TextInput
              style={s.input}
              value={f.date_of_birth}
              onChangeText={set('date_of_birth')}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={p.textMuted}
              maxLength={10}
            />
          </Field>
        </View>
        <View style={s.fieldHalf}>
          <Field label="Phone">
            <TextInput
              style={s.input}
              value={f.phone}
              onChangeText={set('phone')}
              placeholder="+234 800 000 0000"
              placeholderTextColor={p.textMuted}
              keyboardType="phone-pad"
              maxLength={24}
            />
          </Field>
        </View>
      </View>
      <View style={s.fieldRow}>
        <View style={s.fieldHalf}>
          <Field label="City">
            <TextInput
              style={s.input}
              value={f.city}
              onChangeText={set('city')}
              placeholder="Lagos"
              placeholderTextColor={p.textMuted}
              maxLength={80}
            />
          </Field>
        </View>
        <View style={s.fieldHalf}>
          <Field label="Country">
            <TextInput
              style={s.input}
              value={f.country}
              onChangeText={set('country')}
              placeholder="NG"
              placeholderTextColor={p.textMuted}
              maxLength={56}
            />
          </Field>
        </View>
      </View>
      <Field label="Bio">
        <TextInput
          style={[s.input, s.inputArea]}
          value={f.bio}
          onChangeText={set('bio')}
          multiline
          maxLength={500}
          placeholder="A short line about you (optional)"
          placeholderTextColor={p.textMuted}
          textAlignVertical="top"
        />
      </Field>
      {formError ? <ErrorBox message={formError} /> : null}
      <Button
        label={saving ? 'Saving…' : 'Save profile'}
        onPress={() => void save()}
        loading={saving}
        disabled={saving}
        style={s.blockBtn}
      />
    </>
  );
}

/** Profile fields lock after first save — unlock with an email code (profile_change). */
function ProfileGate({
  initiallyLocked,
  ctx,
  children,
}: {
  initiallyLocked: boolean;
  ctx: Ctx;
  children: React.ReactNode;
}) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const [locked, setLocked] = useState(initiallyLocked);
  const [step, setStep] = useState<'idle' | 'verify'>('idle');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocked(initiallyLocked);
  }, [initiallyLocked]);

  async function requestUnlock() {
    setBusy(true);
    setMsg(null);
    const res = await requestSensitiveOtp('profile_change');
    setBusy(false);
    if (!res.ok) {
      ctx.toast(res.error ?? 'Could not send code', 'error');
      return;
    }
    setStep('verify');
    setMsg(res.data?.message ?? 'We emailed a 6-digit code.');
    ctx.toast('Verification code sent to your email');
  }

  async function verifyUnlock(code: string) {
    if (!/^\d{6}$/.test(code)) {
      ctx.toast('Enter the full 6-digit code', 'error');
      return;
    }
    setBusy(true);
    const res = await verifySensitiveOtp('profile_change', code);
    setBusy(false);
    if (!res.ok) {
      ctx.toast(res.error ?? 'Invalid or expired code', 'error');
      return;
    }
    setLocked(false);
    setStep('idle');
    setMsg(null);
    ctx.toast('Profile unlocked — you can edit now');
  }

  if (!locked) return <>{children}</>;

  if (step === 'verify') {
    return (
      <OtpEntry
        message={msg}
        busy={busy}
        onVerify={(code) => void verifyUnlock(code)}
        onResend={() => void requestUnlock()}
        onCancel={() => {
          setStep('idle');
          setMsg(null);
        }}
      />
    );
  }

  return (
    <View style={s.lockBox}>
      <View style={s.lockIcon}>
        <Lock size={20} color={colors.white} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.lockTitle} numberOfLines={2}>
          Profile locked <ShieldCheck size={14} color={p.primary} />
        </Text>
        <Text style={s.lockDesc}>
          Fields are protected after save. Unlock with an email code to edit.
        </Text>
        <Button
          label="Edit profile"
          variant="outline"
          onPress={() => void requestUnlock()}
          loading={busy}
          disabled={busy}
          style={s.lockBtn}
        />
      </View>
    </View>
  );
}

function ProfileSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { row, loaded, values, displayName, email, user } = useProfile();
  const [avatarBusy, setAvatarBusy] = useState(false);

  const hasProfileData = Boolean(row?.phone || row?.bio || row?.city || row?.date_of_birth);
  const avatarUrl = row?.avatar_url ?? null;
  const avatarUri = avatarUrl
    ? avatarUrl.startsWith('data:')
      ? avatarUrl
      : `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${row?.avatar_version ?? 0}`
    : null;
  const label = displayName || email || 'Member';

  async function removeAvatar() {
    if (!user) return;
    setAvatarBusy(true);
    const payload = {
      avatar_url: null,
      avatar_version: Date.now(),
      updated_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) {
        if (isOfflineError(new Error(error.message))) {
          await enqueueOp({
            table: 'profiles',
            action: 'update',
            match: { id: user.id },
            payload,
          });
          ctx.toast('Saved — will sync when you’re back online.');
          return;
        }
        ctx.toast(error.message, 'error');
        return;
      }
      try {
        await supabase.auth.updateUser({ data: { avatar_url: null } });
      } catch {
        /* metadata optional */
      }
      ctx.toast('Profile picture removed.');
    } catch (e) {
      if (isOfflineError(e)) {
        await enqueueOp({
          table: 'profiles',
          action: 'update',
          match: { id: user.id },
          payload,
        });
        ctx.toast('Saved — will sync when you’re back online.');
        return;
      }
      ctx.toast('Could not update profile picture', 'error');
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <>
      <Panel
        title="Profile photo"
        description="Shown to circle members. JPG or PNG · up to 5MB."
      >
        {!loaded ? (
          <LoadingRow />
        ) : (
          <View style={s.avatarRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImg} accessibilityLabel={label} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarInitials}>{initialsOf(label)}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.rowLabel} numberOfLines={1}>
                {label}
              </Text>
              <Text style={s.rowDesc} numberOfLines={1}>
                {email ?? ''}
              </Text>
              {avatarUrl ? (
                <Button
                  label="Remove"
                  variant="outline"
                  onPress={() => void removeAvatar()}
                  loading={avatarBusy}
                  disabled={avatarBusy}
                  style={s.removeBtn}
                />
              ) : null}
            </View>
          </View>
        )}
      </Panel>

      <Panel
        title="Public profile"
        description="Locked after first save — unlock with an email code to edit."
      >
        {!loaded ? (
          <LoadingRow />
        ) : (
          <ProfileGate initiallyLocked={hasProfileData} ctx={ctx}>
            <ProfileFormCard initial={values} ctx={ctx} />
          </ProfileGate>
        )}
      </Panel>
    </>
  );
}

function PersonalInformationSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { row, loaded, values } = useProfile();

  return (
    <Panel
      title="Personal information"
      description="Your core account details. Currency display is managed under Preferences."
    >
      {!loaded ? (
        <LoadingRow />
      ) : (
        <>
          <ProfileFormCard initial={values} ctx={ctx} />
          {row?.username != null ? (
            <Text style={s.usernameLine}>
              Username: <Text style={s.usernameValue}>{row.username}</Text>
            </Text>
          ) : null}
        </>
      )}
    </Panel>
  );
}

/* ─── Email & verification ─── */

function EmailSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { user } = useAuth();
  const [mode, setMode] = useState<'view' | 'change'>('view');
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const email = user?.email ?? '';
  const verified = Boolean((user as any)?.email_confirmed_at);

  async function onChangeEmail() {
    const clean = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      ctx.toast('Enter a valid email address.', 'error');
      return;
    }
    if (clean === email.toLowerCase()) {
      ctx.toast('That is already your email.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: clean });
      if (error) {
        ctx.toast(error.message, 'error');
        return;
      }
      ctx.toast('Check your new inbox for a confirmation link.');
      setNewEmail('');
      setMode('view');
    } catch {
      ctx.toast('Network error — could not change email', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        ctx.toast('Could not send verification email', 'error');
        return;
      }
      ctx.toast('Verification email sent.');
    } catch {
      ctx.toast('Could not send verification email', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Email address"
      description="Used to sign in and receive important account messages."
    >
      <Text style={s.emailValue}>{email}</Text>
      {verified ? (
        <View style={s.verifiedRow}>
          <BadgeCheck size={16} color={p.primary} />
          <Text style={s.verifiedText}>Verified</Text>
        </View>
      ) : (
        <View style={s.warnBox}>
          <Text style={s.warnTitle}>
            Email not verified
          </Text>
          <Text style={s.warnText}>Verify your email to protect your account.</Text>
          <Button
            label="Verify email"
            variant="outline"
            onPress={() => void onResend()}
            loading={busy}
            disabled={busy}
            style={s.lockBtn}
          />
        </View>
      )}

      {mode === 'view' ? (
        <Button
          label="Change email"
          variant="outline"
          onPress={() => setMode('change')}
          style={s.blockBtn}
        />
      ) : (
        <View style={s.changeForm}>
          <Field label="New email address">
            <TextInput
              style={s.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="you@example.com"
              placeholderTextColor={p.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </Field>
          <View style={s.btnRow}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => {
                setNewEmail('');
                setMode('view');
              }}
              style={s.flexBtn}
            />
            <Button
              label="Send link"
              onPress={() => void onChangeEmail()}
              loading={busy}
              disabled={busy}
              style={s.flexBtn}
            />
          </View>
        </View>
      )}

      {!verified && mode === 'view' ? (
        <Button
          label="Resend verification email"
          variant="ghost"
          onPress={() => void onResend()}
          loading={busy}
          disabled={busy}
          style={s.blockBtn}
        />
      ) : null}
    </Panel>
  );
}

/* ─── Security ─── */

function SecuritySection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { user, email, signOut } = useAuth();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);

  const identities = ((user as any)?.app_metadata?.identities ??
    (user as any)?.identities ??
    []) as { provider?: string }[];
  const googleConnected = identities.some((i) => i.provider === 'google');

  async function requestCode() {
    setFormError(null);
    setSending(true);
    const res = await apiPost(
      '/api/mobile/password',
      { action: 'request' },
      {
        networkError: 'Network error — could not send code',
        failError: 'Could not send verification code',
      }
    );
    setSending(false);
    if (!res.ok) {
      setFormError(res.error ?? 'Could not send verification code');
      return;
    }
    setStep('verify');
    ctx.toast(res.data?.success ?? 'We emailed a 6-digit code. Enter it to continue.');
  }

  async function verifyAndSet() {
    setFormError(null);
    if (!/^\d{6}$/.test(otp)) {
      setFormError('Enter the 6-digit code we emailed you.');
      return;
    }
    if (pw.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    if (pw !== pw2) {
      setFormError('Passwords do not match');
      return;
    }
    setVerifying(true);
    const res = await apiPost(
      '/api/mobile/password',
      { action: 'verify', code: otp, password: pw, confirm_password: pw2 },
      {
        networkError: 'Network error — could not update password',
        failError: 'Could not update password',
      }
    );
    setVerifying(false);
    if (!res.ok) {
      setFormError(res.error ?? 'Invalid or expired code.');
      return;
    }
    const message = res.data?.success ?? 'Password updated. Sign in with your new password.';
    setStep('request');
    setOtp('');
    setPw('');
    setPw2('');
    ctx.toast(message);
    setTimeout(() => {
      void signOut();
    }, 1600);
  }

  function signOutOthers() {
    void (async () => {
      const ok = await ctx.confirm(
        'Sign out other devices?',
        'This will sign out every other device. You stay signed in here.',
        { confirmLabel: 'Sign out others', danger: true }
      );
      if (!ok) return;
      setSignOutBusy(true);
      try {
        const { error } = await supabase.auth.signOut({ scope: 'others' });
        if (error) ctx.toast(error.message, 'error');
        else ctx.toast('Other devices signed out');
      } catch {
        ctx.toast('Network error — other devices were not signed out', 'error');
      } finally {
        setSignOutBusy(false);
      }
    })();
  }

  return (
    <>
      <Group title="Sign-in methods">
        <Row
          icon={KeyRound}
          label="Password"
          description="Change your password (email OTP required)"
        />
        <Row
          icon={Mail}
          label="Email OTP"
          description="Used for secure verification in Turna"
          value="On"
        />
        <Row
          icon={Cloud}
          label="Google"
          description={googleConnected ? 'Connected to your Google account' : 'Not connected'}
          value={googleConnected ? 'Connected' : 'Not connected'}
        />
      </Group>

      <Panel
        title="Change password"
        description="We email you a one-time code first — no reset links inside the app."
      >
        <Text style={s.panelDesc}>
          We email a 6-digit code to your account first — then you set a new password. Password
          changes always require OTP verification.
        </Text>

        {step === 'request' ? (
          <Button
            label={sending ? 'Sending code…' : 'Email me a code'}
            onPress={() => void requestCode()}
            loading={sending}
            disabled={sending}
          />
        ) : (
          <View>
            <Field label="6-digit code">
              <TextInput
                style={[s.input, s.otpInput]}
                value={otp}
                onChangeText={(v: string) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor={p.textMuted}
                autoComplete="one-time-code"
              />
            </Field>
            <Field label="New password">
              <View style={s.pwWrap}>
                <TextInput
                  style={[s.input, s.pwInput]}
                  value={pw}
                  onChangeText={setPw}
                  secureTextEntry={!showPw}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={p.textMuted}
                  autoComplete="new-password"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPw((v) => !v)}
                  style={s.pwEye}
                >
                  {showPw ? (
                    <EyeOff size={18} color={p.textMuted} />
                  ) : (
                    <Eye size={18} color={p.textMuted} />
                  )}
                </Pressable>
              </View>
            </Field>
            <Field label="Confirm new password">
              <TextInput
                style={s.input}
                value={pw2}
                onChangeText={setPw2}
                secureTextEntry={!showPw}
                placeholder="Repeat password"
                placeholderTextColor={p.textMuted}
                autoComplete="new-password"
              />
            </Field>
            <Button
              label="Verify & update password"
              onPress={() => void verifyAndSet()}
              loading={verifying}
              disabled={verifying}
              style={s.blockBtn}
            />
            <View style={s.btnRow}>
              <Button
                label="Use a new code"
                variant="outline"
                onPress={() => {
                  setStep('request');
                  setOtp('');
                  setFormError(null);
                }}
                style={s.flexBtn}
              />
              <Button
                label={sending ? 'Sending…' : 'Resend code'}
                variant="ghost"
                onPress={() => void requestCode()}
                loading={sending}
                disabled={sending}
                style={s.flexBtn}
              />
            </View>
          </View>
        )}
        {formError ? <ErrorBox message={formError} /> : null}
      </Panel>

      <Panel title="Active sessions" description="Devices currently signed into your account.">
        <Row
          icon={MonitorSmartphone}
          label="This device"
          description={`Current session · signed in as ${email ?? ''}`}
          value="Active now"
        />
        <Text style={s.userId}>{(user as any)?.id ?? ''}</Text>
        <Text style={s.hintSmall}>
          Sign out all other devices if you don&apos;t recognize a session.
        </Text>
        <Button
          label={signOutBusy ? 'Signing out…' : 'Sign out others'}
          variant="outline"
          onPress={signOutOthers}
          loading={signOutBusy}
          disabled={signOutBusy}
          style={s.blockBtn}
        />
      </Panel>

      <Panel
        title="Re-authentication"
        description="Sensitive actions (payout order, account deletion) may ask for your password or email OTP again."
      >
        <View style={s.inlineHead}>
          <ShieldCheck size={16} color={p.primary} />
          <Text style={s.inlineDesc}>
            Email OTP and password re-auth are enabled for high-risk changes.
          </Text>
        </View>
      </Panel>

      <Panel title="Two-step verification">
        <Text style={s.para}>Coming later. Email OTP already protects sensitive actions.</Text>
      </Panel>
    </>
  );
}

/* ─── Payout account ─── */

type Bank = { code: string; name: string };

type SavedAccount = {
  id?: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default?: boolean;
};

function PayoutSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { user } = useAuth();
  const [account, setAccount] = useState<SavedAccount | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolvedManually, setResolvedManually] = useState(false);
  const [manualNeeded, setManualNeeded] = useState(false);
  const [manualName, setManualName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [otpStep, setOtpStep] = useState<'idle' | 'verify'>('idle');
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('bank_accounts')
          .select('id, bank_code, bank_name, account_number, account_name, is_default')
          .eq('user_id', user?.id ?? '')
          .eq('is_default', true)
          .maybeSingle();
        if (!alive) return;
        if (data) {
          const saved = data as SavedAccount;
          setAccount(saved);
          setLocked(true);
          setBankCode(saved.bank_code);
          setAccountNumber(saved.account_number);
          setResolvedName(saved.account_name);
        }
      } catch {
        /* offline — start empty */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${APP_API_URL}/api/banks`);
        const data = await res.json();
        if (alive && Array.isArray(data.banks)) {
          const list = data.banks as Bank[];
          setBanks(list);
          setBankCode((current) => {
            if (current) return current;
            const gtb = list.find((b) => /guaranty|gtb/i.test(b.name));
            return gtb?.code ?? list[0]?.code ?? '';
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canResolve = /^\d{10}$/.test(accountNumber) && bankCode.length > 0;
  const bankLabel = banks.find((b) => b.code === bankCode)?.name ?? '';

  async function requestUnlockOtp() {
    setOtpBusy(true);
    setOtpMsg(null);
    const res = await requestSensitiveOtp('bank_change');
    setOtpBusy(false);
    if (!res.ok) {
      ctx.toast(res.error ?? 'Could not send code', 'error');
      return;
    }
    setOtpStep('verify');
    setOtpMsg(res.data?.message ?? 'We emailed a 6-digit code. Enter it to unlock.');
    ctx.toast('Verification code sent to your email');
  }

  async function verifyUnlockOtp(code: string) {
    if (!/^\d{6}$/.test(code)) {
      ctx.toast('Enter the full 6-digit code', 'error');
      return;
    }
    setOtpBusy(true);
    const res = await verifySensitiveOtp('bank_change', code);
    setOtpBusy(false);
    if (!res.ok) {
      ctx.toast(res.error ?? 'Invalid or expired code', 'error');
      return;
    }
    setLocked(false);
    setResolvedName('');
    setResolvedManually(false);
    setManualNeeded(false);
    setManualName('');
    setOtpStep('idle');
    setOtpMsg(null);
    ctx.toast('Bank details unlocked — you can edit now');
  }

  async function handleResolve() {
    if (!canResolve) return;
    setResolving(true);
    setResolvedName('');
    setResolvedManually(false);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`${APP_API_URL}/api/banks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          account_number: accountNumber,
          bank_code: bankCode,
          ...(manualNeeded && manualName.trim()
            ? { account_name: manualName.trim() }
            : {}),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        account?: { account_name?: string };
        error?: string;
        manual?: boolean;
      };
      if (res.ok) {
        const name = String(json.account?.account_name ?? '').trim();
        setResolving(false);
        if (!name) {
          ctx.toast('Could not verify account', 'error');
          return;
        }
        setResolvedName(name);
        setResolvedManually(Boolean(json.manual));
        setManualNeeded(false);
        ctx.toast(json.manual ? 'Account name confirmed' : 'Account name verified');
        return;
      }
      setResolving(false);
      if (res.status === 503 && json.manual) {
        setManualNeeded(true);
        ctx.toast('Enter the account name to continue', 'error');
        return;
      }
      ctx.toast(json.error ?? 'Could not verify account', 'error');
    } catch {
      setResolving(false);
      ctx.toast('Network error resolving account', 'error');
    }
  }

  async function handleSave() {
    if (locked) return;
    if (!resolvedName) {
      ctx.toast('Confirm the account name first', 'error');
      return;
    }
    setSaving(true);
    const res = await apiPost(
      '/api/bank-accounts',
      {
        bank_code: bankCode,
        bank_name: bankLabel,
        account_number: accountNumber,
        account_name: resolvedName,
      },
      { networkError: 'Network error saving account', failError: 'Could not save account' }
    );
    setSaving(false);
    if (!res.ok) {
      ctx.toast(res.error ?? 'Could not save account', 'error');
      return;
    }
    setLocked(true);
    setAccount({
      bank_code: bankCode,
      bank_name: bankLabel,
      account_number: accountNumber,
      account_name: resolvedName,
      is_default: true,
    });
    ctx.toast('Payout account saved and locked — future payouts go here');
  }

  if (!loaded) {
    return (
      <Panel
        title="Payout account"
        description="Bank account where circle payouts are sent. Transfers are arranged directly with the circle admin."
      >
        <LoadingRow />
      </Panel>
    );
  }

  if (locked && account) {
    return (
      <Panel
        title="Payout account"
        description="Bank account where circle payouts are sent. Transfers are arranged directly with the circle admin."
      >
        <View style={s.lockBox}>
          <View style={s.lockIcon}>
            <Lock size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.lockTitle} numberOfLines={2}>
              Bank account locked <ShieldCheck size={14} color={p.primary} />
            </Text>
            <Text style={s.lockDesc}>
              Saved details are protected. Unlock with an email code to edit.
            </Text>
            <View style={s.accountBox}>
              <Text style={s.accountName}>{account.account_name}</Text>
              <Text style={s.accountMeta}>
                {account.bank_name} · {account.account_number}
              </Text>
            </View>
          </View>
        </View>

        {otpStep === 'idle' ? (
          <Button
            label="Edit bank details"
            variant="outline"
            onPress={() => void requestUnlockOtp()}
            loading={otpBusy}
            disabled={otpBusy}
            style={s.blockBtn}
          />
        ) : (
          <OtpEntry
            message={otpMsg}
            busy={otpBusy}
            onVerify={(code) => void verifyUnlockOtp(code)}
            onResend={() => void requestUnlockOtp()}
            onCancel={() => {
              setOtpStep('idle');
              setOtpMsg(null);
            }}
          />
        )}
      </Panel>
    );
  }

  return (
    <Panel
      title="Payout account"
      description="Bank account where circle payouts are sent. Transfers are arranged directly with the circle admin."
    >
      <AppSelect
        label="Bank"
        value={bankCode}
        onChange={(v) => {
          setBankCode(v);
          setResolvedName('');
          setResolvedManually(false);
          setManualNeeded(false);
          setManualName('');
        }}
        options={
          banks.length > 0
            ? banks.map((b) => ({ value: b.code, label: b.name }))
            : [{ value: '', label: 'Loading banks…' }]
        }
        placeholder="Select bank"
        style={s.select}
      />
      <Field label="Account number">
        <View style={s.inlineInput}>
          <TextInput
            style={[s.input, s.flexWide]}
            value={accountNumber}
            onChangeText={(v: string) => {
              setAccountNumber(v.replace(/\D/g, '').slice(0, 10));
              setResolvedName('');
              setResolvedManually(false);
              setManualNeeded(false);
              setManualName('');
            }}
            keyboardType="numeric"
            maxLength={10}
            placeholder="0123456789"
            placeholderTextColor={p.textMuted}
          />
          <Button
            label={manualNeeded ? 'Confirm' : 'Verify'}
            variant="outline"
            onPress={() => void handleResolve()}
            loading={resolving}
            disabled={
              !canResolve || resolving || (manualNeeded && !manualName.trim())
            }
            style={s.verifyBtn}
          />
        </View>
      </Field>

      {manualNeeded && !resolvedName ? (
        <Field label="Account name">
          <TextInput
            style={s.input}
            value={manualName}
            onChangeText={(v: string) => setManualName(v.slice(0, 120))}
            placeholder="Name exactly as on your statement"
            placeholderTextColor={p.textMuted}
            autoCapitalize="words"
          />
        </Field>
      ) : null}

      {resolvedName ? (
        <View style={s.infoBox}>
          <CheckCircle2 size={16} color={p.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.infoTitle}>{resolvedName}</Text>
            <Text style={s.infoMeta}>
              {bankLabel} · {accountNumber}
              {resolvedManually ? ' — confirmed by you' : ' — verified'}
            </Text>
          </View>
        </View>
      ) : resolving ? (
        <View style={s.pendingBox}>
          <ActivityIndicator size="small" color={p.primary} />
          <Text style={s.pendingText}>Checking account name…</Text>
        </View>
      ) : null}

      <Button
        label={saving ? 'Saving…' : 'Save payout account'}
        onPress={() => void handleSave()}
        loading={saving}
        disabled={!resolvedName || saving}
        style={s.blockBtn}
      />
      <Text style={s.hintSmall}>
        After saving, this account locks. You&apos;ll need an email code to change it later. We
        only store bank code, number, and the account name.
      </Text>
    </Panel>
  );
}

/* ─── Identity (KYC) ─── */

type KycRow = {
  status?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  full_legal_name?: string | null;
  rejection_reason?: string | null;
};

function KycSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { user } = useAuth();
  const [kyc, setKyc] = useState<KycRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [docType, setDocType] = useState('nin');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('kyc_records')
          .select('status, document_type, document_number, full_legal_name, rejection_reason')
          .eq('user_id', user?.id ?? '')
          .maybeSingle();
        if (!alive) return;
        const row = (data as KycRow | null) ?? null;
        setKyc(row);
        setDocType(row?.document_type ?? 'nin');
        setDocNumber(row?.document_number ?? '');
        setFullName(row?.full_legal_name ?? '');
      } catch {
        /* offline — start empty */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const approved = kyc?.status === 'approved';
  const status = kyc?.status ?? null;
  const tone =
    status === 'approved'
      ? 'active'
      : status === 'pending'
        ? 'pending'
        : status === 'rejected'
          ? 'error'
          : 'muted';

  async function submit() {
    setFormError(null);
    if (!['nin', 'bvn', 'id_card'].includes(docType)) {
      setFormError('Choose a document type');
      return;
    }
    if (docNumber.trim().length < 6) {
      setFormError('Enter a valid document number');
      return;
    }
    if (fullName.trim().length < 3) {
      setFormError('Enter your full legal name');
      return;
    }
    if (!user) return;

    setBusy(true);
    try {
      const { data: existing } = await supabase
        .from('kyc_records')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing?.status === 'approved') {
        setFormError('KYC already approved');
        return;
      }
      const payload = {
        user_id: user.id,
        document_type: docType,
        document_number: docNumber.trim(),
        full_legal_name: fullName.trim(),
        status: 'pending',
        rejection_reason: null,
      };
      const { error } = existing
        ? await supabase.from('kyc_records').update(payload).eq('id', existing.id)
        : await supabase.from('kyc_records').insert(payload);
      if (error) {
        if (isOfflineError(new Error(error.message))) {
          await enqueueOp({
            table: 'kyc_records',
            action: existing ? 'update' : 'insert',
            match: existing ? { id: existing.id } : undefined,
            payload,
          });
          ctx.toast('Saved — will sync when you’re back online.');
          return;
        }
        setFormError('Could not submit KYC');
        return;
      }
      setKyc({
        status: 'pending',
        document_type: docType,
        document_number: docNumber.trim(),
        full_legal_name: fullName.trim(),
        rejection_reason: null,
      });
      ctx.toast('KYC submitted for review');
    } catch (e) {
      if (isOfflineError(e)) {
        await enqueueOp({
          table: 'kyc_records',
          action: 'insert',
          payload: {
            user_id: user.id,
            document_type: docType,
            document_number: docNumber.trim(),
            full_legal_name: fullName.trim(),
            status: 'pending',
          },
        });
        ctx.toast('Saved — will sync when you’re back online.');
        return;
      }
      setFormError('Could not submit KYC');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Identity (KYC)"
      description="Verify your identity with NIN, BVN, or an ID card before large payouts."
    >
      {!loaded ? (
        <LoadingRow />
      ) : (
        <>
          <View style={s.statusRow}>
            <Text style={s.statusLabel}>Current status</Text>
            <Badge label={status ? `KYC ${status}` : 'KYC not submitted'} tone={tone as any} />
          </View>
          <View style={s.inlineHead}>
            <ShieldCheck size={16} color={p.primary} />
            <Text style={s.inlineDesc}>Status: {status ?? 'not submitted'}</Text>
          </View>
          {kyc?.rejection_reason ? (
            <Text style={s.rejectText}>{kyc.rejection_reason}</Text>
          ) : null}

          <AppSelect
            label="Document type"
            value={docType}
            onChange={setDocType}
            options={[
              { value: 'nin', label: 'NIN' },
              { value: 'bvn', label: 'BVN' },
              { value: 'id_card', label: 'ID card number' },
            ]}
            disabled={approved}
            style={s.select}
          />
          <Field label="Document number">
            <TextInput
              style={s.input}
              value={docNumber}
              onChangeText={setDocNumber}
              editable={!approved}
              placeholder="11-digit number"
              placeholderTextColor={p.textMuted}
              maxLength={30}
            />
          </Field>
          <Field label="Full legal name">
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              editable={!approved}
              placeholder="As it appears on your document"
              placeholderTextColor={p.textMuted}
              maxLength={120}
              autoComplete="name"
            />
          </Field>
          {formError ? <ErrorBox message={formError} /> : null}
          {approved ? (
            <Text style={s.hintSmall}>
              Your identity is verified. No further action needed.
            </Text>
          ) : (
            <Button
              label={busy ? 'Submitting…' : 'Submit for review'}
              onPress={() => void submit()}
              loading={busy}
              disabled={busy}
              style={s.blockBtn}
            />
          )}
        </>
      )}
    </Panel>
  );
}

/* ─── Preferences sections (user_preferences keys from web) ─── */

function NotificationsSection({ ctx }: { ctx: Ctx }) {
  const { prefs, save } = usePreferences(ctx);
  const rows: {
    key: string;
    label: string;
    description: string;
    fallback: boolean;
    disabled?: boolean;
    note?: string;
  }[] = [
    {
      key: 'push_notifications',
      label: 'Push notifications',
      description: 'Receive important updates on this device',
      fallback: true,
    },
    {
      key: 'email_notifications',
      label: 'Email notifications',
      description: 'Account and money updates by email',
      fallback: true,
    },
    {
      key: 'contribution_reminders',
      label: 'Contribution reminders',
      description: 'When a contribution is coming up',
      fallback: true,
    },
    {
      key: 'payout_reminders',
      label: 'Payout reminders',
      description: 'When a payout is approaching',
      fallback: true,
    },
    {
      key: 'circle_activity',
      label: 'Circle activity',
      description: 'Joins, role changes, and cycle updates',
      fallback: true,
    },
    {
      key: 'security_alerts',
      label: 'Security alerts',
      description: 'Login, password, and account events',
      fallback: true,
      disabled: true,
      note: 'Always on — security events cannot be disabled.',
    },
    {
      key: 'marketing',
      label: 'Marketing & announcements',
      description: 'Product news and offers',
      fallback: false,
    },
  ];

  return (
    <Panel title="Notifications" description="Choose how Turna keeps you in the loop.">
      <Group>
        {rows.map((r) => (
          <ToggleRow
            key={r.key}
            label={r.label}
            description={r.description}
            note={r.note}
            disabled={r.disabled}
            value={
              r.key === 'security_alerts'
                ? true
                : r.key === 'marketing'
                  ? isBool(prefs[r.key], false)
                  : isBool(prefs[r.key], r.fallback)
            }
            onValueChange={(next) => void save({ [r.key]: next })}
          />
        ))}
      </Group>
    </Panel>
  );
}

function AppearanceSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { prefs, save } = usePreferences(ctx);
  const theme = isStr(prefs.theme, 'system');
  const reduceMotion = isBool(prefs.reduce_motion, false);

  return (
    <>
      <Panel title="Theme" description="Turna keeps its identity in light and dark.">
        <Group>
          {[
            { value: 'system', label: 'System', description: 'Match your device' },
            { value: 'light', label: 'Light', description: 'Bright and clear' },
            { value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
          ].map((o) => (
            <RadioRow
              key={o.value}
              label={o.label}
              description={o.description}
              checked={theme === o.value}
              onPress={() => void save({ theme: o.value })}
            />
          ))}
        </Group>
        <Text style={s.hintSmall}>Saved to your account and applied right away.</Text>
      </Panel>

      <Panel title="Motion">
        <Group>
          <ToggleRow
            label="Reduce motion"
            description="Minimise page and navigation animations"
            value={reduceMotion}
            onValueChange={(next) => void save({ reduce_motion: next })}
          />
        </Group>
        <Text style={s.hintSmall}>
          Turns off entrance fades, button presses, and toast slides — including the system
          motion setting when this is off.
        </Text>
      </Panel>
    </>
  );
}

function LanguageSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { prefs, save } = usePreferences(ctx);
  const current = isStr(prefs.language, 'en');
  return (
    <Panel
      title="App language"
      description="Only languages that are actually implemented are listed."
    >
      <Group>
        <RadioRow
          label="English"
          description="Fully supported"
          checked={current === 'en'}
          onPress={() => void save({ language: 'en' })}
        />
      </Group>
      <Text style={s.hintSmall}>
        Yorùbá, Hausa, Igbo, and French are planned — they will appear here once translated.
      </Text>
    </Panel>
  );
}

function CurrencySection({ ctx }: { ctx: Ctx }) {
  const { prefs, save } = usePreferences(ctx);
  const current = isStr(prefs.currency, 'NGN');
  const options = [
    { value: 'NGN', label: '₦ Nigerian Naira (NGN)', description: 'Default' },
    { value: 'GHS', label: 'GHS — Ghanaian Cedi', description: 'Display only' },
    { value: 'KES', label: 'KES — Kenyan Shilling', description: 'Display only' },
    { value: 'USD', label: 'USD — US Dollar', description: 'Display only' },
  ];
  return (
    <Panel
      title="Default currency"
      description="Affects how amounts are displayed. It does not convert contribution records."
    >
      <Group>
        {options.map((o) => (
          <RadioRow
            key={o.value}
            label={o.label}
            description={o.description}
            checked={current === o.value}
            onPress={() => void save({ currency: o.value })}
          />
        ))}
      </Group>
    </Panel>
  );
}

function CirclePreferencesSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { prefs, save } = usePreferences(ctx);
  const frequency = isStr(prefs.default_frequency, 'weekly');
  const lead = isNum(prefs.reminder_lead_hours, 24);
  const showCompleted = isBool(prefs.show_completed_circles, true);

  return (
    <>
      <Panel
        title="Circle preferences"
        description="Defaults for newly created circles. Existing circles are not changed automatically."
      >
        <SectionLabel>Default contribution frequency</SectionLabel>
        <Group>
          {[
            { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Bi-weekly' },
            { value: 'monthly', label: 'Monthly' },
          ].map((o) => (
            <RadioRow
              key={o.value}
              label={o.label}
              checked={frequency === o.value}
              onPress={() => void save({ default_frequency: o.value })}
            />
          ))}
        </Group>

        <SectionLabel>Contribution reminder lead time</SectionLabel>
        <Group>
          {[
            { value: 24, label: '24 hours before', description: 'Default' },
            { value: 48, label: '48 hours before' },
            { value: 0, label: 'Day of contribution only' },
          ].map((o) => (
            <RadioRow
              key={o.value}
              label={o.label}
              description={o.description}
              checked={lead === o.value}
              onPress={() => void save({ reminder_lead_hours: o.value })}
            />
          ))}
        </Group>

        <Group>
          <ToggleRow
            label="Show completed circles"
            description="Keep finished circles visible in your list"
            value={showCompleted}
            onValueChange={(next) => void save({ show_completed_circles: next })}
          />
        </Group>
      </Panel>

      <Group title="Related">
        <Row
          icon={Bell}
          label="Contribution reminders"
          description="Which reminders you receive"
          onPress={() => ctx.go('settings/reminders')}
        />
        <Row
          icon={Lock}
          label="Privacy"
          description="Visibility and data controls"
          onPress={() => ctx.go('settings/privacy')}
        />
      </Group>

      <Text style={s.hintSmall}>
        Lead time applies to new reminder schedules. Circle members keep their own notification
        prefs.
      </Text>
    </>
  );
}

function RemindersSection({ ctx }: { ctx: Ctx }) {
  const { prefs, save } = usePreferences(ctx);
  const time = isStr(prefs.reminder_time, '18:00');
  const toggles: { key: string; label: string; description: string }[] = [
    {
      key: 'contribution_due',
      label: 'Contribution due',
      description: 'When a contribution window opens',
    },
    { key: 'day_before', label: '1 day before', description: 'Head-up before the due date' },
    { key: 'due_today', label: 'Due today', description: 'Morning of the contribution day' },
    {
      key: 'overdue',
      label: 'Overdue contribution',
      description: 'If a contribution is still unpaid',
    },
    {
      key: 'payout_approaching',
      label: 'Payout approaching',
      description: 'When your turn is coming up',
    },
  ];

  return (
    <Panel
      title="Contribution reminders"
      description="Control which alerts you get and when they arrive."
    >
      <Group>
        {toggles.map((t) => (
          <ToggleRow
            key={t.key}
            label={t.label}
            description={t.description}
            value={isBool(prefs[t.key], true)}
            onValueChange={(next) => void save({ [t.key]: next })}
          />
        ))}
      </Group>

      <SectionLabel>Reminder time</SectionLabel>
      <Group>
        {['08:00', '12:00', '18:00', '20:00'].map((t) => (
          <RadioRow
            key={t}
            label={t}
            description={t === '18:00' ? 'Default' : undefined}
            checked={time === t}
            onPress={() => void save({ reminder_time: t })}
          />
        ))}
      </Group>
    </Panel>
  );
}

function PrivacySection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { prefs, save } = usePreferences(ctx);
  const profileVis = isStr(prefs.profile_visibility, 'members');
  const activityVis = isStr(prefs.activity_visibility, 'members');
  const dataSharing = isBool(prefs.data_sharing, false);

  return (
    <>
      <Panel
        title="Privacy"
        description="Turna only collects what is needed to run circles, track contributions, secure your account, and meet legal requirements."
      >
        <SectionLabel>Profile visibility</SectionLabel>
        <Group>
          <RadioRow
            label="Circle members only"
            checked={profileVis === 'members'}
            onPress={() => void save({ profile_visibility: 'members' })}
          />
          <RadioRow
            label="Only me"
            checked={profileVis === 'private'}
            onPress={() => void save({ profile_visibility: 'private' })}
          />
        </Group>

        <SectionLabel>Activity visibility</SectionLabel>
        <Group>
          <RadioRow
            label="Circle members"
            checked={activityVis === 'members'}
            onPress={() => void save({ activity_visibility: 'members' })}
          />
          <RadioRow
            label="Only me"
            checked={activityVis === 'private'}
            onPress={() => void save({ activity_visibility: 'private' })}
          />
        </Group>

        <Group>
          <ToggleRow
            label="Data sharing"
            description="Share anonymous product analytics to improve Turna"
            value={dataSharing}
            onValueChange={(next) => void save({ data_sharing: next })}
          />
        </Group>
      </Panel>

      <Group title="Your data">
        <Row
          icon={Trash2}
          label="Delete account"
          description="Remove personal data (ledger may be retained)"
          danger
          onPress={() => ctx.go('settings/delete')}
        />
        <Row
          icon={Download}
          label="Download my data"
          description="Request an export of your profile data"
          onPress={() =>
            openUrl(
              'mailto:support.turna@gmail.com?subject=Data%20export%20request',
              () => ctx.toast('Could not open your email app', 'error')
            )
          }
        />
        <Row
          icon={Lock}
          label="Ledger is append-only"
          description="Corrections create new events — history is never rewritten"
          onPress={ctx.push ? () => ctx.push?.({ name: 'ledger' }) : undefined}
        />
      </Group>

      <Text style={s.hintSmall}>Circle-level permissions are managed inside each circle.</Text>
    </>
  );
}

/* ─── Support sections ─── */

function HelpSection({ ctx }: { ctx: Ctx }) {
  return (
    <Panel title="Help & support" description="Find answers or reach the Turna team.">
      <Group>
        <Row
          icon={MessageSquare}
          label="Report a problem"
          description="Something broken or confusing"
          onPress={() => ctx.go('settings/report')}
        />
        <Row
          icon={Mail}
          label="Contact support"
          description="support.turna@gmail.com"
          onPress={() =>
            openUrl('mailto:support.turna@gmail.com', () =>
              ctx.toast('Could not open your email app', 'error')
            )
          }
        />
        <Row
          icon={FileText}
          label="Terms & privacy"
          description="Policies and guidelines"
          onPress={() => ctx.go('settings/legal')}
        />
        <Row
          icon={LifeBuoy}
          label="About Turna"
          description="Version and product info"
          onPress={() => ctx.go('settings/about')}
        />
      </Group>
    </Panel>
  );
}

const REPORT_CATEGORIES = [
  'Account',
  'Circle',
  'Contribution',
  'Payout',
  'Notification',
  'Security',
  'Technical issue',
  'Other',
];

function ReportSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical issue');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (description.trim().length < 10) {
      ctx.toast('Please describe the problem (at least 10 characters).', 'error');
      return;
    }
    setBusy(true);
    const res = await apiPost(
      '/api/support/report',
      { description: description.trim(), category },
      {
        networkError: 'Network error — report not sent',
        failError: 'Could not send report',
      }
    );
    setBusy(false);
    if (!res.ok) {
      ctx.toast(res.error ?? 'Could not send report', 'error');
      return;
    }
    ctx.toast('Report sent — thank you');
    setDescription('');
  }

  return (
    <Panel
      title="Report a problem"
      description="Tell us what went wrong. Include steps if you can."
    >
      <Field label="What happened?">
        <TextInput
          style={[s.input, s.inputArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the problem..."
          placeholderTextColor={p.textMuted}
          maxLength={2000}
          multiline
          textAlignVertical="top"
        />
      </Field>
      <AppSelect
        label="Category"
        value={category}
        onChange={setCategory}
        options={REPORT_CATEGORIES.map((c) => ({ value: c, label: c }))}
        style={s.select}
      />
      <Button
        label={busy ? 'Submitting…' : 'Submit report'}
        onPress={() => void submit()}
        loading={busy}
        disabled={busy}
        style={s.blockBtn}
      />
    </Panel>
  );
}

const LEGAL_LINKS = [
  { path: '/terms', label: 'Terms of Service' },
  { path: '/privacy', label: 'Privacy Policy' },
  { path: '/legal/acceptable-use', label: 'Community Guidelines' },
  { path: '/legal', label: 'Open-source licenses & legal' },
];

function LegalSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return (
    <>
      <Panel title="Terms & privacy" description="Legal documents for Turna.">
        <Group>
          {LEGAL_LINKS.map((l) => (
            <Row
              key={l.path}
              icon={FileText}
              label={l.label}
              onPress={() =>
                openUrl(`${APP_API_URL}${l.path}`, () =>
                  ctx.toast('Could not open that link', 'error')
                )
              }
            />
          ))}
        </Group>
      </Panel>
      <Text style={s.legalFoot}>
        Secure by design · Community first · Fair ledger rules · turnaapp.vercel.app
      </Text>
    </>
  );
}

function AboutSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  return (
    <Panel title="About Turna" description="Version and product info.">
      <View style={s.aboutHead}>
        <View style={s.aboutLogo}>
          <Text style={s.aboutLogoText}>T</Text>
        </View>
        <View>
          <Text style={s.aboutName}>Turna</Text>
          <Text style={s.aboutVersion}>
            Version {LOCAL_VERSION_NAME} · Build {LOCAL_VERSION_CODE}
          </Text>
        </View>
      </View>
      <Text style={s.para}>
        Turna helps communities coordinate traditional savings circles digitally with transparent
        records and clear contribution tracking.
      </Text>
      <Group>
        <Row
          icon={Globe}
          label="Website"
          description="turnaapp.vercel.app"
          onPress={() =>
            openUrl(`${APP_API_URL}`, () => ctx.toast('Could not open that link', 'error'))
          }
        />
        <Row
          icon={Mail}
          label="Contact"
          description="support.turna@gmail.com"
          onPress={() =>
            openUrl('mailto:support.turna@gmail.com', () =>
              ctx.toast('Could not open your email app', 'error')
            )
          }
        />
        <Row
          icon={FileText}
          label="Privacy Policy"
          onPress={() =>
            openUrl(`${APP_API_URL}/privacy`, () =>
              ctx.toast('Could not open that link', 'error')
            )
          }
        />
        <Row
          icon={FileText}
          label="Terms of Service"
          onPress={() =>
            openUrl(`${APP_API_URL}/terms`, () => ctx.toast('Could not open that link', 'error'))
          }
        />
      </Group>
      <Text style={s.hintSmall}>© 2026 Turna</Text>
    </Panel>
  );
}

function DeleteSection({ ctx }: { ctx: Ctx }) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { email, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function start() {
    void (async () => {
      const ok = await ctx.confirm(
        'Delete your account?',
        'This permanently deletes your account and personal data. You must not own any active circles. This action cannot be reversed.',
        { confirmLabel: 'Continue', danger: true }
      );
      if (!ok) return;
      setConfirmEmail('');
      setFieldError(null);
      setOpen(true);
    })();
  }

  async function submit() {
    const clean = confirmEmail.trim().toLowerCase();
    if (clean !== (email ?? '').toLowerCase()) {
      setFieldError('Type your account email exactly to confirm');
      return;
    }
    setFieldError(null);
    setBusy(true);
    const res = await apiPost(
      '/api/mobile/delete-account',
      { confirm_email: clean },
      { networkError: 'Network error — account not deleted', failError: 'Could not delete account. Contact support.' }
    );
    setBusy(false);
    if (!res.ok) {
      setFieldError(res.error ?? 'Could not delete account. Contact support.');
      return;
    }
    setOpen(false);
    ctx.toast('Account deleted');
    setTimeout(() => {
      void signOut();
    }, 1400);
  }

  return (
    <>
      <Panel
        title="Delete account"
        description="This permanently deletes your Turna account and associated personal data."
      >
        <View style={s.dangerNote}>
          <Text style={s.dangerNoteText}>
            Your circle records may need to be retained where required for other members,
            financial records, dispute resolution, or legal requirements. This action cannot be
            easily undone.
          </Text>
        </View>

        <View style={s.dangerCard}>
          <View style={s.dangerIcon}>
            <Trash2 size={20} color={p.error} />
          </View>
          <Text style={s.dangerTitle}>Delete account</Text>
          <Text style={s.dangerDesc}>
            Permanently removes your profile, notifications, and pending invitations. This cannot
            be undone.
          </Text>
          <Button
            label={busy ? 'Deleting…' : 'Delete my account'}
            variant="danger"
            onPress={start}
            loading={busy}
            disabled={busy}
            style={s.blockBtn}
          />
        </View>
      </Panel>

      <Popup
        visible={open}
        onClose={() => {
          if (busy) return;
          setOpen(false);
        }}
        title="Delete your account?"
        subtitle="Type your account email to confirm. This cannot be reversed."
        footer={
          <View style={s.btnRow}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => setOpen(false)}
              disabled={busy}
              style={s.flexBtn}
            />
            <Button
              label="Permanently delete account"
              variant="danger"
              onPress={() => void submit()}
              loading={busy}
              disabled={busy}
              style={s.flexBtn}
            />
          </View>
        }
      >
        <Field label="Type your email to confirm" error={fieldError}>
          <TextInput
            style={[s.input, fieldError && s.inputError]}
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder="you@example.com"
            placeholderTextColor={p.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="off"
          />
        </Field>
      </Popup>
    </>
  );
}

/** Fallback for the settings index route (web shell-nav list). */
function SettingsIndexSection({ ctx }: { ctx: Ctx }) {
  const groups: {
    title: string;
    items: { route: string; label: string; description: string; icon: React.ComponentType<any> }[];
  }[] = [
    {
      title: 'Account',
      items: [
        {
          route: 'settings/personal-information',
          label: 'Personal information',
          description: 'Name, username, country, currency',
          icon: User,
        },
        {
          route: 'settings/email',
          label: 'Email & verification',
          description: 'Sign-in email and verification status',
          icon: Mail,
        },
        {
          route: 'settings/security',
          label: 'Security',
          description: 'Password, OTP, active sessions',
          icon: Shield,
        },
        {
          route: 'settings/payout-account',
          label: 'Payout account',
          description: 'Bank account for receiving payouts',
          icon: Landmark,
        },
        {
          route: 'settings/kyc',
          label: 'Identity (KYC)',
          description: 'Verify identity for larger payouts',
          icon: BadgeCheck,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          route: 'settings/notifications',
          label: 'Notifications',
          description: 'Email, push, and in-app alerts',
          icon: Bell,
        },
        {
          route: 'settings/appearance',
          label: 'Appearance',
          description: 'Theme and motion',
          icon: SunMoon,
        },
        {
          route: 'settings/language',
          label: 'Language',
          description: 'App language',
          icon: Languages,
        },
        {
          route: 'settings/currency',
          label: 'Currency',
          description: 'How amounts are displayed',
          icon: Wallet,
        },
      ],
    },
    {
      title: 'Circle',
      items: [
        {
          route: 'settings/circle-preferences',
          label: 'Circle preferences',
          description: 'Defaults for newly created circles',
          icon: Users,
        },
        {
          route: 'settings/reminders',
          label: 'Contribution reminders',
          description: 'Timing and which reminders you get',
          icon: Clock,
        },
        {
          route: 'settings/privacy',
          label: 'Privacy',
          description: 'Visibility and data controls',
          icon: Lock,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          route: 'settings/help',
          label: 'Help & support',
          description: 'Guides and contact',
          icon: LifeBuoy,
        },
        {
          route: 'settings/report',
          label: 'Report a problem',
          description: 'Tell us what went wrong',
          icon: FileText,
        },
        {
          route: 'settings/legal',
          label: 'Terms & privacy',
          description: 'Legal documents',
          icon: FileText,
        },
        {
          route: 'settings/about',
          label: 'About Turna',
          description: 'Version and product info',
          icon: Info,
        },
      ],
    },
  ];

  return (
    <>
      {groups.map((g) => (
        <Group key={g.title} title={g.title}>
          {g.items.map((item) => (
            <Row
              key={item.route}
              icon={item.icon}
              label={item.label}
              description={item.description}
              onPress={() => ctx.go(item.route)}
            />
          ))}
        </Group>
      ))}
      <Group title="Danger zone">
        <Row
          icon={Trash2}
          label="Delete account"
          description="Remove personal data (ledger may be retained)"
          danger
          onPress={() => ctx.go('settings/delete')}
        />
      </Group>
    </>
  );
}

function renderSection(route: string, ctx: Ctx) {
  switch (route) {
    case 'settings/profile':
      return <ProfileSection ctx={ctx} />;
    case 'settings/personal-information':
      return <PersonalInformationSection ctx={ctx} />;
    case 'settings/email':
      return <EmailSection ctx={ctx} />;
    case 'settings/security':
      return <SecuritySection ctx={ctx} />;
    case 'settings/payout-account':
      return <PayoutSection ctx={ctx} />;
    case 'settings/kyc':
      return <KycSection ctx={ctx} />;
    case 'settings/notifications':
      return <NotificationsSection ctx={ctx} />;
    case 'settings/appearance':
      return <AppearanceSection ctx={ctx} />;
    case 'settings/language':
      return <LanguageSection ctx={ctx} />;
    case 'settings/currency':
      return <CurrencySection ctx={ctx} />;
    case 'settings/circle-preferences':
      return <CirclePreferencesSection ctx={ctx} />;
    case 'settings/reminders':
      return <RemindersSection ctx={ctx} />;
    case 'settings/privacy':
      return <PrivacySection ctx={ctx} />;
    case 'settings/help':
      return <HelpSection ctx={ctx} />;
    case 'settings/report':
      return <ReportSection ctx={ctx} />;
    case 'settings/legal':
      return <LegalSection ctx={ctx} />;
    case 'settings/about':
      return <AboutSection ctx={ctx} />;
    case 'settings/delete':
      return <DeleteSection ctx={ctx} />;
    default:
      return <SettingsIndexSection ctx={ctx} />;
  }
}

export function SettingsSubScreen({
  route,
  onBack,
  onPush,
}: {
  route: string;
  onBack: () => void;
  onPush?: (screen: any) => void;
}) {
  const { p, styles: s } = usePaletteStyles(makeS);
  const { confirm, node: confirmNode } = useConfirm();
  const { show, node: toastNode } = useToast();
  const [stack, setStack] = useState<string[]>([]);

  useEffect(() => {
    setStack([]);
  }, [route]);

  const active = stack.length > 0 ? stack[stack.length - 1] : route;
  const meta = ROUTE_META[active] ?? ROUTE_META.settings;

  const ctx: Ctx = {
    toast: (message, tone) => show(message, tone),
    confirm,
    go: (next) => {
      if (onPush) onPush({ name: 'settings-sub', route: next });
      else setStack((s) => [...s, next]);
    },
    push: onPush,
  };

  const back = () => {
    if (stack.length > 0) setStack((s) => s.slice(0, -1));
    else onBack();
  };

  return (
    <Screen tone="cream">
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <Button
          label="← Settings"
          variant="ghost"
          onPress={back}
          style={s.backBtn}
        />
        <View style={s.head}>
          <Text style={s.title}>{meta.title}</Text>
          <Text style={s.sub}>{meta.sub}</Text>
        </View>

        {renderSection(active, ctx)}

        {confirmNode}
        {toastNode}
      </ScrollView>
    </Screen>
  );
}

const makeS = (p: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    marginLeft: -8,
    marginBottom: -16,
    marginTop: -12,
  },
  head: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: p.text,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: typography.body,
    color: p.textMuted,
    marginTop: 4,
    lineHeight: 21,
  },
  panelTitle: {
    fontSize: typography.body + 1,
    fontWeight: '700',
    color: p.text,
    marginBottom: 2,
  },
  panelDesc: {
    fontSize: typography.caption,
    color: p.textMuted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    color: p.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  groupWrap: {
    marginBottom: spacing.sm,
  },
  groupCard: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    marginBottom: 0,
  },
  groupDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: p.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
  rowPressed: {
    opacity: 0.65,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconDanger: {
    backgroundColor: 'rgba(180,35,59,0.10)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: p.text,
  },
  rowLabelDanger: {
    color: p.error,
  },
  rowDesc: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  rowNote: {
    fontSize: 11,
    color: p.warning,
    marginTop: 4,
  },
  rowValue: {
    fontSize: 13,
    color: p.textMuted,
    flexShrink: 0,
    maxWidth: '40%',
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  trackOn: {
    backgroundColor: p.primarySolid,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: p.surface,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: p.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOn: {
    borderColor: p.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: p.primarySolid,
  },
  field: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: p.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: p.text,
    fontSize: typography.body,
    backgroundColor: p.surface,
  },
  inputDisabled: {
    backgroundColor: p.bg,
    color: p.textMuted,
  },
  inputError: {
    borderColor: p.error,
  },
  inputArea: {
    minHeight: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  hintSmall: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  fieldError: {
    fontSize: 12,
    color: p.error,
    marginTop: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(180,35,59,0.3)',
    backgroundColor: 'rgba(180,35,59,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: p.error,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: typography.caption,
    color: p.textMuted,
  },
  blockBtn: {
    marginTop: spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  flexBtn: {
    flex: 1,
  },
  flexWide: {
    flex: 1,
  },
  para: {
    fontSize: typography.caption,
    color: p.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  inlineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  inlineDesc: {
    flex: 1,
    fontSize: typography.caption,
    color: p.textMuted,
    lineHeight: 19,
  },
  otpCard: {
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 16,
    backgroundColor: p.surface,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  otpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: p.text,
  },
  otpMsg: {
    fontSize: 12,
    color: p.textMuted,
    lineHeight: 17,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 6,
    fontWeight: '700',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  otpAction: {
    minHeight: 40,
  },
  pwWrap: {
    position: 'relative',
  },
  pwInput: {
    paddingRight: 48,
  },
  pwEye: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  lockBox: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,122,101,0.3)',
    backgroundColor: 'rgba(0,122,101,0.06)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: p.primarySolid,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: p.text,
  },
  lockDesc: {
    fontSize: 12,
    color: p.textMuted,
    lineHeight: 17,
    marginTop: 4,
  },
  lockBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 40,
  },
  accountBox: {
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.surface,
    borderRadius: 12,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: p.text,
  },
  accountMeta: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: p.border,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: p.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: p.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  removeBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 36,
  },
  usernameLine: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: spacing.md,
  },
  usernameValue: {
    color: p.text,
    fontWeight: '600',
  },
  emailValue: {
    fontSize: typography.body,
    fontWeight: '600',
    color: p.text,
    marginBottom: spacing.xs,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '600',
    color: p.primary,
  },
  warnBox: {
    borderWidth: 1,
    borderColor: 'rgba(138,90,0,0.35)',
    backgroundColor: 'rgba(138,90,0,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  warnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: p.warning,
  },
  warnText: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  changeForm: {
    marginTop: spacing.sm,
  },
  userId: {
    fontSize: 11,
    color: p.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  select: {
    marginTop: spacing.md,
  },
  inlineInput: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  verifyBtn: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,122,101,0.4)',
    backgroundColor: 'rgba(0,122,101,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: p.text,
  },
  infoMeta: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
  },
  pendingBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.bg,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  pendingText: {
    fontSize: typography.caption,
    color: p.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusLabel: {
    fontSize: typography.caption,
    color: p.textMuted,
  },
  rejectText: {
    fontSize: 12,
    color: p.error,
    marginBottom: spacing.sm,
  },
  legalFoot: {
    fontSize: 12,
    color: p.textMuted,
    lineHeight: 18,
    marginTop: spacing.xs,
    paddingHorizontal: 4,
  },
  aboutHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  aboutLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: p.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutLogoText: {
    color: p.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  aboutName: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: p.text,
  },
  aboutVersion: {
    fontSize: typography.caption,
    color: p.textMuted,
    marginTop: 2,
  },
  dangerNote: {
    borderWidth: 1,
    borderColor: 'rgba(180,35,59,0.3)',
    backgroundColor: 'rgba(180,35,59,0.05)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dangerNoteText: {
    fontSize: typography.caption,
    color: p.text,
    lineHeight: 19,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: 'rgba(180,35,59,0.3)',
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(180,35,59,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dangerTitle: {
    fontSize: typography.body + 1,
    fontWeight: '700',
    color: p.text,
  },
  dangerDesc: {
    fontSize: typography.caption,
    color: p.textMuted,
    lineHeight: 19,
    marginTop: 4,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Settings,
  Users,
  Shield,
  Bell,
  LifeBuoy,
  Palette,
  FileText,
  ChevronRight,
  MonitorSmartphone,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { enqueueOp, isOfflineError } from '../lib/offline';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useConfirm } from '../components/Popup';
import { useToast } from '../components/Toast';
import { colors, spacing, typography, type Palette as ThemePalette } from '../theme';
import { usePaletteStyles } from '../context/ThemeContext';

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
  created_at?: string | null;
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function ProfileScreen({
  onNavigate,
  onPush,
}: {
  onNavigate?: (tab: string) => void;
  onPush?: (screen: any) => void;
} = {}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { user, displayName, email, signOut } = useAuth();
  const [row, setRow] = useState<ProfileRow | null>(null);
  const [circleCount, setCircleCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const { confirm, node: confirmNode } = useConfirm();
  const { show: toast, node: toastNode } = useToast();

  const [f, setF] = useState({
    display_name: '',
    email: '',
    date_of_birth: '',
    phone: '',
    city: '',
    country: 'NG',
    bio: '',
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [pRes, cRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'display_name, email, date_of_birth, phone, bio, city, country, avatar_url, avatar_version, created_at'
          )
          .eq('id', user.id)
          .maybeSingle(),
        supabase.from('circles').select('id, status').limit(50),
      ]);
      const p = (pRes.data as ProfileRow | null) ?? null;
      setRow(p);
      const circles = (cRes.data ?? []) as { status: string }[];
      setCircleCount(circles.length);
      setActiveCount(circles.filter((c) => c.status === 'active').length);
      const name = p?.display_name || displayName || email || 'Turna';
      setF({
        display_name: name,
        email: p?.email || email || '',
        date_of_birth: p?.date_of_birth ?? '',
        phone: p?.phone ?? '',
        city: p?.city ?? '',
        country: p?.country ?? 'NG',
        bio: p?.bio ?? '',
      });
    } catch {
      /* keep defaults */
    }
  }, [user, displayName, email]);

  useEffect(() => {
    void load();
  }, [load]);

  const name = row?.display_name || displayName || email || 'Turna';
  const mail = row?.email || email || '';
  const initials =
    (name || mail || 'TU')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'TU';
  const memberSince = formatDate(row?.created_at || user?.created_at);

  const save = async () => {
    setFormError(null);
    setNameError(null);
    setSaved(false);
    const displayNameV = f.display_name.trim();
    const dob = f.date_of_birth.trim() || null;
    const phone = f.phone.trim() || null;
    const bio = f.bio.trim().slice(0, 500) || null;
    const city = f.city.trim() || null;
    const country = f.country.trim() || null;

    if (!displayNameV || displayNameV.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    if (dob && Number.isNaN(Date.parse(dob))) {
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
      display_name: displayNameV,
      date_of_birth: dob,
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
          setSaved(true);
          toast('Saved — will sync when you’re back online.');
          return;
        }
        setFormError(error.message);
        return;
      }
      try {
        await supabase.auth.updateUser({ data: { display_name: displayNameV } });
      } catch {
        /* metadata optional */
      }
      setSaved(true);
      void load();
    } catch (e) {
      if (isOfflineError(e)) {
        await enqueueOp({
          table: 'profiles',
          action: 'update',
          match: { id: user.id },
          payload,
        });
        setSaved(true);
        toast('Saved — will sync when you’re back online.');
        return;
      }
      setFormError('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const signOutOthers = () => {
    void (async () => {
      const ok = await confirm(
        'Sign out other devices?',
        'This will sign out every other browser and device. You stay signed in here.',
        { confirmLabel: 'Sign out others', danger: true }
      );
      if (!ok) return;
      setBusy(true);
      try {
        const { error } = await supabase.auth.signOut({ scope: 'others' });
        if (error) toast(error.message, 'error');
        else toast('Other devices signed out');
      } catch {
        toast('Network error — other devices were not signed out', 'error');
      } finally {
        setBusy(false);
      }
    })();
  };

  const accountRows: {
    icon: typeof Settings;
    label: string;
    description: string;
    onPress: () => void;
  }[] = [
    {
      icon: Settings,
      label: 'Settings',
      description: 'Account, preferences, privacy',
      onPress: () => onPush?.({ name: 'settings' }),
    },
    {
      icon: Users,
      label: 'My circles',
      description: `${activeCount} active`,
      onPress: () => onNavigate?.('circles'),
    },
    {
      icon: Shield,
      label: 'Security',
      description: 'Password, sessions, OTP',
      onPress: () => onPush?.({ name: 'settings-sub', route: 'settings/security' }),
    },
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Email and in-app alerts',
      onPress: () =>
        onPush?.({ name: 'settings-sub', route: 'settings/notifications' }),
    },
    {
      icon: Palette,
      label: 'Appearance',
      description: 'Theme and motion',
      onPress: () => onPush?.({ name: 'settings-sub', route: 'settings/appearance' }),
    },
    {
      icon: FileText,
      label: 'Ledger',
      description: 'Append-only contribution history',
      onPress: () => onNavigate?.('ledger'),
    },
    {
      icon: LifeBuoy,
      label: 'Help & support',
      description: 'Guides and contact',
      onPress: () => onPush?.({ name: 'help' }),
    },
  ];

  const avatarUri = row?.avatar_url
    ? `${row.avatar_url}${row.avatar_url.includes('?') ? '&' : '?'}v=${row.avatar_version ?? 0}`
    : null;

  return (
    <Screen tone="cream">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageHead}>
          <Text style={styles.pageTitle}>Profile</Text>
          <Text style={styles.pageSub}>
            Your identity across circles. Members only see a masked version.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.identity}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {mail}
              </Text>
              <Text style={styles.since}>
                Member since {memberSince} · {circleCount} circle
                {circleCount === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable
              style={styles.editBtn}
              onPress={() =>
                onPush?.({ name: 'settings-sub', route: 'settings/profile' })
              }
            >
              <Text style={styles.editBtnText}>Edit profile</Text>
              <ChevronRight size={16} color={p.primary} strokeWidth={2} />
            </Pressable>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>Account</Text>
          {accountRows.map((r, i) => (
            <View
              key={r.label}
              style={[styles.hubRow, i < accountRows.length - 1 && styles.hubRowBorder]}
            >
              <Pressable style={styles.hubInner} onPress={r.onPress}>
                <View style={styles.hubIcon}>
                  <r.icon size={16} color={p.primary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <Text style={styles.rowDesc}>{r.description}</Text>
                </View>
                <ChevronRight size={16} color={p.textMuted} strokeWidth={2} />
              </Pressable>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.hubTitle}>Edit details</Text>
          <Text style={styles.hint}>
            Name, contact info, and short bio visible to you.
          </Text>

          <Field label="Full name" error={nameError}>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              value={f.display_name}
              onChangeText={(v: string) => setF((s) => ({ ...s, display_name: v }))}
              maxLength={100}
              autoComplete="name"
              placeholder="Full name"
              placeholderTextColor={p.textMuted}
            />
          </Field>

          <Field
            label="Email"
            hint="Sign-in identity — cannot change here."
          >
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={f.email}
              editable={false}
              autoCapitalize="none"
            />
          </Field>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Field label="Date of birth" hint="YYYY-MM-DD">
                <TextInput
                  style={styles.input}
                  value={f.date_of_birth}
                  onChangeText={(v: string) => setF((s) => ({ ...s, date_of_birth: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={p.textMuted}
                  maxLength={10}
                />
              </Field>
            </View>
            <View style={styles.fieldHalf}>
              <Field label="Phone">
                <TextInput
                  style={styles.input}
                  value={f.phone}
                  onChangeText={(v: string) => setF((s) => ({ ...s, phone: v }))}
                  placeholder="+234 800 000 0000"
                  placeholderTextColor={p.textMuted}
                  keyboardType="phone-pad"
                  maxLength={24}
                />
              </Field>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Field label="City">
                <TextInput
                  style={styles.input}
                  value={f.city}
                  onChangeText={(v: string) => setF((s) => ({ ...s, city: v }))}
                  placeholder="Lagos"
                  placeholderTextColor={p.textMuted}
                  maxLength={80}
                />
              </Field>
            </View>
            <View style={styles.fieldHalf}>
              <Field label="Country">
                <TextInput
                  style={styles.input}
                  value={f.country}
                  onChangeText={(v: string) => setF((s) => ({ ...s, country: v }))}
                  maxLength={56}
                  placeholder="NG"
                  placeholderTextColor={p.textMuted}
                />
              </Field>
            </View>
          </View>

          <Field label="Bio">
            <TextInput
              style={[styles.input, styles.bio]}
              value={f.bio}
              onChangeText={(v: string) => setF((s) => ({ ...s, bio: v }))}
              multiline
              maxLength={500}
              placeholder="A short line about you (optional)"
              placeholderTextColor={p.textMuted}
              textAlignVertical="top"
            />
          </Field>

          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}
          {saved ? <Text style={styles.savedText}>Profile updated</Text> : null}

          <Button
            label={saving ? 'Saving...' : 'Save profile'}
            onPress={() => void save()}
            loading={saving}
            disabled={saving}
            style={styles.saveBtn}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.ssoRow}>
            <View style={styles.hubIcon}>
              <MonitorSmartphone size={16} color={p.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.hubTitle}>Active sessions</Text>
              <Text style={styles.hint}>
                Sign out all other devices if you don't recognize a session.
              </Text>
            </View>
            <Pressable
              style={[styles.ssoBtn, busy && styles.ssoBtnBusy]}
              onPress={signOutOthers}
              disabled={busy}
            >
              <Text style={styles.ssoBtnText}>
                {busy ? 'Signing out…' : 'Sign out others'}
              </Text>
            </Pressable>
          </View>
        </Card>

        <Button
          label="Log out"
          variant="outline"
          onPress={() => void signOut()}
          style={styles.signOut}
        />
        <Pressable
          style={styles.deleteWrap}
          onPress={() => onPush?.({ name: 'settings-sub', route: 'settings/delete' })}
        >
          <Text style={styles.delete}>Delete account</Text>
        </Pressable>
        {confirmNode}
        {toastNode}
      </ScrollView>
    </Screen>
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
  const { p, styles } = usePaletteStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hintSmall}>{hint}</Text> : null}
    </View>
  );
}

const makeStyles = (p: ThemePalette) => StyleSheet.create({
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
    color: p.text,
    letterSpacing: -0.4,
  },
  pageSub: {
    fontSize: 15,
    color: p.textMuted,
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
    backgroundColor: p.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: p.bg,
  },
  avatarText: {
    color: p.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: p.text,
  },
  email: {
    fontSize: typography.caption,
    color: p.textMuted,
    marginTop: 2,
  },
  since: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: p.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  editBtnText: {
    fontSize: typography.caption,
    color: p.primary,
    fontWeight: '600',
  },
  section: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: p.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  hubRow: {
    paddingVertical: 2,
  },
  hubRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: p.border,
  },
  hubInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: spacing.sm,
  },
  hubIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: typography.body,
    color: p.text,
    fontWeight: '500',
  },
  rowDesc: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
  },
  hubTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: p.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: typography.caption,
    color: p.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  hintSmall: {
    fontSize: 11,
    color: p.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: p.text,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 12,
    backgroundColor: p.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.body,
    color: p.text,
  },
  inputDisabled: {
    opacity: 0.7,
    backgroundColor: p.bg,
  },
  inputError: {
    borderColor: p.error,
  },
  bio: {
    minHeight: 96,
    paddingTop: 12,
  },
  fieldError: {
    fontSize: 12,
    color: p.error,
    marginTop: 6,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(180,35,59,0.3)',
    backgroundColor: 'rgba(180,35,59,0.10)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.caption,
    color: p.error,
  },
  savedText: {
    fontSize: typography.caption,
    color: p.primary,
    marginBottom: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.xs,
  },
  ssoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ssoBtn: {
    borderWidth: 1,
    borderColor: p.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    backgroundColor: p.surface,
  },
  ssoBtnBusy: {
    opacity: 0.6,
  },
  ssoBtnText: {
    fontSize: 12,
    color: p.primary,
    fontWeight: '600',
  },
  signOut: {
    marginTop: spacing.sm,
    borderColor: p.border,
  },
  deleteWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  delete: {
    textAlign: 'center',
    color: p.error,
    fontSize: typography.body,
    fontWeight: '500',
  },
});

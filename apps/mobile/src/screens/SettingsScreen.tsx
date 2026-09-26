import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Landmark,
  Languages,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  Shield,
  SunMoon,
  User,
  Users,
  Wallet,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { useConfirm } from '../components/Popup';
import { Screen } from '../components/Screen';
import { colors, spacing, type Palette } from '../theme';
import { LOCAL_VERSION_NAME } from '../generated/version';
import { usePaletteStyles } from '../context/ThemeContext';

type Tile = {
  route: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  accent?: boolean;
};

type SectionDef = { title: string; tiles: Tile[] };

const ACCOUNT: Tile[] = [
  {
    route: 'settings/profile',
    label: 'Personal info',
    description: 'Name, username, country',
    icon: User,
    accent: true,
  },
  {
    route: 'settings/email',
    label: 'Email',
    description: 'Sign-in & verification',
    icon: Mail,
  },
  {
    route: 'settings/security',
    label: 'Security',
    description: 'Password, OTP, sessions',
    icon: Shield,
    accent: true,
  },
  {
    route: 'settings/payout-account',
    label: 'Bank',
    description: 'Payout account (locked)',
    icon: Landmark,
  },
  {
    route: 'settings/kyc',
    label: 'Identity',
    description: 'KYC for larger payouts',
    icon: BadgeCheck,
  },
];

const PREFS: Tile[] = [
  {
    route: 'settings/notifications',
    label: 'Notifications',
    description: 'Email & in-app alerts',
    icon: Bell,
  },
  {
    route: 'settings/appearance',
    label: 'Appearance',
    description: 'Theme & motion',
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
    description: 'How amounts show',
    icon: Wallet,
  },
];

const CIRCLE: Tile[] = [
  {
    route: 'settings/circle-preferences',
    label: 'Circle defaults',
    description: 'New circle settings',
    icon: Users,
  },
  {
    route: 'settings/reminders',
    label: 'Reminders',
    description: 'Contribution timing',
    icon: Clock,
  },
  {
    route: 'settings/privacy',
    label: 'Privacy',
    description: 'Visibility controls',
    icon: Lock,
  },
];

const SUPPORT: Tile[] = [
  {
    route: 'settings/help',
    label: 'Help',
    description: 'Guides & contact',
    icon: LifeBuoy,
  },
  {
    route: 'settings/report',
    label: 'Report',
    description: 'Something broke?',
    icon: FileText,
  },
  {
    route: 'settings/legal',
    label: 'Legal',
    description: 'Terms & privacy',
    icon: FileText,
  },
  {
    route: 'settings/about',
    label: 'About',
    description: 'Version & product',
    icon: Info,
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function TileCard({ item, onPress }: { item: Tile; onPress: () => void }) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const Icon = item.icon;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        item.accent && styles.tileAccent,
        pressed && styles.tilePressed,
      ]}
    >
      <View style={[styles.tileIcon, item.accent && styles.tileIconAccent]}>
        <Icon
          size={20}
          color={item.accent ? colors.white : p.primary}
          strokeWidth={2}
        />
      </View>
      <View style={styles.tileText}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={styles.tileDesc} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </Pressable>
  );
}

function SectionBlock({
  title,
  tiles,
  onNavigate,
}: {
  title: string;
  tiles: Tile[];
  onNavigate?: (route: string) => void;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ChevronRight size={16} color={p.textMuted} style={{ opacity: 0.5 }} />
      </View>
      <View style={styles.grid}>
        {tiles.map((t) => (
          <TileCard
            key={t.route}
            item={t}
            onPress={() => onNavigate?.(t.route)}
          />
        ))}
      </View>
    </View>
  );
}

export function SettingsScreen({
  onNavigate,
  onBack,
}: {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
} = {}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { signOut, email, user } = useAuth();
  const [profile, setProfile] = useState<{
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { confirm, node: confirmNode } = useConfirm();

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, email, avatar_url')
        .eq('id', user?.id ?? '')
        .maybeSingle();
      setProfile(
        (data as {
          display_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
        } | null) ?? null
      );
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName =
    profile?.display_name ||
    (user as any)?.user_metadata?.display_name ||
    (email ?? 'Member').split('@')[0];
  const displayEmail = profile?.email || email || '';
  const avatarUrl = profile?.avatar_url ?? null;
  const initials = getInitials(displayName || displayEmail || 'TU');

  function confirmSignOut() {
    void (async () => {
      const ok = await confirm(
        'Log out?',
        'Are you sure you want to log out of your Turna account?',
        { confirmLabel: 'Log out' }
      );
      if (!ok) return;
      setSigningOut(true);
      await signOut().finally(() => setSigningOut(false));
    })();
  }

  return (
    <Screen tone="cream">
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={p.primary}
          />
        }
      >
        {onBack && (
          <Button
            label="← Back"
            variant="ghost"
            onPress={onBack}
            style={styles.backBtn}
          />
        )}
        <View>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.titleSub}>
            Manage your account and preferences
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigate?.('settings/profile')}
          style={({ pressed }) => [
            styles.profileCard,
            pressed && styles.tilePressed,
          ]}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              accessibilityLabel={displayName}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {displayEmail}
            </Text>
          </View>
          <View style={styles.editLink}>
            <Text style={styles.editText}>Edit</Text>
            <ChevronRight size={16} color={p.primary} />
          </View>
        </Pressable>

        <SectionBlock title="Account" tiles={ACCOUNT} onNavigate={onNavigate} />
        <SectionBlock
          title="Preferences"
          tiles={PREFS}
          onNavigate={onNavigate}
        />
        <SectionBlock title="Circle" tiles={CIRCLE} onNavigate={onNavigate} />
        <SectionBlock title="Support" tiles={SUPPORT} onNavigate={onNavigate} />

        <View style={styles.dangerZone}>
          <Pressable
            accessibilityRole="button"
            onPress={confirmSignOut}
            disabled={signingOut}
            style={({ pressed }) => [styles.dangerRow, pressed && styles.tilePressed]}
          >
            <View style={styles.dangerIcon}>
              <LogOut size={18} color={p.primary} strokeWidth={2} />
            </View>
            <View style={styles.dangerText}>
              <Text style={styles.dangerLabel}>
                {signingOut ? 'Signing out…' : 'Log out'}
              </Text>
              <Text style={styles.dangerDesc}>Sign out on this device</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigate?.('settings/delete')}
            style={({ pressed }) => [styles.deleteRow, pressed && styles.deletePressed]}
          >
            <View style={styles.deleteIcon}>
              <Lock size={18} color={p.error} strokeWidth={2} />
            </View>
            <Text style={styles.deleteLabel}>Delete account</Text>
            <ChevronRight
              size={16}
              color={p.error}
              style={styles.deleteChevron}
            />
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Turna · Version {LOCAL_VERSION_NAME} · © 2026
        </Text>
        {confirmNode}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: 28,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    marginLeft: -8,
    marginBottom: -16,
    marginTop: -12,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: p.text,
    letterSpacing: -0.75,
  },
  titleSub: {
    fontSize: 16,
    color: p.textMuted,
    marginTop: 4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.surface,
    padding: 16,
  },
  tilePressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: p.border,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: p.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: p.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: p.text,
  },
  profileEmail: {
    fontSize: 14,
    color: p.textMuted,
    marginTop: 2,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  editText: {
    fontSize: 14,
    fontWeight: '500',
    color: p.primary,
  },
  section: {
    marginBottom: -8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    color: p.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '48%',
    minWidth: 140,
    flexGrow: 1,
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.surface,
    padding: 16,
    justifyContent: 'space-between',
  },
  tileAccent: {
    borderColor: 'rgba(0,122,101,0.30)',
    backgroundColor: 'rgba(0,122,101,0.06)',
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconAccent: {
    backgroundColor: p.primarySolid,
  },
  tileText: {
    marginTop: 12,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: p.text,
    lineHeight: 18,
  },
  tileDesc: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  dangerZone: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(180,35,59,0.25)',
    backgroundColor: 'rgba(180,35,59,0.05)',
    padding: 12,
    gap: 4,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dangerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0,122,101,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dangerText: {
    flex: 1,
    minWidth: 0,
  },
  dangerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: p.text,
  },
  dangerDesc: {
    fontSize: 12,
    color: p.textMuted,
    marginTop: 2,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deletePressed: {
    backgroundColor: 'rgba(180,35,59,0.10)',
  },
  deleteIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(180,35,59,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deleteLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: p.error,
  },
  deleteChevron: {
    marginLeft: 'auto',
  },
  footer: {
    fontSize: 12,
    color: p.textMuted,
    textAlign: 'center',
  },
});

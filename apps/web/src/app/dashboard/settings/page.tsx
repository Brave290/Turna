import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getInitials } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import {
  User,
  Mail,
  Shield,
  Landmark,
  BadgeCheck,
  Bell,
  SunMoon,
  Languages,
  Wallet,
  Users,
  Clock,
  Lock,
  LifeBuoy,
  FileText,
  Info,
} from 'lucide-react';
import { DangerSignOut } from '@/components/dashboard/settings/confirm-signout';

export const dynamic = 'force-dynamic';

type Tile = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
};

const ACCOUNT: Tile[] = [
  {
    href: '/dashboard/settings/personal-information',
    label: 'Personal info',
    description: 'Name, username, country',
    icon: User,
    accent: true,
  },
  {
    href: '/dashboard/settings/email',
    label: 'Email',
    description: 'Sign-in & verification',
    icon: Mail,
  },
  {
    href: '/dashboard/settings/security',
    label: 'Security',
    description: 'Password, OTP, sessions',
    icon: Shield,
    accent: true,
  },
  {
    href: '/dashboard/settings/payout-account',
    label: 'Bank',
    description: 'Payout account (locked)',
    icon: Landmark,
  },
  {
    href: '/dashboard/settings/kyc',
    label: 'Identity',
    description: 'KYC for larger payouts',
    icon: BadgeCheck,
  },
];

const PREFS: Tile[] = [
  {
    href: '/dashboard/settings/notifications',
    label: 'Notifications',
    description: 'Email & in-app alerts',
    icon: Bell,
  },
  {
    href: '/dashboard/settings/appearance',
    label: 'Appearance',
    description: 'Theme & motion',
    icon: SunMoon,
  },
  {
    href: '/dashboard/settings/language',
    label: 'Language',
    description: 'App language',
    icon: Languages,
  },
  {
    href: '/dashboard/settings/currency',
    label: 'Currency',
    description: 'How amounts show',
    icon: Wallet,
  },
];

const CIRCLE: Tile[] = [
  {
    href: '/dashboard/settings/circle-preferences',
    label: 'Circle defaults',
    description: 'New circle settings',
    icon: Users,
  },
  {
    href: '/dashboard/settings/reminders',
    label: 'Reminders',
    description: 'Contribution timing',
    icon: Clock,
  },
  {
    href: '/dashboard/settings/privacy',
    label: 'Privacy',
    description: 'Visibility controls',
    icon: Lock,
  },
];

const SUPPORT: Tile[] = [
  {
    href: '/dashboard/settings/help',
    label: 'Help',
    description: 'Guides & contact',
    icon: LifeBuoy,
  },
  {
    href: '/dashboard/settings/report',
    label: 'Report',
    description: 'Something broke?',
    icon: FileText,
  },
  {
    href: '/dashboard/settings/legal',
    label: 'Legal',
    description: 'Terms & privacy',
    icon: FileText,
  },
  {
    href: '/dashboard/settings/about',
    label: 'About',
    description: 'Version & product',
    icon: Info,
  },
];

function TileGrid({ items }: { items: Tile[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={`group rounded-2xl border p-4 min-h-[112px] flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-card ${
              item.accent
                ? 'border-primary/30 bg-primary/[0.06]'
                : 'border-border bg-white hover:border-primary/25'
            }`}
          >
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                item.accent ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
              }`}
            >
              <Icon className="w-5 h-5" />
            </span>
            <span className="mt-3">
              <span className="block text-[15px] font-semibold text-forest leading-tight">
                {item.label}
              </span>
              <span className="block text-xs text-muted mt-0.5 line-clamp-2">
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function Section({ title, items }: { title: string; items: Tile[] }) {
  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </h2>
        <ChevronRight className="w-4 h-4 text-muted/50" />
      </div>
      <TileGrid items={items} />
    </section>
  );
}

export default async function SettingsIndexPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, avatar_url, username')
    .eq('id', user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    (user.user_metadata?.display_name as string) ||
    (user.email ?? 'Member').split('@')[0];
  const email = profile?.email || user.email || '';
  const avatarUrl = profile?.avatar_url ?? null;
  const initials = getInitials(displayName || email || 'TU');

  return (
    <div className="pb-2">
      <Link
        href="/dashboard/settings/profile"
        prefetch
        className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-card mb-7 hover:border-primary/30 transition-colors"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-14 h-14 rounded-2xl object-cover border border-border"
          />
        ) : (
          <span className="w-14 h-14 rounded-2xl bg-forest text-primary-light flex items-center justify-center font-display text-lg font-bold">
            {initials}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold text-forest truncate">
            {displayName}
          </span>
          <span className="block text-sm text-muted truncate">{email}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm text-primary font-medium shrink-0">
          Edit
          <ChevronRight className="w-4 h-4" />
        </span>
      </Link>

      <Section title="Account" items={ACCOUNT} />
      <Section title="Preferences" items={PREFS} />
      <Section title="Circle" items={CIRCLE} />
      <Section title="Support" items={SUPPORT} />

      <section className="rounded-2xl border border-error/25 bg-error/5 p-3 space-y-1">
        <DangerSignOut />
        <Link
          href="/dashboard/settings/delete"
          prefetch
          className="w-full flex items-center gap-3 px-2 py-3 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors"
        >
          <span className="w-9 h-9 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
            <Lock className="w-[18px] h-[18px]" />
          </span>
          Delete account
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Link>
      </section>

      <p className="text-xs text-muted text-center mt-4 pb-2">
        Turna · Version 1.0.1 · © 2026
      </p>
    </div>
  );
}

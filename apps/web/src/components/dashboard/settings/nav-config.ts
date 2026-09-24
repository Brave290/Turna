import {
  User,
  AtSign,
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
import type { SettingsSection } from '@/lib/settings-types';

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'account',
    title: 'Account',
    items: [
      {
        href: '/dashboard/settings/personal-information',
        label: 'Personal information',
        description: 'Name, username, country, currency',
        icon: User,
      },
      {
        href: '/dashboard/settings/email',
        label: 'Email & verification',
        description: 'Sign-in email and verification status',
        icon: Mail,
      },
      {
        href: '/dashboard/settings/security',
        label: 'Security',
        description: 'Password, OTP, active sessions',
        icon: Shield,
      },
      {
        href: '/dashboard/settings/payout-account',
        label: 'Payout account',
        description: 'Bank account for receiving payouts',
        icon: Landmark,
      },
      {
        href: '/dashboard/settings/kyc',
        label: 'Identity (KYC)',
        description: 'Verify identity for larger payouts',
        icon: BadgeCheck,
      },
    ],
  },
  {
    id: 'preferences',
    title: 'Preferences',
    items: [
      {
        href: '/dashboard/settings/notifications',
        label: 'Notifications',
        description: 'Email, push, and in-app alerts',
        icon: Bell,
      },
      {
        href: '/dashboard/settings/appearance',
        label: 'Appearance',
        description: 'Theme and motion',
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
        description: 'How amounts are displayed',
        icon: Wallet,
      },
    ],
  },
  {
    id: 'circle',
    title: 'Circle',
    items: [
      {
        href: '/dashboard/settings/circle-preferences',
        label: 'Circle preferences',
        description: 'Defaults for newly created circles',
        icon: Users,
      },
      {
        href: '/dashboard/settings/reminders',
        label: 'Contribution reminders',
        description: 'Timing and which reminders you get',
        icon: Clock,
      },
      {
        href: '/dashboard/settings/privacy',
        label: 'Privacy',
        description: 'Visibility and data controls',
        icon: Lock,
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    items: [
      {
        href: '/dashboard/settings/help',
        label: 'Help & support',
        description: 'Guides and contact',
        icon: LifeBuoy,
      },
      {
        href: '/dashboard/settings/report',
        label: 'Report a problem',
        description: 'Tell us what went wrong',
        icon: FileText,
      },
      {
        href: '/dashboard/settings/legal',
        label: 'Terms & privacy',
        description: 'Legal documents',
        icon: FileText,
      },
      {
        href: '/dashboard/settings/about',
        label: 'About Turna',
        description: 'Version and product info',
        icon: Info,
      },
    ],
  },
];

export const SETTINGS_NAV_FLAT = SETTINGS_SECTIONS.flatMap((s) => s.items);

export function findSettingsItem(href: string) {
  return SETTINGS_NAV_FLAT.find((i) => i.href === href);
}

export { AtSign };

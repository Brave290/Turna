import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getInitials } from '@/lib/utils';
import { SettingsGroup, SettingsRow } from '@/components/dashboard/settings/shell';
import { SETTINGS_SECTIONS } from '@/components/dashboard/settings/nav-config';
import { ChevronRight, Trash2 } from 'lucide-react';
import { DangerSignOut } from '@/components/dashboard/settings/confirm-signout';

export const dynamic = 'force-dynamic';

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
    <div>
      {/* Profile header */}
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
          Edit profile
          <ChevronRight className="w-4 h-4" />
        </span>
      </Link>

      {SETTINGS_SECTIONS.map((section) => (
        <SettingsGroup key={section.id} title={section.title}>
          {section.items.map((item) => (
            <SettingsRow
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              description={item.description}
            />
          ))}
        </SettingsGroup>
      ))}

      {/* Danger zone */}
      <SettingsGroup title="Danger zone">
        <DangerSignOut />
        <SettingsRow
          href="/dashboard/settings/delete"
          icon={Trash2}
          label="Delete account"
          description="Permanently remove your account"
          danger
        />
      </SettingsGroup>

      <p className="text-xs text-muted text-center mt-2 pb-2">
        Turna · Version 1.0.0 · © 2026
      </p>
    </div>
  );
}

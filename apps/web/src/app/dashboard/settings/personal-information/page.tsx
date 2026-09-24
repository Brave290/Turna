import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { SettingsPanel } from '@/components/dashboard/settings/shell';

export const dynamic = 'force-dynamic';

export default async function PersonalInformationPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: row } = await supabase
    .from('profiles')
    .select(
      'display_name, email, date_of_birth, phone, bio, city, country, username'
    )
    .eq('id', user.id)
    .maybeSingle();

  const displayName =
    row?.display_name ||
    (user.user_metadata?.display_name as string) ||
    (user.email ?? 'Member').split('@')[0];

  return (
    <SettingsPanel
      title="Personal information"
      description="Your core account details. Currency display is managed under Preferences."
    >
      <ProfileForm
        initial={{
          display_name: displayName,
          email: row?.email || user.email || '',
          date_of_birth: row?.date_of_birth ?? null,
          phone: row?.phone ?? null,
          bio: row?.bio ?? null,
          city: row?.city ?? null,
          country: row?.country ?? 'NG',
        }}
      />
      {row?.username != null && (
        <p className="text-xs text-muted mt-4">
          Username: <span className="font-mono text-forest">{row.username}</span>
        </p>
      )}
    </SettingsPanel>
  );
}

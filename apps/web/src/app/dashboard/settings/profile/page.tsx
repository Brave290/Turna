import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AvatarUploader } from '@/components/dashboard/avatar-uploader';
import { ProfileForm } from '@/components/dashboard/profile-form';
import { SettingsPanel } from '@/components/dashboard/settings/shell';

export const dynamic = 'force-dynamic';

export default async function SettingsProfilePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: row } = await supabase
    .from('profiles')
    .select(
      'display_name, email, date_of_birth, phone, bio, city, country, avatar_url, avatar_version, username'
    )
    .eq('id', user.id)
    .maybeSingle();

  const displayName =
    row?.display_name ||
    (user.user_metadata?.display_name as string) ||
    (user.email ?? 'Member').split('@')[0];
  const email = row?.email || user.email || '';
  const avatarUrl = row?.avatar_url ?? null;
  const avatarVersion =
    typeof row?.avatar_version === 'number' ? row.avatar_version : null;

  return (
    <div>
      <SettingsPanel
        title="Profile photo"
        description="Shown to circle members. JPG or PNG · up to 5MB."
      >
        <AvatarUploader
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
          avatarVersion={avatarVersion}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Public profile"
        description="Manage how you appear inside circles."
      >
        <ProfileForm
          initial={{
            display_name: displayName,
            email,
            date_of_birth: row?.date_of_birth ?? null,
            phone: row?.phone ?? null,
            bio: row?.bio ?? null,
            city: row?.city ?? null,
            country: row?.country ?? 'NG',
          }}
        />
      </SettingsPanel>
    </div>
  );
}

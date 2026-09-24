import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SettingsPanel } from '@/components/dashboard/settings/shell';
import { EmailVerificationCard } from '@/components/dashboard/settings/email-verification';

export const dynamic = 'force-dynamic';

export default async function EmailSettingsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const verified = Boolean(user.email_confirmed_at);

  return (
    <div>
      <SettingsPanel
        title="Email address"
        description="Used to sign in and receive important account messages."
      >
        <EmailVerificationCard email={user.email ?? ''} verified={verified} />
      </SettingsPanel>
    </div>
  );
}

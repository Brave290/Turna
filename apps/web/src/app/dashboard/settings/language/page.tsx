import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SettingsGroup, SettingsPanel } from '@/components/dashboard/settings/shell';
import { PrefRadio } from '@/components/dashboard/settings/pref-controls';

export const dynamic = 'force-dynamic';

const LANGUAGES = [
  { value: 'en', label: 'English', description: 'Fully supported' },
];

export default async function LanguagePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data } = await supabase
    .from('user_preferences')
    .select('language')
    .eq('user_id', user.id)
    .maybeSingle();
  const current = data?.language || 'en';

  return (
    <div>
      <SettingsPanel
        title="App language"
        description="Only languages that are actually implemented are listed."
      >
        <SettingsGroup>
          {LANGUAGES.map((lang) => (
            <PrefRadio
              key={lang.value}
              name="language"
              value={lang.value}
              label={lang.label}
              description={lang.description}
              checked={current === lang.value}
            />
          ))}
        </SettingsGroup>
        <p className="text-xs text-muted px-1">
          Yorùbá, Hausa, Igbo, and French are planned — they will appear here
          once translated.
        </p>
      </SettingsPanel>
    </div>
  );
}

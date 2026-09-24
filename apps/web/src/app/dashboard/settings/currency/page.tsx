import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SettingsGroup, SettingsPanel } from '@/components/dashboard/settings/shell';
import { PrefRadio } from '@/components/dashboard/settings/pref-controls';

export const dynamic = 'force-dynamic';

const CURRENCIES = [
  { value: 'NGN', label: '₦ Nigerian Naira (NGN)', description: 'Default' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi', description: 'Display only' },
  { value: 'KES', label: 'KES — Kenyan Shilling', description: 'Display only' },
  { value: 'USD', label: 'USD — US Dollar', description: 'Display only' },
];

export default async function CurrencyPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data } = await supabase
    .from('user_preferences')
    .select('currency')
    .eq('user_id', user.id)
    .maybeSingle();
  const current = data?.currency || 'NGN';

  return (
    <div>
      <SettingsPanel
        title="Default currency"
        description="Affects how amounts are displayed. It does not convert contribution records."
      >
        <SettingsGroup>
          {CURRENCIES.map((c) => (
            <PrefRadio
              key={c.value}
              name="currency"
              value={c.value}
              label={c.label}
              description={c.description}
              checked={current === c.value}
            />
          ))}
        </SettingsGroup>
      </SettingsPanel>
    </div>
  );
}

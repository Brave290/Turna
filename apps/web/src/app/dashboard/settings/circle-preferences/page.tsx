import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SettingsGroup, SettingsPanel, SettingsRow } from '@/components/dashboard/settings/shell';
import { PrefRadio, PrefToggle } from '@/components/dashboard/settings/pref-controls';
import { Users, Clock, Bell, Lock, Download, Trash2, Database } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CirclePreferencesPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const frequency = (data?.default_frequency as string) || 'weekly';
  const showCompleted = data?.show_completed_circles !== false;
  const lead = Number(data?.reminder_lead_hours ?? 24);

  return (
    <div>
      <SettingsPanel
        title="Circle preferences"
        description="Defaults for newly created circles. Existing circles are not changed automatically."
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2 px-1">
          Default contribution frequency
        </p>
        <SettingsGroup>
          <PrefRadio
            name="default_frequency"
            value="weekly"
            label="Weekly"
            checked={frequency === 'weekly'}
          />
          <PrefRadio
            name="default_frequency"
            value="biweekly"
            label="Bi-weekly"
            checked={frequency === 'biweekly'}
          />
          <PrefRadio
            name="default_frequency"
            value="monthly"
            label="Monthly"
            checked={frequency === 'monthly'}
          />
        </SettingsGroup>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2 px-1 mt-2">
          Contribution reminder lead time
        </p>
        <SettingsGroup>
          <PrefRadio
            name="reminder_lead_hours"
            value="24"
            label="24 hours before"
            description="Default"
            checked={lead === 24}
          />
          <PrefRadio
            name="reminder_lead_hours"
            value="48"
            label="48 hours before"
            checked={lead === 48}
          />
          <PrefRadio
            name="reminder_lead_hours"
            value="0"
            label="Day of contribution only"
            checked={lead === 0}
          />
        </SettingsGroup>

        <SettingsGroup>
          <PrefToggle
            name="show_completed_circles"
            label="Show completed circles"
            description="Keep finished circles visible in your list"
            defaultChecked={showCompleted}
          />
        </SettingsGroup>
      </SettingsPanel>

      <SettingsGroup title="Related">
        <SettingsRow
          href="/dashboard/settings/reminders"
          icon={Bell}
          label="Contribution reminders"
          description="Which reminders you receive"
        />
        <SettingsRow
          href="/dashboard/settings/privacy"
          icon={Lock}
          label="Privacy"
          description="Visibility and data controls"
        />
      </SettingsGroup>

      <p className="text-xs text-muted px-1 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Lead time applies to new reminder schedules.
        <Users className="w-3.5 h-3.5 ml-2" />
        Circle members keep their own notification prefs.
      </p>
      <span className="sr-only">
        <Download className="hidden" />
        <Trash2 className="hidden" />
        <Database className="hidden" />
      </span>
    </div>
  );
}

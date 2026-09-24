import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SettingsGroup, SettingsPanel } from '@/components/dashboard/settings/shell';
import { PrefRadio, PrefToggle } from '@/components/dashboard/settings/pref-controls';
import { Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RemindersPage() {
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

  const time = (data?.reminder_time as string) || '18:00';

  return (
    <div>
      <SettingsPanel
        title="Contribution reminders"
        description="Control which alerts you get and when they arrive."
      >
        <SettingsGroup>
          <PrefToggle
            name="contribution_due"
            label="Contribution due"
            description="When a contribution window opens"
            defaultChecked={data?.contribution_due !== false}
          />
          <PrefToggle
            name="day_before"
            label="1 day before"
            description="Head-up before the due date"
            defaultChecked={data?.day_before !== false}
          />
          <PrefToggle
            name="due_today"
            label="Due today"
            description="Morning of the contribution day"
            defaultChecked={data?.due_today !== false}
          />
          <PrefToggle
            name="overdue"
            label="Overdue contribution"
            description="If a contribution is still unpaid"
            defaultChecked={data?.overdue !== false}
          />
          <PrefToggle
            name="payout_approaching"
            label="Payout approaching"
            description="When your turn is coming up"
            defaultChecked={data?.payout_approaching !== false}
          />
        </SettingsGroup>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2 px-1 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Reminder time
        </p>
        <SettingsGroup>
          {['08:00', '12:00', '18:00', '20:00'].map((t) => (
            <PrefRadio
              key={t}
              name="reminder_time"
              value={t}
              label={t}
              description={t === '18:00' ? 'Default' : undefined}
              checked={time === t}
            />
          ))}
        </SettingsGroup>
      </SettingsPanel>
    </div>
  );
}

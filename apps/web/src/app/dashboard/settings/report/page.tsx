import { SettingsPanel } from '@/components/dashboard/settings/shell';
import { ReportProblemForm } from '@/components/dashboard/settings/report-form';

export const dynamic = 'force-dynamic';

export default function ReportPage() {
  return (
    <SettingsPanel
      title="Report a problem"
      description="Tell us what went wrong. Include steps if you can."
    >
      <ReportProblemForm />
    </SettingsPanel>
  );
}

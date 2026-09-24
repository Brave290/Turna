import { SettingsGroup, SettingsPanel, SettingsRow } from '@/components/dashboard/settings/shell';
import { LifeBuoy, FileText, Mail, MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HelpPage() {
  return (
    <div>
      <SettingsPanel
        title="Help & support"
        description="Find answers or reach the Turna team."
      >
        <SettingsGroup>
          <SettingsRow
            href="/dashboard/settings/report"
            icon={MessageSquare}
            label="Report a problem"
            description="Something broken or confusing"
          />
          <SettingsRow
            href="mailto:support.turna@gmail.com"
            icon={Mail}
            label="Contact support"
            description="support.turna@gmail.com"
          />
          <SettingsRow
            href="/dashboard/settings/legal"
            icon={FileText}
            label="Terms & privacy"
            description="Policies and guidelines"
          />
          <SettingsRow
            href="/dashboard/settings/about"
            icon={LifeBuoy}
            label="About Turna"
            description="Version and product info"
          />
        </SettingsGroup>
      </SettingsPanel>
    </div>
  );
}

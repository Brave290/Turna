import { SettingsGroup, SettingsPanel, SettingsRow } from '@/components/dashboard/settings/shell';
import { Info, Globe, Mail, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  return (
    <div>
      <SettingsPanel title="About Turna" description="Version and product info.">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-forest text-primary-light flex items-center justify-center font-display text-xl font-bold">
            T
          </div>
          <div>
            <p className="font-display text-lg font-bold text-forest">Turna</p>
            <p className="text-sm text-muted">Version 1.0.0 · Build 100</p>
          </div>
        </div>
        <p className="text-sm text-muted leading-relaxed mb-6">
          Turna helps communities coordinate traditional savings circles
          digitally with transparent records and clear contribution tracking.
        </p>
        <SettingsGroup>
          <SettingsRow
            href="https://turnaapp.vercel.app"
            icon={Globe}
            label="Website"
            description="turnaapp.vercel.app"
          />
          <SettingsRow
            href="mailto:support.turna@gmail.com"
            icon={Mail}
            label="Contact"
            description="support.turna@gmail.com"
          />
          <SettingsRow href="/privacy" icon={FileText} label="Privacy Policy" />
          <SettingsRow href="/terms" icon={FileText} label="Terms of Service" />
        </SettingsGroup>
        <p className="text-xs text-muted">© 2026 Turna</p>
        <span className="sr-only">
          <Info className="hidden" />
        </span>
      </SettingsPanel>
    </div>
  );
}

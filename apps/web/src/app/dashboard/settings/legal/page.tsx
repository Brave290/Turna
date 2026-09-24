import { SettingsGroup, SettingsPanel, SettingsRow } from '@/components/dashboard/settings/shell';
import { FileText, Shield, Users, Scale, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

const LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/legal/acceptable-use', label: 'Community Guidelines' },
  { href: '/legal', label: 'Open-source licenses & legal' },
];

export default function LegalPage() {
  return (
    <div>
      <SettingsPanel title="Terms & privacy" description="Legal documents for Turna.">
        <SettingsGroup>
          {LINKS.map((l) => (
            <SettingsRow
              key={l.href}
              href={l.href}
              icon={FileText}
              label={l.label}
            />
          ))}
        </SettingsGroup>
      </SettingsPanel>
      <p className="text-xs text-muted px-1 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" /> Secure by design
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Community first
        </span>
        <span className="inline-flex items-center gap-1">
          <Scale className="w-3.5 h-3.5" /> Fair ledger rules
        </span>
        <span className="inline-flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5" /> turnaapp.vercel.app
        </span>
      </p>
    </div>
  );
}

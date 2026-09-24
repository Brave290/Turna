import { DeleteAccountPanel } from '@/components/dashboard/delete-account';
import { SettingsPanel } from '@/components/dashboard/settings/shell';

export const dynamic = 'force-dynamic';

export default function DeleteAccountSettingsPage() {
  return (
    <div>
      <SettingsPanel
        title="Delete account"
        description="This permanently deletes your Turna account and associated personal data."
      >
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3.5 mb-5 text-sm text-forest leading-relaxed">
          Your circle records may need to be retained where required for other
          members, financial records, dispute resolution, or legal
          requirements. This action cannot be easily undone.
        </div>
        <DeleteAccountPanel />
      </SettingsPanel>
    </div>
  );
}

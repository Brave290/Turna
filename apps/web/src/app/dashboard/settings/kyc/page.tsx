import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { KycForm, KycStatusBadge } from '@/components/dashboard/kyc-form';
import { SettingsPanel } from '@/components/dashboard/settings/shell';

export const dynamic = 'force-dynamic';

export default async function KycSettingsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: kyc } = await supabase
    .from('kyc_records')
    .select(
      'status, document_type, document_number, full_legal_name, rejection_reason'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <SettingsPanel
      title="Identity (KYC)"
      description="Verify your identity with NIN, BVN, or an ID card before large payouts."
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <span className="text-sm text-muted">Current status</span>
        <KycStatusBadge status={kyc?.status ?? null} />
      </div>
      <KycForm
        initial={
          kyc
            ? {
                status: kyc.status,
                document_type: kyc.document_type,
                document_number: kyc.document_number,
                full_legal_name: kyc.full_legal_name,
                rejection_reason: kyc.rejection_reason,
              }
            : null
        }
      />
    </SettingsPanel>
  );
}

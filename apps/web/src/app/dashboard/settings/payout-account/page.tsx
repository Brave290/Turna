import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { BankAccountForm } from '@/components/dashboard/bank-account-form';
import { SettingsPanel } from '@/components/dashboard/settings/shell';

export const dynamic = 'force-dynamic';

export default async function PayoutAccountPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: bank } = await supabase
    .from('bank_accounts')
    .select('id, bank_code, bank_name, account_number, account_name, is_default')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  return (
    <SettingsPanel
      title="Payout account"
      description="Bank account where circle payouts are sent. Account name is verified with Paystack Resolve."
    >
      <BankAccountForm
        initialAccount={
          bank
            ? {
                id: bank.id,
                bank_code: bank.bank_code,
                bank_name: bank.bank_name,
                account_number: bank.account_number,
                account_name: bank.account_name,
                is_default: bank.is_default,
              }
            : null
        }
      />
    </SettingsPanel>
  );
}

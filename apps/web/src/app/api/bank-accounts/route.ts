import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** POST — save (upsert) default bank account for payouts */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: {
    bank_code?: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const bankCode = String(body.bank_code ?? '').trim();
  const bankName = String(body.bank_name ?? '').trim();
  const accountNumber = String(body.account_number ?? '').trim();
  const accountName = String(body.account_name ?? '').trim();

  if (!bankCode || !bankName || !/^\d{10}$/.test(accountNumber) || !accountName) {
    return NextResponse.json(
      { error: 'Bank, 10-digit account number, and verified name are required' },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();

  // Clear previous default then insert new as default
  try {
    await admin
      .from('bank_accounts')
      .update({ is_default: false })
      .eq('user_id', user.id);

    const { error } = await admin.from('bank_accounts').upsert(
      {
        user_id: user.id,
        bank_code: bankCode,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        is_default: true,
        verified_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,bank_code,account_number' }
    );

    if (error) {
      console.error('[bank-accounts]', error.message);
      return NextResponse.json(
        { error: 'Could not save account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[bank-accounts]', e);
    return NextResponse.json(
      { error: 'Could not save account' },
      { status: 500 }
    );
  }
}

/** GET — current default account for signed-in user */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { data } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  return NextResponse.json({ account: data ?? null });
}

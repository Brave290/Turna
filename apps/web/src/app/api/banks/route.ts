import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { listBanks, resolveAccount } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

/** GET /api/banks — list Nigerian banks for the account form */
export async function GET() {
  try {
    const banks = await listBanks();
    return NextResponse.json({
      banks: banks
        .filter((b) => b.active !== false)
        .map((b) => ({ code: b.code, name: b.name })),
    });
  } catch (e) {
    console.error('[banks]', e);
    return NextResponse.json(
      { error: 'Could not load banks. Try again.' },
      { status: 502 }
    );
  }
}

/** POST /api/banks/resolve — resolve account name (requires session) */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { account_number?: string; bank_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const accountNumber = String(body.account_number ?? '').trim();
  const bankCode = String(body.bank_code ?? '').trim();

  if (!/^\d{10}$/.test(accountNumber) || !bankCode) {
    return NextResponse.json(
      { error: 'Enter a 10-digit account number and select a bank' },
      { status: 400 }
    );
  }

  try {
    const resolved = await resolveAccount(accountNumber, bankCode);
    if (!resolved?.account_name) {
      return NextResponse.json(
        { error: 'Account not found at this bank' },
        { status: 404 }
      );
    }
    return NextResponse.json({ account: resolved });
  } catch (e) {
    console.error('[resolve]', e);
    return NextResponse.json(
      { error: 'Could not verify account. Check details and try again.' },
      { status: 502 }
    );
  }
}

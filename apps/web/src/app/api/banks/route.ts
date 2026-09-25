import { NextResponse } from 'next/server';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import {
  listBanks,
  resolveAccount,
  BankLookupUnavailableError,
} from '@/lib/bank-lookup';

export const dynamic = 'force-dynamic';

/** GET /api/banks — list Nigerian banks for the account form */
export async function GET() {
  try {
    const banks = await listBanks();
    return NextResponse.json({
      banks: banks
        .filter((b) => b.code && b.name)
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

/** POST /api/banks — resolve account name (requires session) */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: {
    account_number?: string;
    bank_code?: string;
    account_name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const accountNumber = String(body.account_number ?? '').trim();
  const bankCode = String(body.bank_code ?? '').trim();
  const typedName = String(body.account_name ?? '').trim().slice(0, 120);

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
    // Lookup provider not configured or unreachable — let the member
    // confirm the name manually so payout accounts stay saveable.
    if (e instanceof BankLookupUnavailableError) {
      if (typedName) {
        return NextResponse.json({
          account: {
            account_number: accountNumber,
            bank_code: bankCode,
            bank_name: '',
            account_name: typedName,
          },
          manual: true,
        });
      }
      return NextResponse.json(
        {
          error:
            'Automatic name check is unavailable. Enter the account name to continue.',
          manual: true,
        },
        { status: 503 }
      );
    }

    if (e instanceof Error && e.message === 'Account not found at this bank') {
      return NextResponse.json(
        { error: 'Account not found at this bank' },
        { status: 404 }
      );
    }

    console.error('[resolve]', e);
    return NextResponse.json(
      { error: 'Could not verify account. Check details and try again.' },
      { status: 502 }
    );
  }
}

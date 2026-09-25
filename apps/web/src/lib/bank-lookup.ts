/**
 * Bank directory + account-name lookup for payout accounts.
 * This is account verification only — Turna never moves money through it.
 *
 * Bank list: public Nigerian bank directory (no key required).
 * Name lookup: NIBSS name enquiry through a configured provider.
 *   Set BANK_LOOKUP_KEY (and optionally BANK_LOOKUP_URL) to enable.
 */

const BANK_DIRECTORY_URL =
  process.env.BANK_DIRECTORY_URL ?? 'https://gwt.tagpay.ng/v1/banks';

const BANK_LOOKUP_URL =
  process.env.BANK_LOOKUP_URL ?? 'https://gwt.tagpay.ng/v1/banks/resolve';

export type Bank = { code: string; name: string };

export type ResolvedAccount = {
  account_number: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
};

/** Raised when name enquiry cannot run (no key / provider unreachable). */
export class BankLookupUnavailableError extends Error {
  constructor(message = 'Account name lookup is unavailable') {
    super(message);
    this.name = 'BankLookupUnavailableError';
  }
}

/** Used when the remote directory cannot be reached — major NIP banks. */
const FALLBACK_BANKS: Bank[] = [
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
  { code: '526', name: 'Parallex Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'SunTrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

type DirectoryResponse = {
  status?: boolean;
  data?:
    | Bank[]
    | { data?: Bank[] }
    | { code?: string; name?: string }[];
};

function toBanks(payload: DirectoryResponse): Bank[] {
  const raw = payload.data;
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  return list
    .filter((b): b is Bank => Boolean(b?.code && b?.name))
    .map((b) => ({ code: String(b.code), name: String(b.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Nigerian bank directory for the payout-account picker. */
export async function listBanks(): Promise<Bank[]> {
  try {
    const res = await fetch(BANK_DIRECTORY_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`directory ${res.status}`);
    const body = (await res.json()) as DirectoryResponse;
    const banks = toBanks(body);
    if (banks.length === 0) throw new Error('empty directory');
    return banks;
  } catch {
    return FALLBACK_BANKS;
  }
}

/**
 * Resolve the account holder name for a bank + 10-digit NUBAN.
 * Throws BankLookupUnavailableError when no lookup key is configured
 * or the provider cannot be reached — callers offer manual entry then.
 */
export async function resolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<ResolvedAccount> {
  const key = process.env.BANK_LOOKUP_KEY;
  if (!key) throw new BankLookupUnavailableError('BANK_LOOKUP_KEY is not set');

  let res: Response;
  try {
    res = await fetch(BANK_LOOKUP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        bank_code: bankCode,
        account_number: accountNumber,
      }),
      cache: 'no-store',
    });
  } catch {
    throw new BankLookupUnavailableError();
  }

  const body = (await res.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    account_name?: string;
    account_number?: string;
    bank_code?: string;
    bank_name?: string;
    data?: { account_name?: string; account_number?: string; bank_name?: string };
  };

  const accountName =
    body.account_name ?? body.data?.account_name ?? undefined;

  if (!res.ok || body.status === false || !accountName) {
    if (res.status === 401 || res.status === 403 || res.status >= 500) {
      throw new BankLookupUnavailableError();
    }
    throw new Error(body.message || 'Account not found at this bank');
  }

  return {
    account_number: accountNumber,
    bank_code: bankCode,
    bank_name: body.bank_name ?? body.data?.bank_name ?? '',
    account_name: accountName,
  };
}

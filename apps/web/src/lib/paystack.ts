/**
 * Paystack client — transaction init, verify, resolve account, transfer.
 * Keys: PAYSTACK_SECRET_KEY (server only). Never expose secret to client.
 */

const PAYSTACK_BASE = 'https://api.paystack.co';

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return key;
}

async function paystackFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: T;
  };
  if (!res.ok || body.status === false) {
    throw new Error(body.message || `Paystack ${path} failed (${res.status})`);
  }
  return body.data as T;
}

export type PaystackInitData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type PaystackVerifyData = {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  paid_at?: string | null;
  channel?: string;
  gateway_response?: string;
  metadata?: Record<string, unknown>;
  customer?: { email?: string; id?: number | string };
};

export type PaystackResolvedAccount = {
  account_number: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
};

export type PaystackBank = {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway?: string | null;
  pay_with?: boolean;
  active?: boolean;
};

export type PaystackTransferRecipient = {
  recipient_code: string;
  type: string;
  name: string;
  account_number: string;
  bank_code: string;
  currency: string;
};

export type PaystackTransferData = {
  reference: string;
  amount: number;
  status: string;
  recipient?: PaystackTransferRecipient;
  reason?: string | null;
};

/** Initialize a transaction. Returns checkout URL + reference. */
export async function initTransaction(opts: {
  email: string;
  amountKobo: number;
  reference: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitData> {
  return paystackFetch<PaystackInitData>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountKobo,
      currency: 'NGN',
      callback_url: opts.callback_url,
      metadata: opts.metadata ?? {},
    }),
  });
}

/** Verify a transaction by reference. */
export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyData> {
  return paystackFetch<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

/** Resolve bank account name (Paystack Resolve). */
export async function resolveAccount(
  account_number: string,
  bank_code: string
): Promise<PaystackResolvedAccount> {
  return paystackFetch<PaystackResolvedAccount>(
    `/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`
  );
}

/** List Nigerian banks. */
export async function listBanks(): Promise<PaystackBank[]> {
  const data = await paystackFetch<PaystackBank[]>(
    '/bank?country=nigeria&currency=NGN'
  );
  return data;
}

/** Create a transfer recipient (for auto-payout). */
export async function createTransferRecipient(opts: {
  name: string;
  account_number: string;
  bank_code: string;
}): Promise<PaystackTransferRecipient> {
  return paystackFetch<PaystackTransferRecipient>('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: opts.name,
      account_number: opts.account_number,
      bank_code: opts.bank_code,
      currency: 'NGN',
    }),
  });
}

/** Initiate a transfer (payout to member bank account). */
export async function initTransfer(opts: {
  recipient_code: string;
  amountKobo: number;
  reference: string;
  reason?: string;
}): Promise<PaystackTransferData> {
  return paystackFetch<PaystackTransferData>('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      recipient: opts.recipient_code,
      amount: opts.amountKobo,
      currency: 'NGN',
      reason: opts.reason ?? 'Turna circle payout',
      reference: opts.reference,
    }),
  });
}

/** Verify webhook signature (x-paystack-signature = HMAC SHA512 of body). */
export async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false;
  const key = secretKey();
  const { createHmac } = await import('crypto');
  const expected = createHmac('sha512', key).update(body).digest('hex');
  return expected === signature;
}

/**
 * Fee math: amount is the base contribution.
 * fee = amount * fee_bps / 10000
 * network = amount * network_charge_bps / 10000
 * total charged to payer depends on fee_payer.
 */
export function computeFees(opts: {
  amountKobo: number;
  feeBps: number;
  networkChargeBps: number;
  feePayer: 'member' | 'owner' | 'shared';
  forMember: boolean;
}): { fee: number; network: number; total: number } {
  const fee = Math.floor((opts.amountKobo * opts.feeBps) / 10000);
  const network = Math.floor(
    (opts.amountKobo * opts.networkChargeBps) / 10000
  );
  if (opts.forMember) {
    if (opts.feePayer === 'member') {
      return { fee, network, total: opts.amountKobo + fee + network };
    }
    if (opts.feePayer === 'shared') {
      const half = Math.floor((fee + network) / 2);
      return { fee: half, network: half, total: opts.amountKobo + half * 2 };
    }
    return { fee: 0, network, total: opts.amountKobo + network };
  }
  // owner-side charges when fee_payer is owner — member pays base only
  return { fee: 0, network: 0, total: opts.amountKobo };
}

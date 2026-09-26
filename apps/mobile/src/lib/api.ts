import { APP_API_URL, supabase } from './supabase';

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  /** True when the request never reached the server (connectivity). */
  offline?: boolean;
};

export async function post<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  opts?: { auth?: boolean }
): Promise<ApiResult<T>> {
  try {
    let token: string | undefined;
    if (opts?.auth) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    }
    const res = await fetch(`${APP_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as T & {
      error?: string | Record<string, string[]>;
    };
    if (!res.ok) {
      const err = json?.error;
      const msg =
        typeof err === 'string'
          ? err
          : Array.isArray(err?.form)
            ? err.form[0]
            : typeof err === 'object' && err
              ? Object.values(err).flat()[0]
              : 'Request failed';
      return { ok: false, error: msg || 'Request failed' };
    }
    return { ok: true, data: json };
  } catch {
    return {
      ok: false,
      error: 'Network error — check your connection',
      offline: true,
    };
  }
}

/** POST with the signed-in user's access token (`Authorization: Bearer …`). */
export function postAuth<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<ApiResult<T>> {
  return post<T>(path, body, { auth: true });
}

/** Mobile auth calls into the same web API that powers email OTP + signup. */
export const mobileAuth = {
  signup(email: string, password: string, displayName: string) {
    return post('/api/mobile/auth/signup', {
      email,
      password,
      display_name: displayName,
    });
  },
  verifyOtp(email: string, code: string, purpose: 'signup' | 'login' = 'signup') {
    return post('/api/mobile/auth/verify-otp', { email, code, purpose });
  },
  resendOtp(email: string, purpose: 'signup' | 'login' = 'signup') {
    return post('/api/mobile/auth/resend-otp', { email, purpose });
  },
  /** Password sign-in; if email unconfirmed, returns needsVerify. */
  signIn(email: string, password: string) {
    return post<{ needsVerify?: boolean; error?: string }>('/api/mobile/auth/signin', {
      email,
      password,
    });
  },
};

/** Circle invitations — same backend as the web invite form (email included). */
export const mobileInvites = {
  send(input: {
    circle_id: string;
    invitee_email: string;
    payout_position?: number;
    token?: string;
  }) {
    return postAuth<{ success?: string; token?: string; expires_at?: string }>(
      '/api/mobile/invite',
      input
    );
  },
};

/** In-app admin dashboard — gated server-side by the ADMIN_EMAILS allowlist. */
export const mobileAdmin = {
  overview() {
    return postAuth<AdminOverview>('/api/mobile/admin', { action: 'overview' });
  },
  kyc(input: { id: string; decision: 'approved' | 'rejected'; reason?: string }) {
    return postAuth<{ ok?: boolean; status?: string }>('/api/mobile/admin', {
      action: 'kyc',
      ...input,
    });
  },
  contribution(input: { contribution_id: string; decision: 'confirmed' | 'rejected' }) {
    return postAuth<{ ok?: boolean; decision?: string }>('/api/mobile/admin', {
      action: 'contribution',
      ...input,
    });
  },
  broadcast(input: { title: string; body: string }) {
    return postAuth<{ count?: number; inApp?: number; emails?: number }>(
      '/api/mobile/admin',
      { action: 'broadcast', ...input }
    );
  },
  deleteUser(userId: string) {
    return postAuth<{ ok?: boolean }>('/api/mobile/admin', {
      action: 'deleteUser',
      user_id: userId,
    });
  },
};

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
};

export type AdminCircleRow = {
  id: string;
  name: string;
  status: string;
  contribution_amount: number;
  currency: string;
  owner_id: string;
  created_at: string;
};

export type AdminKycRow = {
  id: string;
  user_id: string;
  document_type: string;
  document_number: string;
  full_legal_name: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  profiles: unknown;
};

export type AdminContributionRow = {
  id: string;
  status: string;
  amount: number;
  created_at: string;
  circle_id: string;
  circle_name: string;
  member_email: string;
  member_name: string;
};

export type AdminOverview = {
  counts: {
    users: number;
    circles: number;
    memberships: number;
    pendingKyc: number;
    pendingContributions: number;
  };
  recentUsers: AdminUserRow[];
  recentCircles: AdminCircleRow[];
  kycQueue: AdminKycRow[];
  pendingContributions: AdminContributionRow[];
};

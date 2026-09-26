import { APP_API_URL, supabase } from './supabase';

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  /** True when the request never reached the server (connectivity). */
  offline?: boolean;
};

async function post<T = unknown>(
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

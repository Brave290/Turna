import { APP_API_URL } from './supabase';

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

async function post<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${APP_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    return { ok: false, error: 'Network error — check your connection' };
  }
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

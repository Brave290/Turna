import { APP_API_URL, supabase } from './supabase';

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  /** True when the request never reached the server (connectivity). */
  offline?: boolean;
  /** HTTP status, for diagnosing unexpected responses. */
  status?: number;
  /** Raw body when it was not JSON — reveals HTML error/interstitial pages. */
  raw?: string;
  /** The exact URL that was called. */
  url?: string;
};

export async function post<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  opts?: { auth?: boolean }
): Promise<ApiResult<T>> {
  const url = `${APP_API_URL}${path}`;
  try {
    let token: string | undefined;
    let authNote = 'no-auth';
    if (opts?.auth) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
      authNote = token ? 'bearer-ok' : 'NO-SESSION-TOKEN';
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    // Read as text first: a Vercel/HTML error page would otherwise be silently
    // discarded by res.json() and surface as a bare "Request failed".
    const text = await res.text();
    let json: (T & { error?: string | Record<string, string[]> }) | null = null;
    try {
      json = text ? (JSON.parse(text) as T & { error?: string | Record<string, string[]> }) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const err = json?.error;
      const msg =
        typeof err === 'string'
          ? err
          : Array.isArray((err as { form?: string[] } | undefined)?.form)
            ? ((err as { form: string[] }).form[0] ?? '')
            : err && typeof err === 'object'
              ? (Object.values(err).flat()[0] as string | undefined)
              : '';
      if (msg) return { ok: false, error: msg, status: res.status, url, raw: text.slice(0, 400) };
      // No usable message — surface the real HTTP status and a content hint.
      const kind = text.trim().startsWith('<') ? 'HTML page' : text.slice(0, 120) || 'empty body';
      return {
        ok: false,
        error: `Request failed (HTTP ${res.status}, ${authNote}, ${kind})`,
        status: res.status,
        url,
        raw: text.slice(0, 400),
      };
    }
    if (!json) {
      return {
        ok: false,
        error: `Unexpected non-JSON response (${authNote})`,
        status: res.status,
        url,
        raw: text.slice(0, 400),
      };
    }
    return { ok: true, data: json, status: res.status, url };
  } catch (e) {
    return {
      ok: false,
      error: `Network error — ${e instanceof Error ? e.message : 'check your connection'}`,
      offline: true,
      url,
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
  cronHistory() {
    return postAuth<{ history: CronExecution[] }>('/api/mobile/admin', {
      action: 'cron_history',
    });
  },
  runCron(jobName: string) {
    return postAuth<{ ok: boolean; result?: Record<string, unknown> }>(
      '/api/mobile/admin',
      { action: 'run_cron', job_name: jobName }
    );
  },
};

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
};

export type AdminOverview = {
  counts: {
    users: number;
    circles: number;
    memberships: number;
  };
  recentUsers: AdminUserRow[];
};

export type CronExecution = {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'failed';
  result: Record<string, unknown> | null;
  error: string | null;
};

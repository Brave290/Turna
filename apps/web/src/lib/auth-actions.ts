'use server';


import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';
import {
  signUpSchema,
  signInSchema,
  resetPasswordSchema,
  createCircleSchema,
  inviteMemberSchema,
} from '@turna/validation';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

export type AuthError = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
  circleId?: string;
  needsVerify?: boolean;
  redirectTo?: string;
};

function safeNext(raw: FormDataEntryValue | null): string {
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return '/dashboard';
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Insert an in-app notification (bell). Best-effort — never throws. */
async function notify(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  opts: {
    userId: string;
    circleId?: string | null;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: opts.userId,
      circle_id: opts.circleId ?? null,
      channel: 'in_app',
      title: opts.title,
      body: opts.body,
      data: (opts.data ?? {}) as never,
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    });
    if (error) console.error('[notify]', error.message);
  } catch (e) {
    console.error('[notify]', e);
  }
}

async function notifyCircleMembers(
  circleId: string,
  excludeUserId: string | null,
  payload: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const { data: rows } = await admin
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', circleId)
      .eq('status', 'active');
    const ids = (rows ?? [])
      .map((r) => r.user_id)
      .filter((id) => id && id !== excludeUserId);
    if (ids.length === 0) return;
    await admin.from('notifications').insert(
      ids.map((userId) => ({
        user_id: userId,
        circle_id: circleId,
        channel: 'in_app',
        title: payload.title,
        body: payload.body,
        data: (payload.data ?? {}) as never,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      }))
    );
  } catch (e) {
    console.error('[notifyCircleMembers]', e);
  }
}

/** Store 5-minute OTP + send via Gmail SMTP. Rate limit is a no-op (OTP always works). */
async function issueCustomOtp(
  email: string,
  purpose: 'signup' | 'login' | 'password_change',
  displayName?: string,
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const code = generateOtp();
  const admin = createAdminSupabaseClient();

  const { error: rpcError } = await admin.rpc('create_custom_otp', {
    p_email: email,
    p_code: code,
    p_purpose: purpose,
    p_user_id: userId ?? null,
  });
  if (rpcError) {
    console.error('[OTP] create failed:', rpcError.message);
    return { ok: false, error: 'Could not create verification code' };
  }

  const tmpl = emailTemplates.otpCode(email, code, displayName);
  const sent = await sendEmail({
    to: email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
  });
  if (!sent.success) {
    console.error('[OTP] send failed:', sent.error);
    return { ok: false, error: 'Could not send verification email' };
  }
  return { ok: true };
}

export async function signUp(formData: FormData): Promise<AuthError> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    display_name: formData.get('display_name') as string,
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const afterRedirect = safeNext(formData.get('redirect'));

  const admin = createAdminSupabaseClient();
  const email = parsed.data.email.trim().toLowerCase();

  // Always create unconfirmed user via admin so we fully control OTP flow
  let userId: string | null = null;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: false,
    user_metadata: { display_name: parsed.data.display_name },
  });

  if (createError) {
    const msg = createError.message ?? '';
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
      // Find existing unconfirmed user
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = users?.users?.find((u) => (u.email ?? '').toLowerCase() === email);
      if (existing) {
        userId = existing.id;
        if (existing.email_confirmed_at) {
          return { error: { form: ['An account with this email already exists. Sign in instead.'] } };
        }
        const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
          password: parsed.data.password,
          user_metadata: { display_name: parsed.data.display_name },
        });
        if (updateError) {
          return { error: { form: ['Could not update the pending account. Try again.'] } };
        }
      } else {
        return { error: { form: [msg] } };
      }
    } else {
      return { error: { form: [msg] } };
    }
  } else {
    userId = created?.user?.id ?? null;
  }

  const otp = await issueCustomOtp(email, 'signup', parsed.data.display_name, userId);
  if (!otp.ok) {
    return { error: { form: [otp.error ?? 'Could not send verification code'] } };
  }

  return {
    success: `We sent a 6-digit code to ${email}. It expires in 5 minutes — enter it soon to finish signing up.`,
    needsVerify: true,
    redirectTo: `/auth/verify?email=${encodeURIComponent(email)}${afterRedirect !== '/dashboard' ? `&redirect=${encodeURIComponent(afterRedirect)}` : ''}`,
  };
}

// Custom OTP verification (5-minute expiry)
export async function verifyEmailOtp(
  _prev: AuthError | null,
  formData: FormData
): Promise<AuthError> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const token = String(formData.get('token') ?? '').trim().replace(/\D/g, '');
  const purpose = (String(formData.get('purpose') ?? 'signup') || 'signup') as 'signup' | 'login';
  const nextPath = safeNext(formData.get('redirect'));
  const loginRedirect =
    nextPath !== '/dashboard' ? `/auth/login?redirect=${encodeURIComponent(nextPath)}` : '/auth/login';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: { form: ['Enter a valid email address'] } };
  }
  if (token.length !== 6) {
    return { error: { form: ['Enter the full 6-digit code'] } };
  }

  const admin = createAdminSupabaseClient();

  const { data: otpRow } = await admin
    .from('custom_otps')
    .select('id, user_id, expires_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpRow?.expires_at && new Date(otpRow.expires_at).getTime() < Date.now()) {
    return { error: { form: ['That code has expired. Request a new one.'] } };
  }

  const { data: verified, error: verifyError } = await admin.rpc('verify_custom_otp', {
    p_email: email,
    p_code: token,
    p_purpose: purpose,
    p_max_attempts: 5,
  });

  if (verifyError) {
    console.error('[OTP] verify rpc error:', verifyError.message);
    return { error: { form: ['Verification failed. Try again.'] } };
  }

  if (verified !== true) {
    return { error: { form: ['That code is incorrect or has been used.'] } };
  }

  // Confirm email so password login works
  try {
    let uid: string | null = (otpRow?.user_id as string | null) ?? null;
    if (!uid) {
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      uid = users?.users?.find((u) => (u.email ?? '').toLowerCase() === email)?.id ?? null;
    }
    if (uid) {
      const { data: current } = await admin.auth.admin.getUserById(uid);
      if (current?.user && !current.user.email_confirmed_at) {
        await admin.auth.admin.updateUserById(uid, { email_confirm: true });
      }
    }
  } catch (e) {
    console.error('[OTP] confirm email failed:', e);
  }

  return {
    success: 'Email verified. Sign in with your password to continue.',
    redirectTo: loginRedirect,
  };
}

export async function resendEmailOtp(email: string): Promise<AuthError> {
  const clean = email.trim().toLowerCase();
  if (!clean || !/^\S+@\S+\.\S+$/.test(clean)) {
    return { error: { form: ['Enter a valid email address'] } };
  }

  const admin = createAdminSupabaseClient();
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = users?.users?.find((u) => (u.email ?? '').toLowerCase() === clean);

  const otp = await issueCustomOtp(
    clean,
    'signup',
    (user?.user_metadata?.display_name as string) || undefined,
    user?.id ?? null
  );
  if (!otp.ok) {
    return { error: { form: [otp.error ?? 'Could not send code'] } };
  }

  return { success: `New code sent to ${clean}. It expires in 5 minutes.` };
}

export async function signIn(formData: FormData): Promise<AuthError> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = signInSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = createServerSupabaseClient();
  const email = parsed.data.email.trim().toLowerCase();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = error.message ?? '';

    // Unverified account → force OTP before allowing access
    if (msg.includes('Email not confirmed') || msg.toLowerCase().includes('email not confirmed')) {
      const admin = createAdminSupabaseClient();
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const user = users?.users?.find((u) => (u.email ?? '').toLowerCase() === email);
      if (user && !user.email_confirmed_at) {
        const otp = await issueCustomOtp(
          email,
          'signup',
          (user.user_metadata?.display_name as string) || undefined,
          user.id
        );
        if (otp.ok) {
          const next = safeNext(formData.get('redirect'));
          const verifyQs =
            `/auth/verify?email=${encodeURIComponent(email)}` +
            (next !== '/dashboard' ? `&redirect=${encodeURIComponent(next)}` : '');
          return {
            success: `Please verify your email first. We sent a 6-digit code to ${email} (expires in 5 minutes).`,
            needsVerify: true,
            redirectTo: verifyQs,
          };
        }
        return { error: { form: [otp.error ?? 'Could not send verification code'] } };
      }
      return { error: { form: ['Confirm your email first — check your inbox for the code.'] } };
    }

    const friendly =
      msg === 'Invalid login credentials'
        ? 'That email and password don’t match. Try again.'
        : msg;
    return { error: { form: [friendly] } };
  }

  revalidatePath('/dashboard');
  redirect(safeNext(formData.get('redirect')));
}

export async function signInWithGoogle() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: 'Failed to initiate Google sign in' };
}

export async function signOut() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

// Custom password reset via Gmail SMTP (no Supabase emails)
export async function resetPassword(formData: FormData): Promise<AuthError> {
  const rawData = {
    email: formData.get('email') as string,
  };

  const parsed = resetPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminSupabaseClient();

  try {
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = users?.users?.find((u) => (u.email ?? '').toLowerCase() === email);

    if (user) {
      const { data: token, error: tokenError } = await admin.rpc(
        'create_password_reset_token',
        { p_email: email, p_user_id: user.id }
      );

      if (!tokenError && token) {
        const tmpl = emailTemplates.passwordReset(email, String(token));
        await sendEmail({
          to: email,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
        });
      }
    }
  } catch (e) {
    console.error('[Reset] failed:', e);
  }

  // Always generic success to avoid account enumeration
  return {
    success: `If an account exists for ${email}, we sent a password reset link. Check your inbox (expires in 1 hour).`,
  };
}

export async function resetPasswordWithToken(
  _prev: AuthError | null,
  formData: FormData
): Promise<AuthError> {
  const token = String(formData.get('token') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!token) {
    return { error: { form: ['Invalid or missing reset link.'] } };
  }
  if (password.length < 8) {
    return { error: { form: ['Password must be at least 8 characters'] } };
  }
  if (password !== confirmPassword) {
    return { error: { form: ['Passwords do not match'] } };
  }

  const admin = createAdminSupabaseClient();
  const { data: rows, error: consumeError } = await admin.rpc('consume_password_reset_token', {
    p_token: token,
  });

  if (consumeError) {
    console.error('[Reset] consume error:', consumeError.message);
    return { error: { form: ['Invalid or expired reset link.'] } };
  }

  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row?.user_id) {
    return { error: { form: ['Invalid or expired reset link.'] } };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(row.user_id, {
    password,
    email_confirm: true,
  });

  if (updateError) {
    return { error: { form: [updateError.message] } };
  }

  return { success: 'Password updated. You can sign in now.', redirectTo: '/auth/login' };
}

export async function updatePassword(formData: FormData): Promise<AuthError> {
  const rawData = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const parsed = z
    .object({
      password: z.string().min(8, 'Password must be at least 8 characters'),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  redirect('/dashboard');
}

export type PasswordChangeState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
  step?: 'request' | 'verify';
  redirectTo?: string;
} | null;

/** Step 1 — send OTP to the signed-in user's email before allowing password change. */
export async function requestPasswordChangeOtp(): Promise<PasswordChangeState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: { form: ['Not signed in.'] }, step: 'request' };
  }

  const otp = await issueCustomOtp(
    user.email.toLowerCase(),
    'password_change',
    (user.user_metadata?.display_name as string) || undefined,
    user.id
  );
  if (!otp.ok) {
    return { error: { form: [otp.error ?? 'Could not send verification code.'] }, step: 'request' };
  }

  return {
    success: `We emailed a 6-digit code to ${user.email}. Enter it to continue.`,
    step: 'verify',
  };
}

/** Step 2 — verify OTP, then set the new password. */
export async function verifyAndSetPassword(
  _prev: PasswordChangeState,
  formData: FormData
): Promise<PasswordChangeState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: { form: ['Not signed in.'] }, step: 'request' };
  }

  const email = user.email.toLowerCase();
  const code = String(formData.get('otp') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!/^\d{6}$/.test(code)) {
    return { error: { form: ['Enter the 6-digit code we emailed you.'] }, step: 'verify' };
  }

  const parsed = z
    .object({
      password: z.string().min(8, 'Password must be at least 8 characters'),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .safeParse({ password, confirmPassword });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>, step: 'verify' };
  }

  const admin = createAdminSupabaseClient();
  const { data: verified } = await admin.rpc('verify_custom_otp', {
    p_email: email,
    p_code: code,
    p_purpose: 'password_change',
  });
  if (verified !== true) {
    return { error: { form: ['Invalid or expired code.'] }, step: 'verify' };
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password,
  });
  if (error) {
    return { error: { form: [error.message] }, step: 'verify' };
  }

  // Force re-login with the new password everywhere.
  await supabase.auth.signOut();
  return {
    success: 'Password updated. Sign in with your new password.',
    step: 'request',
    redirectTo: '/auth/login',
  };
}

export type AvatarActionState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

/** Upload a profile picture (avatar) — stores as base64 data URL on profiles.avatar_url. */
export async function uploadAvatar(
  _prev: AvatarActionState,
  formData: FormData
): Promise<AvatarActionState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { error: { form: ['Not signed in.'] } };
  }

  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { error: { form: ['Choose an image to upload.'] } };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: { form: ['Image must be 5MB or smaller.'] } };
  }
  if (!file.type.startsWith('image/')) {
    return { error: { form: ['Only image files are allowed.'] } };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`;

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: dataUrl,
      avatar_version: Date.now(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (error) {
    // Fallback if column is still INT (migration not applied yet)
    if (error.message?.includes('out of range')) {
      const retry = await supabase
        .from('profiles')
        .update({
          avatar_url: dataUrl,
          avatar_version: Math.floor(Date.now() / 1000),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (retry.error) {
        return { error: { form: [retry.error.message] } };
      }
    } else {
      return { error: { form: [error.message] } };
    }
  }

  await supabase.auth.updateUser({
    data: { avatar_url: dataUrl },
  });

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: 'Profile picture updated.' };
}

/** Remove the uploaded avatar (falls back to initials). */
export async function removeAvatar(): Promise<AvatarActionState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { error: { form: ['Not signed in.'] } };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      avatar_version: Date.now(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (error) {
    if (error.message?.includes('out of range')) {
      const retry = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          avatar_version: Math.floor(Date.now() / 1000),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (retry.error) {
        return { error: { form: [retry.error.message] } };
      }
    } else {
      return { error: { form: [error.message] } };
    }
  }

  await supabase.auth.updateUser({ data: { avatar_url: null } });
  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: 'Profile picture removed.' };
}

export async function getSession() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) return profile;

  // Fallback if trigger hasn't created the row yet
  const meta = user.user_metadata ?? {};
  const fallback = {
    id: user.id,
    email: user.email ?? '',
    display_name:
      (meta.display_name as string) ||
      (meta.name as string) ||
      (user.email ?? 'Member').split('@')[0],
    avatar_url: (meta.avatar_url as string | null) ?? null,
  };

  const { data: inserted } = await supabase
    .from('profiles')
    .upsert(fallback, { onConflict: 'id', ignoreDuplicates: true })
    .select()
    .maybeSingle();

  return inserted ?? fallback;
}

export type CircleActionState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
  circleId?: string;
} | null;

export async function createCircle(
  _prev: CircleActionState,
  formData: FormData
): Promise<CircleActionState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?redirect=/dashboard/circles/new');
  }

  const amountRaw = String(formData.get('contribution_amount') ?? '');
  const amountNumber = Number(amountRaw.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return { error: { contribution_amount: ['Enter a valid amount'] } };
  }

  const startMonthRaw = formData.get('start_month');
  const endMonthRaw = formData.get('end_month');
  const startMonth =
    startMonthRaw !== null && startMonthRaw !== '' ? Number(startMonthRaw) : null;
  const endMonth =
    endMonthRaw !== null && endMonthRaw !== '' ? Number(endMonthRaw) : null;

  let startDate = String(formData.get('start_date') ?? '').trim() || undefined;
  let endDate = String(formData.get('end_date') ?? '').trim() || undefined;

  // If only month range given, derive ISO dates (current year, or next year for end)
  const now = new Date();
  const year = now.getFullYear();
  if (!startDate && startMonth !== null && !Number.isNaN(startMonth)) {
    startDate = new Date(Date.UTC(year, startMonth, 1)).toISOString().slice(0, 10);
  }
  if (!endDate && endMonth !== null && !Number.isNaN(endMonth)) {
    const endYear =
      startMonth !== null && endMonth < startMonth ? year + 1 : year;
    const lastDay = new Date(Date.UTC(endYear, endMonth + 1, 0)).getUTCDate();
    endDate = new Date(Date.UTC(endYear, endMonth, lastDay)).toISOString().slice(0, 10);
  }

  const nameInput = String(formData.get('name') ?? '').trim();
  const suggestedName = String(formData.get('suggested_name') ?? '').trim();
  // Prefer explicit suggestion when user left name empty or accepted the auto title
  const name = nameInput || suggestedName;

  const payoutModeRaw = String(formData.get('payout_mode') ?? 'rotating');
  const paymentModeRaw = String(formData.get('payment_mode') ?? 'manual');

  const parsed = createCircleSchema.safeParse({
    name,
    description: String(formData.get('description') ?? '').trim() || undefined,
    contribution_amount: Math.round(amountNumber * 100),
    currency: String(formData.get('currency') ?? 'NGN'),
    frequency: String(formData.get('frequency') ?? 'monthly'),
    member_limit: Number(formData.get('member_limit') ?? 10),
    start_date: startDate,
    end_date: endDate,
    start_month: startMonth !== null && !Number.isNaN(startMonth) ? startMonth : undefined,
    end_month: endMonth !== null && !Number.isNaN(endMonth) ? endMonth : undefined,
    payout_mode: payoutModeRaw === 'end_of_term' ? 'end_of_term' : 'rotating',
    payment_mode: paymentModeRaw === 'autopay' ? 'autopay' : 'manual',
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { data: circle, error } = await supabase
    .from('circles')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      owner_id: user.id,
      contribution_amount: parsed.data.contribution_amount,
      currency: parsed.data.currency,
      frequency: parsed.data.frequency,
      member_limit: parsed.data.member_limit,
      status: 'draft',
      current_cycle: 0,
      start_date: parsed.data.start_date ?? null,
      end_date: parsed.data.end_date ?? null,
      start_month: parsed.data.start_month ?? null,
      end_month: parsed.data.end_month ?? null,
      payout_mode: parsed.data.payout_mode,
      payment_mode: parsed.data.payment_mode,
    })
    .select('id')
    .single();

  if (error || !circle) {
    return { error: { form: [error?.message ?? 'Could not create circle'] } };
  }

  const { error: memberError } = await supabase.from('circle_members').insert({
    circle_id: circle.id,
    user_id: user.id,
    role: 'owner',
    payout_position: 1,
    status: 'active',
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    return { error: { form: [`Circle created but owner membership failed: ${memberError.message}`] } };
  }

  await supabase.from('ledger_events').insert({
    circle_id: circle.id,
    actor_id: user.id,
    event_type: 'CIRCLE_CREATED',
    entity_type: 'circle',
    entity_id: circle.id,
    payload: { name: parsed.data.name },
    previous_event_id: null,
  });

  await notify(supabase, {
    userId: user.id,
    circleId: circle.id,
    title: 'Circle created',
    body: `"${parsed.data.name}" is ready. Invite members to get started.`,
    data: { circle_id: circle.id, event: 'CIRCLE_CREATED' },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/circles');
  return { success: 'Circle created', circleId: circle.id };
}

export type InviteActionState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

export async function inviteMember(
  _prev: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  const parsed = inviteMemberSchema.safeParse({
    circle_id: String(formData.get('circle_id') ?? ''),
    invitee_email: String(formData.get('invitee_email') ?? '').trim().toLowerCase(),
    payout_position: Number(formData.get('payout_position') ?? 1),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { data: circle } = await supabase
    .from('circles')
    .select('id, owner_id, member_limit, name')
    .eq('id', parsed.data.circle_id)
    .maybeSingle();

  if (!circle) {
    return { error: { form: ['Circle not found'] } };
  }
  if (circle.owner_id !== user.id) {
    return { error: { form: ['Only the circle owner can invite members'] } };
  }
  if (parsed.data.invitee_email === (user.email ?? '').toLowerCase()) {
    return { error: { form: ['You cannot invite yourself to your own circle'] } };
  }

  const { count } = await supabase
    .from('circle_members')
    .select('*', { count: 'exact', head: true })
    .eq('circle_id', circle.id);

  if ((count ?? 0) >= circle.member_limit) {
    return { error: { form: ['Member limit reached'] } };
  }

  // Fraud limit: max 20 invites / hour / user
  try {
    const { checkAbuseLimit } = await import('@/lib/circle-actions');
    const allowed = await checkAbuseLimit(user.id, 'invite', 20);
    if (!allowed) {
      return {
        error: { form: ['Too many invites this hour. Try again shortly.'] },
      };
    }
  } catch {
    // fail open
  }

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('invitations').insert({
    circle_id: circle.id,
    inviter_id: user.id,
    invitee_email: parsed.data.invitee_email,
    token,
    status: 'pending',
    expires_at: expires,
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  await supabase.from('ledger_events').insert({
    circle_id: circle.id,
    actor_id: user.id,
    event_type: 'MEMBER_INVITED',
    entity_type: 'invitation',
    entity_id: circle.id,
    payload: { invitee_email: parsed.data.invitee_email },
    previous_event_id: null,
  });

  await notify(supabase, {
    userId: user.id,
    circleId: circle.id,
    title: 'Invitation sent',
    body: `Invite sent to ${parsed.data.invitee_email} for "${circle.name}".`,
    data: { circle_id: circle.id, event: 'MEMBER_INVITED' },
  });

  // Send invitation email via Gmail SMTP (best-effort)
  try {
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    const inviterName = inviterProfile?.display_name || user.email || 'A member';
    const circleName = (circle as { name?: string }).name || 'your circle';
    const tmpl = emailTemplates.circleInvitation(
      parsed.data.invitee_email,
      circleName,
      inviterName,
      token
    );
    await sendEmail({
      to: parsed.data.invitee_email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });
  } catch (e) {
    console.error('[Invite] email send failed:', e);
  }

  revalidatePath(`/dashboard/circles/${circle.id}`);
  return { success: `Invite created for ${parsed.data.invitee_email}` };
}

export type ProfileActionState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const displayName = String(formData.get('display_name') ?? '').trim();
  const dateOfBirth = String(formData.get('date_of_birth') ?? '').trim() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const bio = String(formData.get('bio') ?? '').trim().slice(0, 500) || null;
  const city = String(formData.get('city') ?? '').trim() || null;
  const country = String(formData.get('country') ?? '').trim() || null;

  if (!displayName || displayName.length < 2) {
    return { error: { display_name: ['Name must be at least 2 characters'] } };
  }
  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    return { error: { form: ['Enter a valid date of birth'] } };
  }
  if (phone && !/^[+\d][\d\s-]{6,20}$/.test(phone)) {
    return { error: { form: ['Enter a valid phone number'] } };
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  const payload = {
    id: user.id,
    email: user.email ?? '',
    display_name: displayName,
    date_of_birth: dateOfBirth,
    phone,
    bio,
    city,
    country,
    updated_at: new Date().toISOString(),
  };

  const error = existing
    ? (
        await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
      ).error
    : (await supabase.from('profiles').insert(payload)).error;

  if (error) {
    console.error('[updateProfile]', error.message);
    return { error: { form: [error.message] } };
  }

  try {
    await supabase.auth.updateUser({ data: { display_name: displayName } });
  } catch {
    /* metadata optional */
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return { success: 'Profile updated' };
}

export type CircleFeeState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

/** Owner-only: update platform fee + network charge (VAT) for a circle. */
export async function updateCircleFees(
  _prev: CircleFeeState,
  formData: FormData
): Promise<CircleFeeState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const circleId = String(formData.get('circle_id') ?? '');
  const feeBps = Number(formData.get('fee_bps') ?? 0);
  const networkBps = Number(formData.get('network_charge_bps') ?? 0);
  const feePayer = String(formData.get('fee_payer') ?? 'member');

  if (!circleId) {
    return { error: { form: ['Circle is required'] } };
  }
  if (
    !Number.isFinite(feeBps) ||
    feeBps < 0 ||
    feeBps > 5000 ||
    !Number.isFinite(networkBps) ||
    networkBps < 0 ||
    networkBps > 5000
  ) {
    return { error: { form: ['Fee must be between 0% and 50%'] } };
  }
  if (!['member', 'owner', 'shared'].includes(feePayer)) {
    return { error: { form: ['Invalid fee payer'] } };
  }

  const { data: circle } = await supabase
    .from('circles')
    .select('id, owner_id')
    .eq('id', circleId)
    .maybeSingle();

  if (!circle || circle.owner_id !== user.id) {
    return { error: { form: ['Only the circle owner can change fees'] } };
  }

  const { error } = await supabase
    .from('circles')
    .update({
      fee_bps: Math.round(feeBps),
      network_charge_bps: Math.round(networkBps),
      fee_payer: feePayer,
    })
    .eq('id', circleId);

  if (error) {
    console.error('[updateCircleFees]', error.message);
    return { error: { form: ['Could not save fee settings'] } };
  }

  await notify(supabase, {
    userId: user.id,
    circleId,
    title: 'Fee settings updated',
    body: `Fees for this circle were updated (owner only).`,
    data: { circle_id: circleId, event: 'SETTINGS_CHANGED' },
  });

  revalidatePath(`/dashboard/circles/${circleId}`);
  return { success: 'Fee settings saved' };
}

export type MarkReadState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

/** Mark every unread notification for the signed-in user as read.
 *  Compatible with useFormState(prev, formData) and plain async calls. */
export async function markAllNotificationsRead(
  prev?: MarkReadState,
  formData?: FormData
): Promise<MarkReadState> {
  void prev;
  void formData;
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'read', read_at: now })
    .eq('user_id', user.id)
    .neq('status', 'read');

  if (error) {
    console.error('[markAllNotificationsRead]', error.message);
    return { error: { form: ['Could not mark notifications as read.'] } };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/notifications');
  return { success: 'All notifications marked as read' };
}

/** Mark a single notification as read. */
export async function markNotificationRead(
  notificationId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase
    .from('notifications')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/notifications');
  return { ok: true };
}

export type AcceptInviteState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
  circleId?: string;
} | null;

export async function acceptInvitation(
  _prev: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const supabase = createServerSupabaseClient();
  const token = String(formData.get('token') ?? '').trim();
  const joinBack = token
    ? `/circles/join?token=${encodeURIComponent(token)}`
    : '/circles/join';

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    // Preserve full invite URL through login → auto-join on return
    redirect('/auth/login?redirect=' + encodeURIComponent(joinBack));
  }

  if (!token) {
    return { error: { form: ['Invalid invitation link'] } };
  }

  // Recover pending invite if a callback hop dropped the query string
  const { data: invite } = await supabase
    .from('invitations')
    .select('id, circle_id, invitee_email, status, expires_at, is_open')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return { error: { form: ['This invitation link is invalid or has expired'] } };
  }
  if (invite.status === 'accepted' && !invite.is_open) {
    return { error: { form: ['This invitation has already been used'] } };
  }
  if (invite.status === 'cancelled' || invite.status === 'expired') {
    return { error: { form: ['This invitation is no longer active'] } };
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return { error: { form: ['This invitation has expired. Ask for a new one.'] } };
  }

  const { data: inviteFull } = await supabase
    .from('invitations')
    .select('is_open, max_uses, use_count, invitee_email')
    .eq('id', invite.id)
    .maybeSingle();

  const isOpen = !!inviteFull?.is_open;
  if (!isOpen && inviteFull?.invitee_email) {
    if (inviteFull.invitee_email.toLowerCase() !== user.email.toLowerCase()) {
      return {
        error: {
          form: ['Sign in with the email that received this invitation'],
        },
      };
    }
  }
  if (
    isOpen &&
    inviteFull?.max_uses &&
    (inviteFull.use_count ?? 0) >= inviteFull.max_uses
  ) {
    return { error: { form: ['This invite link has reached its member limit'] } };
  }

  const { data: existing } = await supabase
    .from('circle_members')
    .select('id, status')
    .eq('circle_id', invite.circle_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing && existing.status !== 'left') {
    if (!isOpen) {
      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id);
    }
    return {
      success: 'You are already a member of this circle',
      circleId: invite.circle_id,
    };
  }

  if (existing && existing.status === 'left') {
    const { error: rejoinErr } = await supabase
      .from('circle_members')
      .update({ status: 'active', joined_at: new Date().toISOString(), left_at: null })
      .eq('id', existing.id);
    if (rejoinErr) {
      return { error: { form: ['Could not rejoin the circle'] } };
    }
  } else {
    // payout_position is NOT NULL + unique per circle — assign next free slot
    const { data: taken } = await supabase
      .from('circle_members')
      .select('payout_position')
      .eq('circle_id', invite.circle_id)
      .order('payout_position', { ascending: true });

    const used = new Set((taken ?? []).map((r) => r.payout_position as number));
    let nextPos = 1;
    while (used.has(nextPos)) nextPos += 1;

    const { error: joinErr } = await supabase.from('circle_members').insert({
      circle_id: invite.circle_id,
      user_id: user.id,
      role: 'member',
      status: 'active',
      payout_position: nextPos,
      joined_at: new Date().toISOString(),
    });
    if (joinErr) {
      console.error('[AcceptInvite] join failed:', joinErr.code, joinErr.message);
      const msg =
        joinErr.code === '23505'
          ? 'That payout slot is already taken. Ask the owner for a new invite.'
          : joinErr.code === '42501' || /row-level security/i.test(joinErr.message)
            ? 'You do not have permission to join yet. Sign in with the invited email and try again.'
            : 'Could not join the circle. Please try again.';
      return { error: { form: [msg] } };
    }
  }

  if (isOpen) {
    await supabase
      .from('invitations')
      .update({ use_count: (inviteFull?.use_count ?? 0) + 1 })
      .eq('id', invite.id);
  } else {
    await supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id);
  }

  // ledger_insert_owner requires membership first (already inserted above)
  await supabase.from('ledger_events').insert({
    circle_id: invite.circle_id,
    actor_id: user.id,
    event_type: 'MEMBER_JOINED',
    entity_type: 'member',
    entity_id: user.id,
    payload: { email: user.email },
    previous_event_id: null,
  });

  const { data: circleRow } = await supabase
    .from('circles')
    .select('name, owner_id')
    .eq('id', invite.circle_id)
    .maybeSingle();

  if (circleRow) {
    await notify(supabase, {
      userId: user.id,
      circleId: invite.circle_id,
      title: 'Joined circle',
      body: `You joined "${circleRow.name}". Welcome aboard!`,
      data: { circle_id: invite.circle_id, event: 'MEMBER_JOINED' },
    });
    if (circleRow.owner_id !== user.id) {
      await notifyCircleMembers(invite.circle_id, user.id, {
        title: 'New member joined',
        body: `${user.email} joined "${circleRow.name}".`,
        data: { circle_id: invite.circle_id, event: 'MEMBER_JOINED' },
      });
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/circles');
  revalidatePath('/dashboard/circles');
  revalidatePath(`/dashboard/circles/${invite.circle_id}`);
  return {
    success: 'You have joined the circle',
    circleId: invite.circle_id,
  };
}

export type DeleteCircleState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

/** Owner can delete a circle in any status (draft or active). Cascades members/invites/cycles. */
export async function deleteCircle(
  _prev: DeleteCircleState,
  formData: FormData
): Promise<DeleteCircleState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const circleId = String(formData.get('circle_id') ?? '').trim();
  if (!circleId) {
    return { error: { form: ['Missing circle'] } };
  }

  const { data: circle } = await supabase
    .from('circles')
    .select('id, owner_id, name, status')
    .eq('id', circleId)
    .maybeSingle();

  if (!circle) {
    return { error: { form: ['Circle not found'] } };
  }
  if (circle.owner_id !== user.id) {
    return { error: { form: ['Only the owner can delete this circle'] } };
  }

  // Ledger rows reference circle_id with ON DELETE CASCADE — hard delete is safe.
  const { error: delErr } = await supabase
    .from('circles')
    .delete()
    .eq('id', circleId);

  if (delErr) {
    console.error('[deleteCircle]', delErr.message);
    return {
      error: {
        form: [
          delErr.code === '23503'
            ? 'This circle still has related records and cannot be deleted yet.'
            : 'Could not delete circle',
        ],
      },
    };
  }

  await notify(supabase, {
    userId: user.id,
    title: 'Circle deleted',
    body: `"${circle.name}" was deleted.`,
    data: { event: 'CIRCLE_DELETED', circle_id: circleId },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/circles');
  redirect('/dashboard/circles');
}

export type DeleteAccountState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect('/auth/login');

  const confirmEmail = String(formData.get('confirm_email') ?? '')
    .trim()
    .toLowerCase();
  if (confirmEmail !== user.email.toLowerCase()) {
    return {
      error: { confirm_email: ['Type your account email exactly to confirm'] },
    };
  }

  const admin = createAdminSupabaseClient();

  // circles.owner_id is ON DELETE RESTRICT — must not own any circle
  const { data: owned } = await admin
    .from('circles')
    .select('id')
    .eq('owner_id', user.id);

  if (owned && owned.length > 0) {
    return {
      error: {
        form: [
          'You own circles. Transfer ownership or delete them before deleting your account.',
        ],
      },
    };
  }

  // Leave any circles the user is a member of (RLS + audit trail intact)
  const { data: memberships } = await admin
    .from('circle_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (memberships && memberships.length > 0) {
    await admin
      .from('circle_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .in('id', memberships.map((m) => m.id));
  }

  // Cleanup with service role (no user DELETE policies on these tables)
  await admin.from('notifications').delete().eq('user_id', user.id);
  await admin.from('invitations').delete().eq('inviter_id', user.id);

  // ledger_events.actor_id is ON DELETE RESTRICT — anonymize profile, do not hard-delete
  const { error: anonErr } = await admin
    .from('profiles')
    .update({
      email: `deleted+${user.id}@deleted.turna.invalid`,
      display_name: 'Deleted user',
      avatar_url: null,
    })
    .eq('id', user.id);

  if (anonErr) {
    console.error('[DeleteAccount] anonymize failed:', anonErr.message);
    return { error: { form: ['Could not delete account. Contact support.'] } };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[DeleteAccount] admin delete failed:', error.message);
    // Roll back anonymization is not safe; report failure
    return { error: { form: ['Could not delete account. Contact support.'] } };
  }

  await supabase.auth.signOut();
  redirect('/');
}

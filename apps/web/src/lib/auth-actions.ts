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

/** Store 5-minute OTP + send via Gmail SMTP. Rate limit is a no-op (OTP always works). */
async function issueCustomOtp(
  email: string,
  purpose: 'signup' | 'login',
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
    redirectTo: `/auth/verify?email=${encodeURIComponent(email)}`,
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
    redirectTo: '/auth/login',
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
          return {
            success: `Please verify your email first. We sent a 6-digit code to ${email} (expires in 5 minutes).`,
            needsVerify: true,
            redirectTo: `/auth/verify?email=${encodeURIComponent(email)}`,
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

  const parsed = createCircleSchema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim() || undefined,
    contribution_amount: Math.round(amountNumber * 100),
    currency: String(formData.get('currency') ?? 'NGN'),
    frequency: String(formData.get('frequency') ?? 'monthly'),
    member_limit: Number(formData.get('member_limit') ?? 10),
    start_date: String(formData.get('start_date') ?? '') || undefined,
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

  const { count } = await supabase
    .from('circle_members')
    .select('*', { count: 'exact', head: true })
    .eq('circle_id', circle.id);

  if ((count ?? 0) >= circle.member_limit) {
    return { error: { form: ['Member limit reached'] } };
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
  if (!displayName) {
    return { error: { display_name: ['Name is required'] } };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id);

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/dashboard/settings');
  return { success: 'Profile updated' };
}

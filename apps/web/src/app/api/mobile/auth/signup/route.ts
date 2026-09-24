import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';
import { signUpSchema } from '@turna/validation';
import { NextRequest, NextResponse } from 'next/server';

async function issueOtp(
  email: string,
  purpose: 'signup' | 'login',
  displayName?: string | null,
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminSupabaseClient();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const { error } = await admin.rpc('create_custom_otp', {
    p_email: email,
    p_code: code,
    p_purpose: purpose,
    p_user_id: userId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  const tmpl = emailTemplates.otpCode(email, code);
  const sent = await sendEmail({
    to: email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
  });
  if (!sent.success) return { ok: false, error: 'Could not send verification email' };
  void displayName;
  return { ok: true };
}

/** POST /api/mobile/auth/signup — create unconfirmed user + send OTP */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signUpSchema.safeParse({
      email: body.email,
      password: body.password,
      display_name: body.display_name,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json({ error: first ?? 'Invalid input' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const email = parsed.data.email.trim().toLowerCase();
    let userId: string | null = null;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: false,
      user_metadata: { display_name: parsed.data.display_name },
    });

    if (createError) {
      const msg = createError.message ?? '';
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already been registered')
      ) {
        const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = users?.users?.find((u) => (u.email ?? '').toLowerCase() === email);
        if (existing) {
          userId = existing.id;
          if (existing.email_confirmed_at) {
            return NextResponse.json(
              { error: 'An account with this email already exists. Sign in instead.' },
              { status: 409 }
            );
          }
          await admin.auth.admin.updateUserById(existing.id, {
            password: parsed.data.password,
            user_metadata: { display_name: parsed.data.display_name },
          });
        } else {
          return NextResponse.json({ error: msg }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    } else {
      userId = created?.user?.id ?? null;
    }

    const otp = await issueOtp(email, 'signup', parsed.data.display_name, userId);
    if (!otp.ok) {
      return NextResponse.json({ error: otp.error ?? 'Could not send code' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      needsVerify: true,
      message: `We sent a 6-digit code to ${email}. It expires in 5 minutes.`,
    });
  } catch {
    return NextResponse.json({ error: 'Signup failed' }, { status: 400 });
  }
}

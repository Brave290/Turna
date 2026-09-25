import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Mobile password change — same flow as web requestPasswordChangeOtp /
 * verifyAndSetPassword, but authenticated with `Authorization: Bearer <token>`.
 *
 * POST { action: 'request' } → emails a 6-digit code (purpose password_change)
 * POST { action: 'verify', code, password, confirm_password } → verify + set
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    if (action === 'request') {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const email = user.email.toLowerCase();
      const admin = createAdminSupabaseClient();
      const { error: rpcError } = await admin.rpc('create_custom_otp', {
        p_email: email,
        p_code: code,
        p_purpose: 'password_change',
        p_user_id: user.id,
      });
      if (rpcError) {
        console.error('[mobile password] otp create failed:', rpcError.message);
        return NextResponse.json(
          { error: 'Could not send verification code' },
          { status: 500 }
        );
      }

      const tmpl = emailTemplates.otpCode(
        email,
        code,
        (user.user_metadata?.display_name as string) || undefined
      );
      const sent = await sendEmail({
        to: email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
      if (!sent.success) {
        console.error('[mobile password] otp send failed:', sent.error);
        return NextResponse.json(
          { error: 'Could not send verification email' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: `We emailed a 6-digit code to ${email}. Enter it to continue.`,
      });
    }

    if (action === 'verify') {
      const email = user.email.toLowerCase();
      const code = String(body.code ?? '').trim();

      const parsed = z
        .object({
          password: z.string().min(8, 'Password must be at least 8 characters'),
          confirm_password: z.string(),
        })
        .refine((d) => d.password === d.confirm_password, {
          message: 'Passwords do not match',
        })
        .safeParse({
          password: String(body.password ?? ''),
          confirm_password: String(body.confirm_password ?? ''),
        });
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 }
        );
      }
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: 'Enter the 6-digit code we emailed you.' },
          { status: 400 }
        );
      }

      const admin = createAdminSupabaseClient();
      const { data: verified } = await admin.rpc('verify_custom_otp', {
        p_email: email,
        p_code: code,
        p_purpose: 'password_change',
        p_max_attempts: 5,
      });
      if (verified !== true) {
        return NextResponse.json(
          { error: 'Invalid or expired code.' },
          { status: 401 }
        );
      }

      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password: parsed.data.password,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: 'Password updated. Sign in with your new password.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('[mobile password]', e);
    return NextResponse.json(
      { error: 'Request failed. Try again.' },
      { status: 400 }
    );
  }
}

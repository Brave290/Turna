import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['bank_change', 'profile_change']);

/** POST — send OTP for a sensitive edit (bank / profile unlock). */
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
    const purpose = String(body.purpose ?? '');
    if (!ALLOWED.has(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    const email = user.email.toLowerCase();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const admin = createAdminSupabaseClient();
    const { error: otpError } = await admin.rpc('create_custom_otp', {
      p_email: email,
      p_code: code,
      p_purpose: purpose,
      p_user_id: user.id,
    });
    if (otpError) {
      console.error('[sensitive-otp] create failed:', otpError.message);
      return NextResponse.json({ error: 'Could not send code' }, { status: 500 });
    }

    const tmpl = emailTemplates.otpCode(email, code);
    const sent = await sendEmail({
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });
    if (!sent.success) {
      console.error('[sensitive-otp] send failed:', sent.error);
      return NextResponse.json({ error: 'Could not send email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `We emailed a 6-digit code to ${email}.`,
    });
  } catch (e) {
    console.error('[sensitive-otp]', e);
    return NextResponse.json({ error: 'Could not send code' }, { status: 400 });
  }
}

/** PUT — verify OTP for sensitive edit unlock. */
export async function PUT(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const purpose = String(body.purpose ?? '');
    const code = String(body.code ?? '').replace(/\D/g, '');
    if (!ALLOWED.has(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter the 6-digit code' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: verified } = await admin.rpc('verify_custom_otp', {
      p_email: user.email.toLowerCase(),
      p_code: code,
      p_purpose: purpose,
      p_max_attempts: 5,
    });
    if (verified !== true) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[sensitive-otp verify]', e);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }
}

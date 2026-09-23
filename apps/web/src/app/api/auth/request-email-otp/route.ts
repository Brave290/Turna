import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';
import { NextResponse } from 'next/server';

const OTP_LIMIT = 8;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('[Auth] Failed to check registered email:', profileError.message);
      return NextResponse.json({ error: 'Unable to verify your account right now' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'No account is registered with this email address.' },
        { status: 404 }
      );
    }

    const { data: rateLimit, error: rateLimitError } = await admin.rpc(
      'consume_email_otp_rate_limit',
      { p_email: email }
    );

    if (rateLimitError) {
      console.error('[Auth] Failed to apply email OTP rate limit:', rateLimitError.message);
      return NextResponse.json({ error: 'Unable to send an OTP right now' }, { status: 500 });
    }

    const result = Array.isArray(rateLimit) ? rateLimit[0] : rateLimit;
    if (!result?.allowed) {
      const retryAfter = Number(result?.retry_after_seconds ?? 3600);
      return NextResponse.json(
        { error: `Too many OTP requests. Try again in ${Math.ceil(retryAfter / 60)} minutes.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    // Custom non-expiring OTP via Gmail SMTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { error: otpError } = await admin.rpc('create_custom_otp', {
      p_email: email,
      p_code: code,
      p_purpose: 'login',
      p_user_id: profile?.id ?? null,
    });
    if (otpError) {
      console.error('[Auth] Failed to store custom OTP:', otpError.message);
      return NextResponse.json({ error: otpError.message }, { status: 500 });
    }

    const tmpl = emailTemplates.otpCode(email, code);
    const sent = await sendEmail({
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });
    if (!sent.success) {
      console.error('[Auth] Failed to send OTP email:', sent.error);
      return NextResponse.json({ error: 'Could not send verification email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      limit: OTP_LIMIT,
      remaining: OTP_LIMIT - (result.request_count ?? 0),
    });
  } catch (error) {
    console.error('[Auth] Invalid email OTP request:', error);
    return NextResponse.json({ error: 'Unable to send an OTP right now' }, { status: 400 });
  }
}

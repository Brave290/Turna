import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const OTP_LIMIT = 5;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('[Auth] SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({ error: 'Authentication is temporarily unavailable' }, { status: 503 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabase
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

    const { data: rateLimit, error: rateLimitError } = await supabase.rpc(
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

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpError) {
      console.error('[Auth] Failed to send email OTP:', otpError.message);
      return NextResponse.json({ error: otpError.message }, { status: 429 });
    }

    return NextResponse.json({ success: true, limit: OTP_LIMIT, remaining: OTP_LIMIT - result.request_count });
  } catch (error) {
    console.error('[Auth] Invalid email OTP request:', error);
    return NextResponse.json({ error: 'Unable to send an OTP right now' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reauth
 * Body: { password } or uses email OTP already verified in-session.
 * Returns { ok: true } when identity re-confirmed for sensitive actions.
 */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { password?: string; otp?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const password = String(body.password ?? '');
  const otp = String(body.otp ?? '');

  // Password re-auth
  if (password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
    }
    return NextResponse.json({ ok: true, method: 'password' });
  }

  // Email OTP re-auth — verify a code issued via verifyOtp
  if (otp) {
    const { error } = await supabase.auth.verifyOtp({
      email: user.email,
      token: otp,
      type: 'email',
    });
    if (error) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired code' }, { status: 401 });
    }
    return NextResponse.json({ ok: true, method: 'otp' });
  }

  // Issue a fresh OTP for re-auth
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, method: 'otp-sent' });
}

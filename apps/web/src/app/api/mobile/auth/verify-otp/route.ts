import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

/** POST /api/mobile/auth/verify-otp */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const code = String(body.code ?? '').trim().replace(/\D/g, '');
    const purpose = (body.purpose === 'login' ? 'login' : 'signup') as 'signup' | 'login';

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    if (code.length !== 6) {
      return NextResponse.json({ error: 'Enter the full 6-digit code' }, { status: 400 });
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
      return NextResponse.json({ error: 'That code has expired. Request a new one.' }, { status: 400 });
    }

    const { data: verified, error: verifyError } = await admin.rpc('verify_custom_otp', {
      p_email: email,
      p_code: code,
      p_purpose: purpose,
      p_max_attempts: 5,
    });

    if (verifyError) {
      return NextResponse.json({ error: 'Verification failed. Try again.' }, { status: 500 });
    }
    if (verified !== true) {
      return NextResponse.json({ error: 'That code is incorrect or has been used.' }, { status: 400 });
    }

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
      console.error('[mobile otp] confirm email failed:', e);
    }

    return NextResponse.json({ success: true, emailConfirmed: true });
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }
}

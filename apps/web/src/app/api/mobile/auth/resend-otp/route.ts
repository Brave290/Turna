import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';

/** POST /api/mobile/auth/resend-otp */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const purpose = (body.purpose === 'login' ? 'login' : 'signup') as 'signup' | 'login';

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = users?.users?.find((u) => (u.email ?? '').toLowerCase() === email);

    if (purpose === 'login' && (!user || user.email_confirmed_at)) {
      // Login resend only needed for unconfirmed; still allow if custom flow
      if (!user) {
        return NextResponse.json({ error: 'No account with this email.' }, { status: 404 });
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await admin.rpc('create_custom_otp', {
      p_email: email,
      p_code: code,
      p_purpose: purpose,
      p_user_id: user?.id ?? null,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tmpl = emailTemplates.otpCode(email, code);
    const sent = await sendEmail({
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });
    if (!sent.success) {
      return NextResponse.json({ error: 'Could not send verification email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `New code sent to ${email}.` });
  } catch {
    return NextResponse.json({ error: 'Could not send code' }, { status: 400 });
  }
}

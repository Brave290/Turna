import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { signInSchema } from '@turna/validation';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/** POST /api/mobile/auth/signin — password login; returns needsVerify if email unconfirmed */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signInSchema.safeParse({
      email: body.email,
      password: body.password,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json({ error: first ?? 'Invalid input' }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (error) {
      const msg = error.message ?? '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        const admin = createAdminSupabaseClient();
        const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const user = users?.users?.find((u) => (u.email ?? '').toLowerCase() === email);
        if (user && !user.email_confirmed_at) {
          const code = String(Math.floor(100000 + Math.random() * 900000));
          await admin.rpc('create_custom_otp', {
            p_email: email,
            p_code: code,
            p_purpose: 'login',
            p_user_id: user.id,
          });
          const { sendEmail, emailTemplates } = await import('@/lib/email');
          const tmpl = emailTemplates.otpCode(email, code);
          await sendEmail({
            to: email,
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
          });
          return NextResponse.json({
            needsVerify: true,
            message: `We sent a 6-digit code to ${email}.`,
          });
        }
        return NextResponse.json(
          { error: 'Confirm your email first — check your inbox for the code.' },
          { status: 401 }
        );
      }
      const friendly =
        msg === 'Invalid login credentials'
          ? 'That email and password don’t match. Try again.'
          : msg;
      return NextResponse.json({ error: friendly }, { status: 401 });
    }

    // Forward set-cookies so mobile/browser can persist session if needed
    const cookieStore = cookies();
    const setCookies = cookieStore.getAll().map((c) => `${c.name}=${c.value}`);
    return NextResponse.json(
      { success: true },
      { headers: setCookies.length ? { 'Set-Cookie': setCookies.join('; ') } : undefined }
    );
  } catch {
    return NextResponse.json({ error: 'Sign in failed' }, { status: 400 });
  }
}

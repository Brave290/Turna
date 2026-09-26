import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

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
      console.error('[Mobile Reset API] failed:', e);
    }

    return NextResponse.json({
      success: `If an account exists for ${email}, we sent a password reset link.`,
    });
  } catch {
    return NextResponse.json({ error: 'Unable to process request' }, { status: 400 });
  }
}

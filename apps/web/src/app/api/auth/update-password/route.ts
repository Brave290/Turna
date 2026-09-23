import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: rows, error: consumeError } = await admin.rpc(
      'consume_password_reset_token',
      { p_token: parsed.data.token }
    );

    if (consumeError) {
      return NextResponse.json({ error: { form: ['Invalid or expired reset link.'] } }, { status: 400 });
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.user_id) {
      return NextResponse.json({ error: { form: ['Invalid or expired reset link.'] } }, { status: 400 });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(row.user_id, {
      password: parsed.data.password,
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json({ error: { form: [updateError.message] } }, { status: 400 });
    }

    return NextResponse.json({ success: 'Password updated successfully.' });
  } catch {
    return NextResponse.json({ error: 'Unable to process request' }, { status: 400 });
  }
}

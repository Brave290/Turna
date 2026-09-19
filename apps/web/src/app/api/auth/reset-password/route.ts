import { createServerSupabaseClient } from '@/lib/supabase-server';
import { resetPasswordSchema } from '@turna/validation';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  
  const rawData = {
    email: formData.get('email') as string,
  };

  const parsed = resetPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
  });

  if (error) {
    return NextResponse.json(
      { error: { form: [error.message] } },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: 'Check your email for password reset instructions.',
  });
}
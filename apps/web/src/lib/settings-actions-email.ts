import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export type EmailActionState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

/** Request email change via Supabase (sends confirmation to new address). */
export async function changeEmail(
  _prev: EmailActionState,
  formData: FormData
): Promise<EmailActionState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const newEmail = String(formData.get('new_email') ?? '')
    .trim()
    .toLowerCase();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { error: { form: ['Enter a valid email address.'] } };
  }
  if (newEmail === user.email?.toLowerCase()) {
    return { error: { form: ['That is already your email.'] } };
  }

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/dashboard/settings/email');
  return {
    success: 'Check your new inbox for a confirmation link.',
  };
}

/** Resend email verification to current address. */
export async function resendVerification(): Promise<{ success?: string; error?: string }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'Not signed in.' };

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
  });
  if (error) return { error: error.message };
  return { success: 'Verification email sent.' };
}

'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { signUpSchema, signInSchema, resetPasswordSchema } from '@turna/validation';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export async function signUp(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    display_name: formData.get('display_name') as string,
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.display_name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  return { success: 'Check your email to confirm your account.' };
}

export async function signIn(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = signInSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  redirect('/dashboard');
}

export async function signInWithGoogle() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: 'Failed to initiate Google sign in' };
}

export async function signOut() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

export async function resetPassword(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
  };

  const parsed = resetPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  return { success: 'Check your email for password reset instructions.' };
}

export async function updatePassword(formData: FormData) {
  const rawData = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const parsed = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }).safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  redirect('/dashboard');
}

export async function getSession() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
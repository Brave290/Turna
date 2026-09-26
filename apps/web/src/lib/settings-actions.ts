'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export type SettingsActionState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
} | null;

const ALLOWED_KEYS = new Set([
  'theme',
  'reduce_motion',
  'language',
  'currency',
  'push_notifications',
  'email_notifications',
  'contribution_reminders',
  'payout_reminders',
  'circle_activity',
  'security_alerts',
  'marketing',
  'default_frequency',
  'default_reminder_time',
  'reminder_lead_hours',
  'show_completed_circles',
  'reminder_time',
  'contribution_due',
  'day_before',
  'due_today',
  'overdue',
  'payout_approaching',
  'profile_visibility',
  'activity_visibility',
  'data_sharing',
]);

const BOOL_KEYS = new Set([
  'reduce_motion',
  'push_notifications',
  'email_notifications',
  'contribution_reminders',
  'payout_reminders',
  'circle_activity',
  'security_alerts',
  'marketing',
  'show_completed_circles',
  'contribution_due',
  'day_before',
  'due_today',
  'overdue',
  'payout_approaching',
  'data_sharing',
]);

/**
 * Persist user preferences (partial update from FormData).
 * Creates the row on first save.
 */
export async function saveUserPreferences(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { error: { form: ['Not signed in.'] } };
  }

  const patch: Record<string, unknown> = {};
  for (const [key, raw] of formData.entries()) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (key === 'security_alerts') {
      // Security alerts cannot be disabled
      patch[key] = true;
      continue;
    }
    if (BOOL_KEYS.has(key)) {
      patch[key] = raw === 'true' || raw === 'on';
    } else if (key === 'reminder_lead_hours') {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n <= 720) patch[key] = n;
    } else {
      patch[key] = String(raw).slice(0, 64);
    }
  }

  if (Object.keys(patch).length === 0) {
    return { error: { form: ['Nothing to save.'] } };
  }

  patch.updated_at = new Date().toISOString();

  const { data: existing } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_preferences')
      .update(patch)
      .eq('user_id', user.id);
    if (error) return { error: { form: [error.message] } };
  } else {
    const { error } = await supabase
      .from('user_preferences')
      .insert({ user_id: user.id, ...patch });
    if (error) return { error: { form: [error.message] } };
  }

  if (patch.theme === 'light' || patch.theme === 'dark' || patch.theme === 'system') {
    // Theme also applied client-side via Appearance page; revalidate for SSR defaults
  }

  revalidatePath('/');
  revalidatePath('/');
  return { success: 'Settings updated' };
}

/** Load persisted preferences with defaults for first-time users. */
export async function loadUserPreferences(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

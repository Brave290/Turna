-- Avatar cache-bust overflow fix + user preferences + username

-- avatar_version was INT; Date.now() (~1.7e12) overflows signed 32-bit int
ALTER TABLE public.profiles
  ALTER COLUMN avatar_version TYPE BIGINT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key
  ON public.profiles (username)
  WHERE username IS NOT NULL;

-- Central persisted user settings (notifications, appearance, privacy, circle defaults)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,
  language TEXT NOT NULL DEFAULT 'en',
  currency TEXT NOT NULL DEFAULT 'NGN',

  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  contribution_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  payout_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  circle_activity BOOLEAN NOT NULL DEFAULT TRUE,
  security_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  marketing BOOLEAN NOT NULL DEFAULT FALSE,

  default_frequency TEXT NOT NULL DEFAULT 'weekly',
  default_reminder_time TEXT NOT NULL DEFAULT '18:00',
  reminder_lead_hours INT NOT NULL DEFAULT 24,
  show_completed_circles BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time TEXT NOT NULL DEFAULT '18:00',
  contribution_due BOOLEAN NOT NULL DEFAULT TRUE,
  day_before BOOLEAN NOT NULL DEFAULT TRUE,
  due_today BOOLEAN NOT NULL DEFAULT TRUE,
  overdue BOOLEAN NOT NULL DEFAULT TRUE,
  payout_approaching BOOLEAN NOT NULL DEFAULT TRUE,

  profile_visibility TEXT NOT NULL DEFAULT 'members',
  activity_visibility TEXT NOT NULL DEFAULT 'members',
  data_sharing BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_prefs_select_own" ON public.user_preferences;
CREATE POLICY "user_prefs_select_own"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_prefs_insert_own" ON public.user_preferences;
CREATE POLICY "user_prefs_insert_own"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_prefs_update_own" ON public.user_preferences;
CREATE POLICY "user_prefs_update_own"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_prefs_delete_own" ON public.user_preferences;
CREATE POLICY "user_prefs_delete_own"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

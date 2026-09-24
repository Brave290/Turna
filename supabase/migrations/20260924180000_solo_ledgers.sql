-- Solo Ledger: personal offline-first ajo tracker (no circle required)

CREATE TABLE IF NOT EXISTS public.solo_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  default_amount bigint NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  local_updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solo_ledgers_user ON public.solo_ledgers(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.solo_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id uuid NOT NULL REFERENCES public.solo_ledgers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  note text,
  expected_amount bigint NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  local_updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solo_contributors_ledger ON public.solo_contributors(ledger_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_solo_contributors_user ON public.solo_contributors(user_id);

CREATE TABLE IF NOT EXISTS public.solo_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id uuid NOT NULL REFERENCES public.solo_ledgers(id) ON DELETE CASCADE,
  contributor_id uuid NOT NULL REFERENCES public.solo_contributors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',
  amount_paid bigint NOT NULL DEFAULT 0,
  paid_on date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  local_updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contributor_id, period)
);
CREATE INDEX IF NOT EXISTS idx_solo_entries_ledger_period ON public.solo_entries(ledger_id, period);
CREATE INDEX IF NOT EXISTS idx_solo_entries_user ON public.solo_entries(user_id);

ALTER TABLE public.solo_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solo_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solo_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo_ledgers_own" ON public.solo_ledgers;
CREATE POLICY "solo_ledgers_own" ON public.solo_ledgers FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "solo_contributors_own" ON public.solo_contributors;
CREATE POLICY "solo_contributors_own" ON public.solo_contributors FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "solo_entries_own" ON public.solo_entries;
CREATE POLICY "solo_entries_own" ON public.solo_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

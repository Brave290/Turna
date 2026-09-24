-- Lifecycle helpers: start / pause / complete circle + create cycles
-- Members leave / remove; contribution dispute status; KYC + wallet columns

-- ============================================================
-- 1. Circle lifecycle already uses status draft|active|paused|completed|cancelled
--    We add a helper to create the next cycle rows (RPC, owner-only checked in app).
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_next_cycle(
  p_circle_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_next INT;
  v_amount BIGINT;
  v_freq TEXT;
  v_due DATE;
  v_payout_member UUID;
  v_cycle_id UUID;
BEGIN
  SELECT owner_id, contribution_amount, frequency INTO v_owner, v_amount, v_freq
  FROM circles WHERE id = p_circle_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Circle not found';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Only the circle owner can create cycles';
  END IF;

  SELECT COALESCE(MAX(cycle_number), 0) + 1 INTO v_next
  FROM contribution_cycles WHERE circle_id = p_circle_id;

  v_due := CURRENT_DATE + CASE v_freq
    WHEN 'weekly' THEN INTERVAL '7 days'
    WHEN 'biweekly' THEN INTERVAL '14 days'
    ELSE INTERVAL '30 days'
  END;

  -- Next payout member by position (rotate)
  SELECT id INTO v_payout_member
  FROM circle_members
  WHERE circle_id = p_circle_id AND status = 'active'
  ORDER BY payout_position ASC
  OFFSET ((v_next - 1) % GREATEST(
    (SELECT COUNT(*) FROM circle_members WHERE circle_id = p_circle_id AND status = 'active'),
    1
  ))
  LIMIT 1;

  INSERT INTO contribution_cycles (
    circle_id, cycle_number, due_date, payout_member_id, expected_amount, status
  ) VALUES (
    p_circle_id, v_next, v_due::date, v_payout_member, v_amount, 'collecting'
  )
  RETURNING id INTO v_cycle_id;

  UPDATE circles SET current_cycle = v_next WHERE id = p_circle_id;

  RETURN v_cycle_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_next_cycle(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_next_cycle(UUID) TO authenticated;

-- ============================================================
-- 2. Lightweight KYC before real payouts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kyc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('nin', 'bvn', 'id_card')),
  document_number TEXT NOT NULL,
  full_legal_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON public.kyc_records(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_records(status);

DROP TRIGGER IF EXISTS update_kyc_updated_at ON public.kyc_records;
CREATE TRIGGER update_kyc_updated_at BEFORE UPDATE ON public.kyc_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.kyc_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_select_own" ON public.kyc_records;
DROP POLICY IF EXISTS "kyc_insert_own" ON public.kyc_records;
DROP POLICY IF EXISTS "kyc_update_own" ON public.kyc_records;
DROP POLICY IF EXISTS "kyc_select_admin" ON public.kyc_records;

CREATE POLICY "kyc_select_own" ON public.kyc_records
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "kyc_insert_own" ON public.kyc_records
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "kyc_update_own" ON public.kyc_records
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. Terms acceptance gate before first real payment
-- ============================================================
CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT '2026-09',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  CONSTRAINT terms_acceptances_unique_user_version UNIQUE (user_id, version)
);

CREATE INDEX IF NOT EXISTS idx_terms_user ON public.terms_acceptances(user_id);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terms_select_own" ON public.terms_acceptances;
DROP POLICY IF EXISTS "terms_insert_own" ON public.terms_acceptances;

CREATE POLICY "terms_select_own" ON public.terms_acceptances
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "terms_insert_own" ON public.terms_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. Invite / contribution fraud rate-limit counters
-- ============================================================
CREATE TABLE IF NOT EXISTS public.abuse_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INT NOT NULL DEFAULT 0,
  CONSTRAINT abuse_counters_unique UNIQUE (user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_abuse_user_action ON public.abuse_counters(user_id, action);

ALTER TABLE public.abuse_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abuse_select_own" ON public.abuse_counters;
DROP POLICY IF EXISTS "abuse_insert_own" ON public.abuse_counters;
DROP POLICY IF EXISTS "abuse_update_own" ON public.abuse_counters;

CREATE POLICY "abuse_select_own" ON public.abuse_counters
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "abuse_insert_own" ON public.abuse_counters
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "abuse_update_own" ON public.abuse_counters
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. Wallet balances (paid vs expected per circle)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  paid_amount BIGINT NOT NULL DEFAULT 0,
  expected_amount BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_balances_unique UNIQUE (user_id, circle_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_user ON public.wallet_balances(user_id);

DROP TRIGGER IF EXISTS update_wallet_updated_at ON public.wallet_balances;
CREATE TRIGGER update_wallet_updated_at BEFORE UPDATE ON public.wallet_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_select_own" ON public.wallet_balances;
DROP POLICY IF EXISTS "wallet_upsert_own" ON public.wallet_balances;
DROP POLICY IF EXISTS "wallet_update_own" ON public.wallet_balances;

CREATE POLICY "wallet_select_own" ON public.wallet_balances
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wallet_upsert_own" ON public.wallet_balances
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "wallet_update_own" ON public.wallet_balances
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. Allow dispute statuses on contributions if missing
-- ============================================================
DO $$ BEGIN
  ALTER TYPE contribution_status ADD VALUE IF NOT EXISTS 'disputed';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

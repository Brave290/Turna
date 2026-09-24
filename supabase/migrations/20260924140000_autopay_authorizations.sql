-- Phase 42: payment authorizations for autopay + admin email ops

-- ============================================================
-- 1. Saved Paystack authorizations (autopay on due date)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  authorization_code TEXT NOT NULL,
  email TEXT NOT NULL,
  channel TEXT,
  last4 TEXT,
  bank TEXT,
  reusable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_auth_user ON public.payment_authorizations(user_id);

DROP TRIGGER IF EXISTS update_payment_authorizations_updated_at ON public.payment_authorizations;
CREATE TRIGGER update_payment_authorizations_updated_at BEFORE UPDATE
  ON public.payment_authorizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.payment_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_auth_select_own" ON public.payment_authorizations;
DROP POLICY IF EXISTS "payment_auth_upsert_own" ON public.payment_authorizations;

CREATE POLICY "payment_auth_select_own" ON public.payment_authorizations
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "payment_auth_upsert_own" ON public.payment_authorizations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 2. Tag autopay charge attempts (idempotent per cycle+user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.autopay_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES contribution_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT autopay_charges_unique UNIQUE (cycle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_autopay_cycle ON public.autopay_charges(cycle_id);
ALTER TABLE public.autopay_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "autopay_admin" ON public.autopay_charges;
-- No member read — service role only for writes; members don't need it

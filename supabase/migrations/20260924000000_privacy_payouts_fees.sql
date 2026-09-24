-- Privacy + payout accounts + platform fees
-- Applied via Supabase Management API

-- ============================================================
-- 1. Bank accounts for automatic payouts (Paystack Resolve verified)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,           -- resolved via Paystack Resolve
  is_default BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bank_accounts_unique_user_account UNIQUE (user_id, bank_code, account_number),
  CONSTRAINT bank_accounts_account_number_len CHECK (char_length(account_number) = 10)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_one_default
  ON public.bank_accounts(user_id) WHERE is_default;

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Platform / circle fee settings (owner or platform admin sets)
-- ============================================================
-- fee_bps = basis points (100 = 1%). network_charge_bps = VAT/network fee.
ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS fee_bps INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS network_charge_bps INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_payer TEXT NOT NULL DEFAULT 'member'
    CHECK (fee_payer IN ('member', 'owner', 'shared'));

ALTER TABLE public.circles
  ADD CONSTRAINT circles_fee_bps_range CHECK (fee_bps >= 0 AND fee_bps <= 5000),
  ADD CONSTRAINT circles_network_bps_range CHECK (network_charge_bps >= 0 AND network_charge_bps <= 5000);

-- ============================================================
-- 3. Payments ledger (Paystack transactions)
-- ============================================================
CREATE TYPE payment_status AS ENUM (
  'pending', 'success', 'failed', 'abandoned', 'refunded'
);
CREATE TYPE payment_kind AS ENUM (
  'contribution', 'fee', 'payout', 'topup'
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES contribution_cycles(id) ON DELETE SET NULL,
  kind payment_kind NOT NULL DEFAULT 'contribution',
  amount BIGINT NOT NULL CHECK (amount > 0),          -- kobo
  fee_amount BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  network_charge BIGINT NOT NULL DEFAULT 0 CHECK (network_charge >= 0),
  total_amount BIGINT NOT NULL CHECK (total_amount > 0), -- amount + fee + network
  currency TEXT NOT NULL DEFAULT 'NGN',
  status payment_status NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_payload JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_circle ON public.payments(circle_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_accounts_select_own" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert_own" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update_own" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_delete_own" ON public.bank_accounts;

CREATE POLICY "bank_accounts_select_own" ON public.bank_accounts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bank_accounts_insert_own" ON public.bank_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bank_accounts_update_own" ON public.bank_accounts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "bank_accounts_delete_own" ON public.bank_accounts
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
DROP POLICY IF EXISTS "payments_select_circle_owner" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;

CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "payments_select_circle_owner" ON public.payments
  FOR SELECT USING (
    circle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = payments.circle_id
        AND c.owner_id = auth.uid()
    )
  );
CREATE POLICY "payments_insert_own" ON public.payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. Mask ledger actor for non-owners (privacy)
-- Members must not see who paid what / other members' bank details.
-- Owner still sees full ledger via existing select policy.
-- ============================================================
DROP POLICY IF EXISTS "ledger_select_member" ON public.ledger_events;
CREATE POLICY "ledger_select_member" ON public.ledger_events
  FOR SELECT USING (
    -- Full access: circle owner (admin of the room)
    EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = ledger_events.circle_id
        AND c.owner_id = auth.uid()
    )
    OR actor_id = auth.uid()
    -- Members: only non-money events (no contribution/payout amounts or actor detail)
    OR (
      EXISTS (
        SELECT 1 FROM circle_members m
        WHERE m.circle_id = ledger_events.circle_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
      AND event_type NOT IN (
        'CONTRIBUTION_REPORTED',
        'CONTRIBUTION_CONFIRMED',
        'CONTRIBUTION_REJECTED',
        'CONTRIBUTION_DISPUTED',
        'CONTRIBUTION_CORRECTION_REQUESTED',
        'CONTRIBUTION_CORRECTION_APPROVED',
        'CONTRIBUTION_CORRECTION_REJECTED',
        'PAYOUT_INITIATED',
        'PAYOUT_MARKED_SENT',
        'PAYOUT_RECEIPT_CONFIRMED',
        'PAYOUT_DISPUTED',
        'PAYOUT_ORDER_SET',
        'PAYOUT_ORDER_CHANGED'
      )
    )
  );

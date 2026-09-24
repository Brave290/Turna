-- Payout position / cycle swap requests
-- Members can request to swap payout month/position; owner approves.

CREATE TABLE IF NOT EXISTS public.payout_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  requester_member_id UUID NOT NULL REFERENCES circle_members(id) ON DELETE CASCADE,
  target_member_id UUID NOT NULL REFERENCES circle_members(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES contribution_cycles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payout_swap_distinct_members CHECK (requester_member_id <> target_member_id),
  CONSTRAINT payout_swap_one_pending UNIQUE (circle_id, requester_member_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_payout_swaps_circle ON public.payout_swap_requests(circle_id);
CREATE INDEX IF NOT EXISTS idx_payout_swaps_status ON public.payout_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_swaps_requester ON public.payout_swap_requests(requester_member_id);
CREATE INDEX IF NOT EXISTS idx_payout_swaps_target ON public.payout_swap_requests(target_member_id);

DROP TRIGGER IF EXISTS update_payout_swaps_updated_at ON public.payout_swap_requests;
CREATE TRIGGER update_payout_swaps_updated_at BEFORE UPDATE ON public.payout_swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.payout_swap_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_swaps_select_circle" ON public.payout_swap_requests;
DROP POLICY IF EXISTS "payout_swaps_insert_member" ON public.payout_swap_requests;
DROP POLICY IF EXISTS "payout_swaps_update_involved" ON public.payout_swap_requests;
DROP POLICY IF EXISTS "payout_swaps_update_owner" ON public.payout_swap_requests;

CREATE POLICY "payout_swaps_select_circle" ON public.payout_swap_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members m
      WHERE m.circle_id = payout_swap_requests.circle_id
        AND m.user_id = auth.uid()
        AND m.status IN ('active', 'pending')
    )
    OR EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = payout_swap_requests.circle_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "payout_swaps_insert_member" ON public.payout_swap_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM circle_members m
      WHERE m.id = payout_swap_requests.requester_member_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "payout_swaps_update_involved" ON public.payout_swap_requests
  FOR UPDATE USING (
    status = 'pending' AND (
      requester_member_id IN (
        SELECT id FROM circle_members WHERE user_id = auth.uid()
      )
      OR target_member_id IN (
        SELECT id FROM circle_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "payout_swaps_update_owner" ON public.payout_swap_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = payout_swap_requests.circle_id
        AND c.owner_id = auth.uid()
    )
  );

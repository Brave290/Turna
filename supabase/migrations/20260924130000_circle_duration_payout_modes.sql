-- Circle duration (start/end months) + payout collection mode + payment mode

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS payout_mode TEXT NOT NULL DEFAULT 'rotating'
    CHECK (payout_mode IN ('rotating', 'end_of_term')),
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (payment_mode IN ('manual', 'autopay')),
  ADD COLUMN IF NOT EXISTS start_month SMALLINT,
  ADD COLUMN IF NOT EXISTS end_month SMALLINT;

-- Guard: end_date must be on/after start_date when both set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'circles_end_after_start'
  ) THEN
    ALTER TABLE public.circles
      ADD CONSTRAINT circles_end_after_start
      CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
  END IF;
END $$;

-- Create first cycle due date: prefer start_date when present, else +1 period
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
  v_end DATE;
  v_start DATE;
  v_active INT;
BEGIN
  SELECT owner_id, contribution_amount, frequency, start_date, end_date
    INTO v_owner, v_amount, v_freq, v_start, v_end
  FROM circles WHERE id = p_circle_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Circle not found';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Only the circle owner can create cycles';
  END IF;
  IF v_end IS NOT NULL AND CURRENT_DATE > v_end THEN
    RAISE EXCEPTION 'Circle duration has ended';
  END IF;

  SELECT COALESCE(MAX(cycle_number), 0) + 1 INTO v_next
  FROM contribution_cycles WHERE circle_id = p_circle_id;

  IF v_next = 1 AND v_start IS NOT NULL THEN
    v_due := v_start::date;
  ELSE
    v_due := CURRENT_DATE + CASE v_freq
      WHEN 'weekly' THEN INTERVAL '7 days'
      WHEN 'biweekly' THEN INTERVAL '14 days'
      ELSE INTERVAL '30 days'
    END;
  END IF;

  IF v_end IS NOT NULL AND v_due > v_end THEN
    RAISE EXCEPTION 'No more cycles — duration ended';
  END IF;

  SELECT COUNT(*) INTO v_active
  FROM circle_members
  WHERE circle_id = p_circle_id AND status = 'active';

  SELECT id INTO v_payout_member
  FROM circle_members
  WHERE circle_id = p_circle_id AND status = 'active'
  ORDER BY payout_position ASC
  OFFSET ((v_next - 1) % GREATEST(v_active, 1))
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

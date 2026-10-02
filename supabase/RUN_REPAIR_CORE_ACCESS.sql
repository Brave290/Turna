-- Turna: repair core access control + backfill owner memberships
-- Run this whole file in the Supabase SQL Editor.
-- Safe to run more than once (all statements are idempotent).
--
-- WHY: circles created before owner membership existed had no active owner
-- row in circle_members, so cycles / contributions / payouts / ledger
-- queries all resolved to empty for those circles.

-- 1) Make sure RLS is on for every core table.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2) Give every circle an active owner membership (the missing rows).
INSERT INTO public.circle_members (circle_id, user_id, role, payout_position, status, joined_at)
SELECT c.id, c.owner_id, 'owner'::member_role, 1, 'active'::member_status, COALESCE(c.created_at, now())
FROM public.circles c
WHERE NOT EXISTS (
  SELECT 1 FROM public.circle_members m
  WHERE m.circle_id = c.id AND m.user_id = c.owner_id
);

-- 3) Pin the trigger function's search_path.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Verify: circles without an active owner membership should be 0
SELECT count(*) AS circles_missing_owner
FROM public.circles c
WHERE NOT EXISTS (
  SELECT 1 FROM public.circle_members m
  WHERE m.circle_id = c.id AND m.user_id = c.owner_id AND m.status = 'active'
);

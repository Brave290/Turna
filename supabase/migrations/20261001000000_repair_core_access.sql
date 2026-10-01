-- Repair core access control and circles created before owner membership was added.
-- All statements are idempotent so this can safely run on an already-populated project.

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

-- Existing circles created by the owner must also have an active owner membership;
-- downstream cycles, contributions, payouts, and ledger queries depend on it.
INSERT INTO public.circle_members (
  circle_id,
  user_id,
  role,
  payout_position,
  status,
  joined_at
)
SELECT
  c.id,
  c.owner_id,
  'owner'::member_role,
  1,
  'active'::member_status,
  COALESCE(c.created_at, now())
FROM public.circles c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.circle_members m
  WHERE m.circle_id = c.id
    AND m.user_id = c.owner_id
);

ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

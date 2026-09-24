-- Open share/QR invites, contribution proof, announcements, polls, rules, agreements

-- 1) Open (shareable / QR) invitations
ALTER TABLE public.invitations ALTER COLUMN invitee_email DROP NOT NULL;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT false;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS max_uses int;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS use_count int NOT NULL DEFAULT 0;

-- 2) Payment proof on contributions
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS payment_method_preferred text;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS proof_note text;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS proof_storage_path text;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS receipt_code text;

-- 3) Circle rules + preferred payment method + start another cycle flags
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS rules jsonb;
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS preferred_payment_method text DEFAULT 'bank_transfer';
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS late_policy text DEFAULT 'admin_review';
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS rules_version int NOT NULL DEFAULT 1;

-- 4) Announcements
CREATE TABLE IF NOT EXISTS public.circle_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_circle_announcements_circle ON public.circle_announcements(circle_id, pinned DESC, created_at DESC);

-- 5) Polls
CREATE TABLE IF NOT EXISTS public.circle_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  closes_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.circle_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.circle_polls(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, voter_id)
);
CREATE INDEX IF NOT EXISTS idx_circle_polls_circle ON public.circle_polls(circle_id, created_at DESC);

-- 6) Agreement acceptances
CREATE TABLE IF NOT EXISTS public.circle_agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rules_version int NOT NULL DEFAULT 1,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

-- 7) Multi-admin approval requests
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  required_approvals int NOT NULL DEFAULT 2,
  approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_circle ON public.approval_requests(circle_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_circle_status ON public.approval_requests(circle_id, status);

-- 8) Circle roles extension (observer)
DO $$ BEGIN
  ALTER TYPE public.member_role ADD VALUE IF NOT EXISTS 'observer';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RLS
ALTER TABLE public.circle_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_member_read" ON public.circle_announcements;
CREATE POLICY "announcements_member_read" ON public.circle_announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = circle_announcements.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "announcements_owner_write" ON public.circle_announcements;
CREATE POLICY "announcements_owner_write" ON public.circle_announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = circle_announcements.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'treasurer')
    )
  );

DROP POLICY IF EXISTS "announcements_owner_update" ON public.circle_announcements;
CREATE POLICY "announcements_owner_update" ON public.circle_announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = circle_announcements.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'treasurer')
    )
  );

DROP POLICY IF EXISTS "announcements_owner_delete" ON public.circle_announcements;
CREATE POLICY "announcements_owner_delete" ON public.circle_announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = circle_announcements.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'treasurer')
    )
  );

DROP POLICY IF EXISTS "polls_member_all" ON public.circle_polls;
CREATE POLICY "polls_member_all" ON public.circle_polls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = circle_polls.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = circle_polls.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "poll_votes_member_all" ON public.circle_poll_votes;
CREATE POLICY "poll_votes_member_all" ON public.circle_poll_votes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_polls p
      JOIN public.circle_members m ON m.circle_id = p.circle_id
      WHERE p.id = circle_poll_votes.poll_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_polls p
      JOIN public.circle_members m ON m.circle_id = p.circle_id
      WHERE p.id = circle_poll_votes.poll_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "agreement_own" ON public.circle_agreement_acceptances;
CREATE POLICY "agreement_own" ON public.circle_agreement_acceptances FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "approvals_member_read" ON public.approval_requests;
CREATE POLICY "approvals_member_read" ON public.approval_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = approval_requests.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'treasurer')
    )
  );

DROP POLICY IF EXISTS "approvals_authorized_write" ON public.approval_requests;
CREATE POLICY "approvals_authorized_write" ON public.approval_requests FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = approval_requests.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'treasurer')
    )
  );

DROP POLICY IF EXISTS "approvals_authorized_update" ON public.approval_requests;
CREATE POLICY "approvals_authorized_update" ON public.approval_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.circle_id = approval_requests.circle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'treasurer')
    )
  );

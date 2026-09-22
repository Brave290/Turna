-- Ensure profiles exist for every auth user + auto-create on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profiles.display_name),
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles from existing auth users
INSERT INTO public.profiles (id, email, display_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- RLS: profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Helper: is active member of circle
CREATE OR REPLACE FUNCTION public.is_circle_member(p_circle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members m
    WHERE m.circle_id = p_circle_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_circle_owner(p_circle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circles c
    WHERE c.id = p_circle_id
      AND c.owner_id = auth.uid()
  );
$$;

-- Circles
DROP POLICY IF EXISTS "circles_select_member" ON public.circles;
DROP POLICY IF EXISTS "circles_insert_authenticated" ON public.circles;
DROP POLICY IF EXISTS "circles_update_owner" ON public.circles;
DROP POLICY IF EXISTS "circles_delete_owner" ON public.circles;
CREATE POLICY "circles_select_member" ON public.circles
  FOR SELECT USING (owner_id = auth.uid() OR public.is_circle_member(id));
CREATE POLICY "circles_insert_authenticated" ON public.circles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());
CREATE POLICY "circles_update_owner" ON public.circles
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "circles_delete_owner" ON public.circles
  FOR DELETE USING (owner_id = auth.uid());

-- Circle members
DROP POLICY IF EXISTS "members_select_circle" ON public.circle_members;
DROP POLICY IF EXISTS "members_insert_owner_or_self" ON public.circle_members;
DROP POLICY IF EXISTS "members_update_owner_or_self" ON public.circle_members;
DROP POLICY IF EXISTS "members_delete_owner" ON public.circle_members;
CREATE POLICY "members_select_circle" ON public.circle_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_circle_member(circle_id)
    OR public.is_circle_owner(circle_id)
  );
CREATE POLICY "members_insert_owner_or_self" ON public.circle_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR public.is_circle_owner(circle_id)
  );
CREATE POLICY "members_update_owner_or_self" ON public.circle_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR public.is_circle_owner(circle_id)
  ) WITH CHECK (
    user_id = auth.uid()
    OR public.is_circle_owner(circle_id)
  );
CREATE POLICY "members_delete_owner" ON public.circle_members
  FOR DELETE USING (public.is_circle_owner(circle_id) OR user_id = auth.uid());

-- Invitations
DROP POLICY IF EXISTS "invitations_select_member" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_owner" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update_owner_or_invitee" ON public.invitations;
CREATE POLICY "invitations_select_member" ON public.invitations
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR public.is_circle_member(circle_id)
    OR public.is_circle_owner(circle_id)
    OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "invitations_insert_owner" ON public.invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid() AND public.is_circle_owner(circle_id));
CREATE POLICY "invitations_update_owner_or_invitee" ON public.invitations
  FOR UPDATE USING (
    inviter_id = auth.uid()
    OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Cycles
DROP POLICY IF EXISTS "cycles_select_member" ON public.contribution_cycles;
DROP POLICY IF EXISTS "cycles_insert_owner" ON public.contribution_cycles;
DROP POLICY IF EXISTS "cycles_update_owner" ON public.contribution_cycles;
CREATE POLICY "cycles_select_member" ON public.contribution_cycles
  FOR SELECT USING (public.is_circle_member(circle_id) OR public.is_circle_owner(circle_id));
CREATE POLICY "cycles_insert_owner" ON public.contribution_cycles
  FOR INSERT WITH CHECK (public.is_circle_owner(circle_id));
CREATE POLICY "cycles_update_owner" ON public.contribution_cycles
  FOR UPDATE USING (public.is_circle_owner(circle_id)) WITH CHECK (public.is_circle_owner(circle_id));

-- Contributions
DROP POLICY IF EXISTS "contributions_select_member" ON public.contributions;
DROP POLICY IF EXISTS "contributions_insert_self" ON public.contributions;
DROP POLICY IF EXISTS "contributions_update_self_or_owner" ON public.contributions;
CREATE POLICY "contributions_select_member" ON public.contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contribution_cycles cy
      JOIN public.circle_members m ON m.circle_id = cy.circle_id
      WHERE cy.id = cycle_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );
CREATE POLICY "contributions_insert_self" ON public.contributions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.id = member_id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY "contributions_update_self_or_owner" ON public.contributions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.circle_members m
      WHERE m.id = member_id AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.contribution_cycles cy
      JOIN public.circles c ON c.id = cy.circle_id
      WHERE cy.id = cycle_id AND c.owner_id = auth.uid()
    )
  );

-- Contribution confirmations (two-party)
DROP POLICY IF EXISTS "contrib_conf_select_member" ON public.contribution_confirmations;
DROP POLICY IF EXISTS "contrib_conf_insert_other_member" ON public.contribution_confirmations;
CREATE POLICY "contrib_conf_select_member" ON public.contribution_confirmations
  FOR SELECT USING (
    confirmer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.contributions co
      JOIN public.contribution_cycles cy ON cy.id = co.cycle_id
      JOIN public.circle_members m ON m.circle_id = cy.circle_id
      WHERE co.id = contribution_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );
CREATE POLICY "contrib_conf_insert_other_member" ON public.contribution_confirmations
  FOR INSERT WITH CHECK (
    confirmer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.contributions co
      JOIN public.contribution_cycles cy ON cy.id = co.cycle_id
      JOIN public.circle_members m ON m.circle_id = cy.circle_id
      WHERE co.id = contribution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND co.member_id <> m.id
    )
  );

-- Payouts
DROP POLICY IF EXISTS "payouts_select_member" ON public.payouts;
DROP POLICY IF EXISTS "payouts_insert_owner" ON public.payouts;
DROP POLICY IF EXISTS "payouts_update_party" ON public.payouts;
CREATE POLICY "payouts_select_member" ON public.payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contribution_cycles cy
      JOIN public.circle_members m ON m.circle_id = cy.circle_id
      WHERE cy.id = cycle_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );
CREATE POLICY "payouts_insert_owner" ON public.payouts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contribution_cycles cy
      JOIN public.circles c ON c.id = cy.circle_id
      WHERE cy.id = cycle_id AND c.owner_id = auth.uid()
    )
  );
CREATE POLICY "payouts_update_party" ON public.payouts
  FOR UPDATE USING (
    recipient_member_id IN (SELECT id FROM public.circle_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.contribution_cycles cy
      JOIN public.circles c ON c.id = cy.circle_id
      WHERE cy.id = cycle_id AND c.owner_id = auth.uid()
    )
  );

-- Payout confirmations
DROP POLICY IF EXISTS "payout_conf_select_member" ON public.payout_confirmations;
DROP POLICY IF EXISTS "payout_conf_insert_party" ON public.payout_confirmations;
CREATE POLICY "payout_conf_select_member" ON public.payout_confirmations
  FOR SELECT USING (
    confirmer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.payouts p
      JOIN public.contribution_cycles cy ON cy.id = p.cycle_id
      JOIN public.circle_members m ON m.circle_id = cy.circle_id
      WHERE p.id = payout_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );
CREATE POLICY "payout_conf_insert_party" ON public.payout_confirmations
  FOR INSERT WITH CHECK (
    confirmer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.payouts p
      JOIN public.contribution_cycles cy ON cy.id = p.cycle_id
      JOIN public.circles c ON c.id = cy.circle_id
      WHERE p.id = payout_id
        AND (p.recipient_member_id IN (
              SELECT id FROM public.circle_members WHERE user_id = auth.uid()
            ) OR c.owner_id = auth.uid())
    )
  );

-- Ledger: members can read; insert via definer services; immutable for users
DROP POLICY IF EXISTS "ledger_select_member" ON public.ledger_events;
DROP POLICY IF EXISTS "ledger_insert_owner" ON public.ledger_events;
DROP POLICY IF EXISTS "ledger_no_update" ON public.ledger_events;
DROP POLICY IF EXISTS "ledger_no_delete" ON public.ledger_events;
CREATE POLICY "ledger_select_member" ON public.ledger_events
  FOR SELECT USING (public.is_circle_member(circle_id) OR public.is_circle_owner(circle_id) OR actor_id = auth.uid());
CREATE POLICY "ledger_insert_owner" ON public.ledger_events
  FOR INSERT WITH CHECK (
    actor_id = auth.uid()
    AND (public.is_circle_member(circle_id) OR public.is_circle_owner(circle_id))
  );
CREATE POLICY "ledger_no_update" ON public.ledger_events FOR UPDATE USING (false);
CREATE POLICY "ledger_no_delete" ON public.ledger_events FOR DELETE USING (false);

-- Notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own_or_system" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_insert_own_or_system" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

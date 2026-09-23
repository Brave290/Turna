-- Fix invitation email matching (case-insensitive) so join flow works
-- when profile.email and invitee_email differ only by case.

DROP POLICY IF EXISTS "invitations_select_member" ON public.invitations;
CREATE POLICY "invitations_select_member" ON public.invitations
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR public.is_circle_member(circle_id)
    OR public.is_circle_owner(circle_id)
    OR LOWER(invitee_email) = LOWER(COALESCE(
      (SELECT email FROM public.profiles WHERE id = auth.uid()),
      ''
    ))
  );

DROP POLICY IF EXISTS "invitations_update_owner_or_invitee" ON public.invitations;
CREATE POLICY "invitations_update_owner_or_invitee" ON public.invitations
  FOR UPDATE USING (
    inviter_id = auth.uid()
    OR LOWER(invitee_email) = LOWER(COALESCE(
      (SELECT email FROM public.profiles WHERE id = auth.uid()),
      ''
    ))
  );

-- Allow circle members to insert notifications for other members
-- (bell events: joined, invited, contribution, payout, etc.)
DROP POLICY IF EXISTS "notifications_insert_own_or_system" ON public.notifications;
CREATE POLICY "notifications_insert_own_or_system" ON public.notifications
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR auth.uid() IS NULL
    OR public.is_circle_member(circle_id)
    OR public.is_circle_owner(circle_id)
  );

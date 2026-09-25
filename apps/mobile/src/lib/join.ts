import { supabase } from './supabase';

export type AcceptInviteResult = {
  success?: string;
  circleId?: string;
  error?: string;
};

/** Accept full invite URLs pasted as well as bare tokens/codes (mirrors web NoToken onSubmit). */
export function extractInviteToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return (
      url.searchParams.get('token') ||
      url.pathname.split('/').filter(Boolean).pop() ||
      trimmed
    );
  } catch {
    return trimmed;
  }
}

/**
 * Client port of web `acceptInvitation` (apps/web/src/lib/auth-actions.ts).
 * Same validation order, same error copy, same invite/membership/ledger writes.
 * Notifications are best-effort (never fail the join), as on web.
 */
export async function acceptInvitation(
  rawToken: string
): Promise<AcceptInviteResult> {
  const token = rawToken.trim();
  if (!token) return { error: 'Invalid invitation link' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;
  if (!user || !email) {
    return { error: 'Sign in with the email that received this invitation' };
  }

  const { data: invite } = await supabase
    .from('invitations')
    .select('id, circle_id, invitee_email, status, expires_at, is_open')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return { error: 'This invitation link is invalid or has expired' };
  }
  if (invite.status === 'accepted' && !invite.is_open) {
    return { error: 'This invitation has already been used' };
  }
  if (invite.status === 'cancelled' || invite.status === 'expired') {
    return { error: 'This invitation is no longer active' };
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return { error: 'This invitation has expired. Ask for a new one.' };
  }

  const { data: inviteFull } = await supabase
    .from('invitations')
    .select('is_open, max_uses, use_count, invitee_email')
    .eq('id', invite.id)
    .maybeSingle();

  const isOpen = !!inviteFull?.is_open;
  if (!isOpen && inviteFull?.invitee_email) {
    if (inviteFull.invitee_email.toLowerCase() !== email.toLowerCase()) {
      return {
        error: 'Sign in with the email that received this invitation',
      };
    }
  }
  if (
    isOpen &&
    inviteFull?.max_uses &&
    (inviteFull.use_count ?? 0) >= inviteFull.max_uses
  ) {
    return { error: 'This invite link has reached its member limit' };
  }

  const { data: existing } = await supabase
    .from('circle_members')
    .select('id, status')
    .eq('circle_id', invite.circle_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing && existing.status !== 'left') {
    if (!isOpen) {
      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id);
    }
    return {
      success: 'You are already a member of this circle',
      circleId: invite.circle_id,
    };
  }

  if (existing && existing.status === 'left') {
    const { error: rejoinErr } = await supabase
      .from('circle_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        left_at: null,
      })
      .eq('id', existing.id);
    if (rejoinErr) {
      return { error: 'Could not rejoin the circle' };
    }
  } else {
    // payout_position is NOT NULL + unique per circle — assign next free slot
    const { data: taken } = await supabase
      .from('circle_members')
      .select('payout_position')
      .eq('circle_id', invite.circle_id)
      .order('payout_position', { ascending: true });

    const used = new Set((taken ?? []).map((r) => r.payout_position as number));
    let nextPos = 1;
    while (used.has(nextPos)) nextPos += 1;

    const { error: joinErr } = await supabase.from('circle_members').insert({
      circle_id: invite.circle_id,
      user_id: user.id,
      role: 'member',
      status: 'active',
      payout_position: nextPos,
      joined_at: new Date().toISOString(),
    });
    if (joinErr) {
      const msg =
        joinErr.code === '23505'
          ? 'That payout slot is already taken. Ask the owner for a new invite.'
          : joinErr.code === '42501' || /row-level security/i.test(joinErr.message)
            ? 'You do not have permission to join yet. Sign in with the invited email and try again.'
            : 'Could not join the circle. Please try again.';
      return { error: msg };
    }
  }

  if (isOpen) {
    await supabase
      .from('invitations')
      .update({ use_count: (inviteFull?.use_count ?? 0) + 1 })
      .eq('id', invite.id);
  } else {
    await supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id);
  }

  await supabase.from('ledger_events').insert({
    circle_id: invite.circle_id,
    actor_id: user.id,
    event_type: 'MEMBER_JOINED',
    entity_type: 'member',
    entity_id: user.id,
    payload: { email },
    previous_event_id: null,
  });

  const { data: circleRow } = await supabase
    .from('circles')
    .select('name, owner_id')
    .eq('id', invite.circle_id)
    .maybeSingle();

  if (circleRow) {
    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
        circle_id: invite.circle_id,
        channel: 'in_app',
        title: 'Joined circle',
        body: `You joined "${circleRow.name}". Welcome aboard!`,
        data: { circle_id: invite.circle_id, event: 'MEMBER_JOINED' },
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      });
      if (circleRow.owner_id !== user.id) {
        const { data: memberRows } = await supabase
          .from('circle_members')
          .select('user_id')
          .eq('circle_id', invite.circle_id)
          .eq('status', 'active');
        const ids = (memberRows ?? [])
          .map((r) => r.user_id)
          .filter((id) => id && id !== user.id);
        if (ids.length > 0) {
          await supabase.from('notifications').insert(
            ids.map((userId) => ({
              user_id: userId,
              circle_id: invite.circle_id,
              channel: 'in_app',
              title: 'New member joined',
              body: `${email} joined "${circleRow.name}".`,
              data: { circle_id: invite.circle_id, event: 'MEMBER_JOINED' },
              status: 'delivered',
              delivered_at: new Date().toISOString(),
            }))
          );
        }
      }
    } catch {
      // best-effort, same as web notify()
    }
  }

  return {
    success: 'You have joined the circle',
    circleId: invite.circle_id,
  };
}

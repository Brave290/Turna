'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export type ShareInviteState = {
  error?: { form?: string[] };
  success?: string;
  token?: string;
  url?: string;
} | null;

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app').replace(
  /\/$/,
  ''
);

/** Create (or reuse) an open shareable invite for QR / copy / share. */
export async function createShareInvite(
  _prev: ShareInviteState,
  formData: FormData
): Promise<ShareInviteState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const circleId = String(formData.get('circle_id') ?? '').trim();
  if (!circleId) return { error: { form: ['Missing circle'] } };

  const { data: circle } = await supabase
    .from('circles')
    .select('id, owner_id, name, member_limit, status')
    .eq('id', circleId)
    .maybeSingle();
  if (!circle) return { error: { form: ['Circle not found'] } };
  if (circle.owner_id !== user.id) {
    return { error: { form: ['Only the circle owner can create share invites'] } };
  }

  // Reuse a live open invite if one exists
  const { data: existing } = await supabase
    .from('invitations')
    .select('token, expires_at, status, is_open, max_uses, use_count')
    .eq('circle_id', circleId)
    .eq('is_open', true)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    existing &&
    new Date(existing.expires_at) > new Date() &&
    (!existing.max_uses || (existing.use_count ?? 0) < existing.max_uses)
  ) {
    const url = `${BASE_URL}/join/${existing.token}`;
    return { success: 'Share link ready', token: existing.token, url };
  }

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('invitations').insert({
    circle_id: circleId,
    inviter_id: user.id,
    invitee_email: null,
    token,
    status: 'pending',
    expires_at: expires,
    is_open: true,
    label: circle.name,
    max_uses: circle.member_limit,
    use_count: 0,
  });
  if (error) return { error: { form: [error.message] } };

  try {
    const admin = createAdminSupabaseClient();
    const { data: last } = await admin
      .from('ledger_events')
      .select('id')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    await admin.from('ledger_events').insert({
      circle_id: circleId,
      actor_id: user.id,
      event_type: 'MEMBER_INVITED',
      entity_type: 'invitation',
      entity_id: circleId,
      payload: { mode: 'share_link', token },
      previous_event_id: last?.id ?? null,
    });
  } catch {
    // best-effort audit
  }

  revalidatePath('/');
  const url = `${BASE_URL}/join/${token}`;
  return { success: 'Share link created', token, url };
}

/** Look up open invite preview for public join landing (no session required). */
export async function getInvitePreview(
  token: string
): Promise<{
  ok: boolean;
  error?: string;
  circle?: {
    id: string;
    name: string;
    description: string | null;
    contribution_amount: number;
    currency: string;
    frequency: string;
    member_limit: number;
    status: string;
    member_count: number;
    payment_method?: string | null;
    rules?: Record<string, unknown> | null;
  };
  invite?: { is_open: boolean; invitee_email: string | null; expires_at: string };
}> {
  if (!token || token.length < 6) return { ok: false, error: 'Invalid invite link' };
  try {
    const admin = createAdminSupabaseClient();
    const { data: invite } = await admin
      .from('invitations')
      .select(
        'id, circle_id, invitee_email, status, expires_at, is_open, max_uses, use_count'
      )
      .eq('token', token)
      .maybeSingle();
    if (!invite) return { ok: false, error: 'This invitation link is invalid or has expired' };
    if (invite.status === 'cancelled' || invite.status === 'expired') {
      return { ok: false, error: 'This invitation is no longer active' };
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { ok: false, error: 'This invitation has expired. Ask for a new one.' };
    }
    if (
      invite.is_open &&
      invite.max_uses &&
      (invite.use_count ?? 0) >= invite.max_uses
    ) {
      return { ok: false, error: 'This invite link has reached its member limit' };
    }

    const { data: circle } = await admin
      .from('circles')
      .select(
        'id, name, description, contribution_amount, currency, frequency, member_limit, status, preferred_payment_method, rules'
      )
      .eq('id', invite.circle_id)
      .maybeSingle();
    if (!circle) return { ok: false, error: 'Circle not found' };

    const { count } = await admin
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circle.id)
      .eq('status', 'active');

    return {
      ok: true,
      circle: {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        contribution_amount: circle.contribution_amount,
        currency: circle.currency,
        frequency: circle.frequency,
        member_limit: circle.member_limit,
        status: circle.status,
        member_count: count ?? 0,
        payment_method: circle.preferred_payment_method,
        rules: circle.rules,
      },
      invite: {
        is_open: !!invite.is_open,
        invitee_email: invite.invitee_email,
        expires_at: invite.expires_at,
      },
    };
  } catch (e) {
    console.error('[getInvitePreview]', e);
    return { ok: false, error: 'Could not load invitation' };
  }
}

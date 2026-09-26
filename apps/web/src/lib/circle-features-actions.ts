'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export type FeatureActionState = {
  error?: { form?: string[] };
  success?: string;
  announcement?: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    created_at: string;
    author_name?: string | null;
  } | null;
  poll?: {
    id: string;
    question: string;
    options: string[];
    status: string;
    created_at: string;
    total_votes: number;
    my_vote: number | null;
    counts: number[];
  } | null;
} | null;

async function requireUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  return { supabase, user };
}

async function assertCircleRole(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  circleId: string,
  userId: string,
  roles: string[]
) {
  const { data } = await supabase
    .from('circle_members')
    .select('id, role')
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (!data || !roles.includes(data.role)) return null;
  return data;
}

export async function postAnnouncement(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const circleId = String(formData.get('circle_id') ?? '');
  const title = String(formData.get('title') ?? '').trim().slice(0, 120);
  const body = String(formData.get('body') ?? '').trim().slice(0, 800);
  const pinned = String(formData.get('pinned') ?? '') === '1';
  if (!circleId || !title || !body) {
    return { error: { form: ['Title and message required'] } };
  }
  const member = await assertCircleRole(supabase, circleId, user.id, [
    'owner',
    'treasurer',
  ]);
  if (!member) return { error: { form: ['Only owner or treasurer can post'] } };

  const { data, error } = await supabase
    .from('circle_announcements')
    .insert({ circle_id: circleId, author_id: user.id, title, body, pinned })
    .select('id, title, body, pinned, created_at')
    .single();
  if (error) return { error: { form: [error.message] } };

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    revalidatePath('/');
    return {
      success: 'Announcement posted',
      announcement: {
        ...data,
        author_name: profile?.display_name ?? null,
      },
    };
  } catch {
    return { success: 'Announcement posted', announcement: data };
  }
}

export async function togglePinAnnouncement(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const id = String(formData.get('id') ?? '');
  const circleId = String(formData.get('circle_id') ?? '');
  const pinned = String(formData.get('pinned') ?? '') === '1';
  const member = await assertCircleRole(supabase, circleId, user.id, [
    'owner',
    'treasurer',
  ]);
  if (!member) return { error: { form: ['Not authorized'] } };
  const { error } = await supabase
    .from('circle_announcements')
    .update({ pinned })
    .eq('id', id);
  if (error) return { error: { form: [error.message] } };
  return { success: pinned ? 'Pinned' : 'Unpinned' };
}

export async function deleteAnnouncement(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const id = String(formData.get('id') ?? '');
  const circleId = String(formData.get('circle_id') ?? '');
  const member = await assertCircleRole(supabase, circleId, user.id, [
    'owner',
    'treasurer',
  ]);
  if (!member) return { error: { form: ['Not authorized'] } };
  const { error } = await supabase.from('circle_announcements').delete().eq('id', id);
  if (error) return { error: { form: [error.message] } };
  return { success: 'Deleted' };
}

export async function createPoll(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const circleId = String(formData.get('circle_id') ?? '');
  const question = String(formData.get('question') ?? '').trim().slice(0, 200);
  let options: string[] = [];
  try {
    const raw = JSON.parse(String(formData.get('options') ?? '[]'));
    if (Array.isArray(raw)) options = raw.map(String).map((s) => s.slice(0, 80)).slice(0, 6);
  } catch {
    return { error: { form: ['Invalid options'] } };
  }
  if (!circleId || !question || options.length < 2) {
    return { error: { form: ['Question and at least two options required'] } };
  }
  const member = await assertCircleRole(supabase, circleId, user.id, [
    'owner',
    'treasurer',
    'member',
  ]);
  if (!member) return { error: { form: ['Not a member'] } };

  const { data, error } = await supabase
    .from('circle_polls')
    .insert({
      circle_id: circleId,
      creator_id: user.id,
      question,
      options: options as never,
      status: 'open',
    })
    .select('id, question, options, status, created_at')
    .single();
  if (error) return { error: { form: [error.message] } };

  revalidatePath('/');
  return {
    success: 'Poll created',
    poll: {
      ...data,
      options,
      total_votes: 0,
      my_vote: null,
      counts: options.map(() => 0),
    },
  };
}

export async function votePoll(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const pollId = String(formData.get('poll_id') ?? '');
  const optionIndex = Number(formData.get('option_index') ?? -1);
  if (!pollId || optionIndex < 0) return { error: { form: ['Invalid vote'] } };

  const { data: poll } = await supabase
    .from('circle_polls')
    .select('id, circle_id, status, options')
    .eq('id', pollId)
    .maybeSingle();
  if (!poll) return { error: { form: ['Poll not found'] } };
  if (poll.status !== 'open') return { error: { form: ['Poll is closed'] } };

  const member = await assertCircleRole(supabase, poll.circle_id, user.id, [
    'owner',
    'treasurer',
    'member',
  ]);
  if (!member) return { error: { form: ['Not a member'] } };

  const { error } = await supabase.from('circle_poll_votes').upsert(
    {
      poll_id: pollId,
      voter_id: user.id,
      option_index: optionIndex,
    },
    { onConflict: 'poll_id,voter_id' }
  );
  if (error) return { error: { form: [error.message] } };
  return { success: 'Vote recorded' };
}

export async function saveCircleRules(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const circleId = String(formData.get('circle_id') ?? '');
  const latePolicy = String(formData.get('late_policy') ?? 'admin_review').slice(0, 40);
  const preferredPaymentMethod = String(
    formData.get('preferred_payment_method') ?? 'bank_transfer'
  ).slice(0, 40);
  const requireAgreement = String(formData.get('require_agreement') ?? '') === '1';

  const member = await assertCircleRole(supabase, circleId, user.id, ['owner']);
  if (!member) return { error: { form: ['Only the owner can change rules'] } };

  const rules = {
    late_policy: latePolicy,
    preferred_payment_method: preferredPaymentMethod,
    require_agreement: requireAgreement,
    changes_require: 'admin + treasurer approval',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('circles')
    .update({
      late_policy: latePolicy,
      preferred_payment_method: preferredPaymentMethod,
      rules: rules as never,
    })
    .eq('id', circleId);

  if (!error) {
    const { data: cur } = await supabase
      .from('circles')
      .select('rules_version')
      .eq('id', circleId)
      .maybeSingle();
    await supabase
      .from('circles')
      .update({ rules_version: (cur?.rules_version ?? 1) + 1 })
      .eq('id', circleId);
  }

  if (error) return { error: { form: [error.message] } };
  revalidatePath('/');
  return { success: 'Circle rules saved' };
}

export async function acceptCircleAgreement(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const circleId = String(formData.get('circle_id') ?? '');
  const rulesVersion = Number(formData.get('rules_version') ?? 1);
  if (!circleId) return { error: { form: ['Missing circle'] } };

  const { error } = await supabase.from('circle_agreement_acceptances').upsert(
    {
      circle_id: circleId,
      user_id: user.id,
      rules_version: rulesVersion,
      accepted_at: new Date().toISOString(),
    },
    { onConflict: 'circle_id,user_id' }
  );
  if (error) return { error: { form: [error.message] } };
  return { success: 'Agreement confirmed' };
}

export async function setMemberRole(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const circleId = String(formData.get('circle_id') ?? '');
  const memberId = String(formData.get('member_id') ?? '');
  const role = String(formData.get('role') ?? 'member');
  if (!['owner', 'treasurer', 'member', 'observer'].includes(role)) {
    return { error: { form: ['Invalid role'] } };
  }
  const me = await assertCircleRole(supabase, circleId, user.id, ['owner']);
  if (!me) return { error: { form: ['Only the owner can change roles'] } };
  if (role === 'owner') {
    return { error: { form: ['Ownership transfer is not enabled yet'] } };
  }

  const { error } = await supabase
    .from('circle_members')
    .update({ role })
    .eq('id', memberId)
    .eq('circle_id', circleId);
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
      event_type: 'MEMBER_ROLE_CHANGED',
      entity_type: 'member',
      entity_id: memberId,
      payload: { role },
      previous_event_id: last?.id ?? null,
    });
  } catch {
    // best-effort
  }

  revalidatePath('/');
  return { success: `Role updated to ${role}` };
}

export async function requestApproval(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const circleId = String(formData.get('circle_id') ?? '');
  const action = String(formData.get('action') ?? '').slice(0, 80);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(String(formData.get('payload') ?? '{}'));
  } catch {
    payload = {};
  }
  const member = await assertCircleRole(supabase, circleId, user.id, [
    'owner',
    'treasurer',
  ]);
  if (!member) return { error: { form: ['Not authorized'] } };

  const { error } = await supabase.from('approval_requests').insert({
    circle_id: circleId,
    requester_id: user.id,
    action,
    payload: payload as never,
    status: 'pending',
    required_approvals: 2,
    approvals: [{ user_id: user.id, at: new Date().toISOString() }] as never,
  });
  if (error) return { error: { form: [error.message] } };
  return { success: 'Approval requested — needs a second authorized person' };
}

export async function approveRequest(
  _prev: FeatureActionState,
  formData: FormData
): Promise<FeatureActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: { form: ['Sign in required'] } };
  const requestId = String(formData.get('request_id') ?? '');
  const { data: req } = await supabase
    .from('approval_requests')
    .select('id, circle_id, requester_id, status, approvals, required_approvals, action')
    .eq('id', requestId)
    .maybeSingle();
  if (!req) return { error: { form: ['Request not found'] } };
  if (req.status !== 'pending') return { error: { form: ['Already resolved'] } };

  const member = await assertCircleRole(supabase, req.circle_id, user.id, [
    'owner',
    'treasurer',
  ]);
  if (!member) return { error: { form: ['Not authorized'] } };
  if (req.requester_id === user.id) {
    return { error: { form: ['Requester cannot approve their own request'] } };
  }

  const approvals = Array.isArray(req.approvals) ? [...req.approvals] : [];
  approvals.push({ user_id: user.id, at: new Date().toISOString() } as never);
  const done = approvals.length >= (req.required_approvals ?? 2);

  const { error } = await supabase
    .from('approval_requests')
    .update({
      approvals: approvals as never,
      status: done ? 'approved' : 'pending',
      resolved_at: done ? new Date().toISOString() : null,
    })
    .eq('id', requestId);
  if (error) return { error: { form: [error.message] } };
  return {
    success: done ? 'Action approved (2 of 2)' : 'Your approval recorded — needs one more',
  };
}

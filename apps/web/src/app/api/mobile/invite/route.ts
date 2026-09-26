import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import { sendEmail, emailTemplates } from '@/lib/email';
import { inviteMemberSchema } from '@turna/validation';

export const dynamic = 'force-dynamic';

/**
 * Mobile circle invite — same path as the `inviteMember` server action
 * (cookie session), but authenticated with `Authorization: Bearer <token>`.
 *
 * POST { circle_id, invitee_email, payout_position?, token? }
 *   → creates the pending invitation, ledger event, in-app bell, and email.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = inviteMemberSchema.safeParse({
      circle_id: String(body.circle_id ?? ''),
      invitee_email: String(body.invitee_email ?? '').trim().toLowerCase(),
      payout_position: Number(body.payout_position ?? 1),
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json(
        { error: first ?? 'Enter a valid email address' },
        { status: 400 }
      );
    }

    const { data: circle } = await supabase
      .from('circles')
      .select('id, owner_id, member_limit, name')
      .eq('id', parsed.data.circle_id)
      .maybeSingle();
    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }
    if (circle.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the circle owner can invite members' },
        { status: 403 }
      );
    }
    if (parsed.data.invitee_email === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'You cannot invite yourself to your own circle' },
        { status: 400 }
      );
    }

    const { count } = await supabase
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circle.id);
    if ((count ?? 0) >= circle.member_limit) {
      return NextResponse.json(
        { error: 'Member limit reached' },
        { status: 400 }
      );
    }

    // Fraud limit: max 20 invites / hour / user (best-effort, as on web)
    try {
      const { checkAbuseLimit } = await import('@/lib/circle-actions');
      const allowed = await checkAbuseLimit(user.id, 'invite', 20);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many invites this hour. Try again shortly.' },
          { status: 429 }
        );
      }
    } catch {
      // fail open
    }

    const requested = String(body.token ?? '');
    const token =
      /^[a-zA-Z0-9-]{16,64}$/.test(requested) ? requested : crypto.randomUUID();
    const expires = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabase.from('invitations').insert({
      circle_id: circle.id,
      inviter_id: user.id,
      invitee_email: parsed.data.invitee_email,
      token,
      status: 'pending',
      expires_at: expires,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Append-only ledger entry (RLS: actor must be owner/member)
    await supabase.from('ledger_events').insert({
      circle_id: circle.id,
      actor_id: user.id,
      event_type: 'MEMBER_INVITED',
      entity_type: 'invitation',
      entity_id: circle.id,
      payload: { invitee_email: parsed.data.invitee_email },
      previous_event_id: null,
    });

    // In-app bell for the inviter (best-effort)
    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
        circle_id: circle.id,
        channel: 'in_app',
        title: 'Invitation sent',
        body: `Invite sent to ${parsed.data.invitee_email} for "${circle.name}".`,
        data: { circle_id: circle.id, event: 'MEMBER_INVITED' } as never,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[mobile invite] notify failed:', e);
    }

    // Invitation email via Gmail SMTP (best-effort, never fails the invite)
    try {
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();
      const inviterName = inviterProfile?.display_name || user.email || 'A member';
      const circleName = circle.name || 'your circle';
      const tmpl = emailTemplates.circleInvitation(
        parsed.data.invitee_email,
        circleName,
        inviterName,
        token
      );
      await sendEmail({
        to: parsed.data.invitee_email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
    } catch (e) {
      console.error('[mobile invite] email send failed:', e);
    }

    return NextResponse.json({
      success: `Invite created for ${parsed.data.invitee_email}`,
      token,
      expires_at: expires,
    });
  } catch (e) {
    console.error('[mobile invite]', e);
    return NextResponse.json(
      { error: 'Request failed. Try again.' },
      { status: 400 }
    );
  }
}

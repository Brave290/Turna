import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * Mobile account deletion — mirrors web `deleteAccount` server action,
 * authenticated with `Authorization: Bearer <token>`.
 *
 * POST { confirm_email } → anonymize profile + delete auth user.
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
    const confirmEmail = String(body.confirm_email ?? '')
      .trim()
      .toLowerCase();
    if (confirmEmail !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Type your account email exactly to confirm' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();

    // circles.owner_id is ON DELETE RESTRICT — must not own any circle
    const { data: owned } = await admin
      .from('circles')
      .select('id')
      .eq('owner_id', user.id);

    if (owned && owned.length > 0) {
      return NextResponse.json(
        {
          error:
            'You own circles. Transfer ownership or delete them before deleting your account.',
        },
        { status: 409 }
      );
    }

    // Leave any circles the user is a member of (RLS + audit trail intact)
    const { data: memberships } = await admin
      .from('circle_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (memberships && memberships.length > 0) {
      await admin
        .from('circle_members')
        .update({ status: 'left', left_at: new Date().toISOString() })
        .in(
          'id',
          memberships.map((m) => m.id)
        );
    }

    // Cleanup with service role (no user DELETE policies on these tables)
    await admin.from('notifications').delete().eq('user_id', user.id);
    await admin.from('invitations').delete().eq('inviter_id', user.id);

    // ledger_events.actor_id is ON DELETE RESTRICT — anonymize profile
    const { error: anonErr } = await admin
      .from('profiles')
      .update({
        email: `deleted+${user.id}@deleted.turna.invalid`,
        display_name: 'Deleted user',
        avatar_url: null,
      })
      .eq('id', user.id);

    if (anonErr) {
      console.error('[mobile delete] anonymize failed:', anonErr.message);
      return NextResponse.json(
        { error: 'Could not delete account. Contact support.' },
        { status: 500 }
      );
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error('[mobile delete] admin delete failed:', error.message);
      return NextResponse.json(
        { error: 'Could not delete account. Contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[mobile delete]', e);
    return NextResponse.json(
      { error: 'Could not delete account. Contact support.' },
      { status: 400 }
    );
  }
}

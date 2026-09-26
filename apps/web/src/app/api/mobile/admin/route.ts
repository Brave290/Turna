import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClientFromRequest } from '@/lib/supabase-request';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { emailTemplates, sendEmail } from '@/lib/email';
import { isAdminEmail } from '@/lib/admin';

export const dynamic = 'force-dynamic';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

async function overview(admin: AdminClient) {
  const [userCount, circleCount, memberCount, usersRes] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('circles').select('id', { count: 'exact', head: true }),
    admin.from('circle_members').select('id', { count: 'exact', head: true }),
    admin
      .from('profiles')
      .select('id, email, display_name, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return {
    counts: {
      users: userCount.count ?? 0,
      circles: circleCount.count ?? 0,
      memberships: memberCount.count ?? 0,
    },
    recentUsers: (usersRes.data ?? []) as unknown as {
      id: string;
      email: string;
      display_name: string;
      avatar_url: string | null;
      created_at: string;
    }[],
  };
}

async function broadcast(admin: AdminClient, body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim().slice(0, 120);
  const message = String(body.body ?? '').trim().slice(0, 2000);
  if (!title || !message) return bad('title and body are required');

  const all: { id: string; email: string; display_name: string }[] = [];
  for (let from = 0; from < 5000; from += 500) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .order('created_at', { ascending: true })
      .range(from, from + 499);
    if (error) return bad('Could not read users');
    const rows = (data ?? []) as { id: string; email: string; display_name: string }[];
    all.push(...rows);
    if (rows.length < 500) break;
  }
  if (all.length === 0) return NextResponse.json({ count: 0, emails: 0 });

  const now = new Date().toISOString();
  const rows = all.map((u) => ({
    user_id: u.id,
    channel: 'in_app' as const,
    title,
    body: message,
    data: { sender: 'admin', sent_at: now } as never,
    status: 'delivered' as const,
    sent_at: now,
    delivered_at: now,
  }));

  let inApp = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await admin.from('notifications').insert(rows.slice(i, i + 200));
    if (error) {
      console.error('[mobile admin] broadcast insert failed:', error.message);
      break;
    }
    inApp += Math.min(200, rows.length - i);
  }

  const tpl = emailTemplates.adminBroadcast(title, message);
  let emails = 0;
  for (const u of all) {
    const res = await sendEmail({
      to: u.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
    if (res.success) emails += 1;
  }

  return NextResponse.json({ count: all.length, inApp, emails });
}

async function deleteUser(admin: AdminClient, body: Record<string, unknown>, actorId: string) {
  const userId = String(body.user_id ?? '');
  if (!userId) return bad('user_id required');
  if (userId === actorId) return bad('You cannot delete your own admin account', 409);

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return bad('User not found', 404);

  const { data: owned } = await admin.from('circles').select('id').eq('owner_id', userId);
  if (owned && owned.length > 0) {
    return NextResponse.json(
      {
        error:
          'This user owns circles. Transfer ownership or delete them before deleting the account.',
      },
      { status: 409 }
    );
  }

  const { data: memberships } = await admin
    .from('circle_members')
    .select('id')
    .eq('user_id', userId)
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

  await admin.from('notifications').delete().eq('user_id', userId);
  await admin.from('invitations').delete().eq('inviter_id', userId);

  const { error: anonErr } = await admin
    .from('profiles')
    .update({
      email: `deleted+${userId}@deleted.turna.invalid`,
      display_name: 'Deleted user',
      avatar_url: null,
    })
    .eq('id', userId);
  if (anonErr) {
    console.error('[mobile admin] anonymize failed:', anonErr.message);
    return bad('Could not delete account', 500);
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[mobile admin] admin delete failed:', error.message);
    return bad('Could not delete account', 500);
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return bad('Not signed in', 401);
    if (!isAdminEmail(user.email)) return bad('Forbidden', 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    const admin = createAdminSupabaseClient();

    switch (action) {
      case 'overview':
        return NextResponse.json(await overview(admin));
      case 'broadcast':
        return await broadcast(admin, body);
      case 'deleteUser':
        return await deleteUser(admin, body, user.id);
    }
    return bad('Unknown action');
  } catch (e) {
    console.error('[mobile admin]', e);
    return bad('Request failed. Try again.', 400);
  }
}

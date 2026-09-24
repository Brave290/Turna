import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * POST /api/circles/payout-order
 * Sensitive admin/owner action — requires authenticated session + circle owner
 * OR platform admin. Body: { circle_id, order: string[] } (member ids).
 */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return NextResponse.json(
      { error: 'Offline — payout order not changed' },
      { status: 503 }
    );
  }

  let body: { circle_id?: string; order?: string[]; confirm?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const circleId = String(body.circle_id ?? '');
  const order = Array.isArray(body.order)
    ? body.order.map(String).slice(0, 100)
    : [];
  if (!circleId || order.length === 0) {
    return NextResponse.json({ error: 'circle_id and order required' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: circle } = await admin
    .from('circles')
    .select('id, owner_id, status')
    .eq('id', circleId)
    .maybeSingle();

  if (!circle) {
    return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
  }

  const isOwner = circle.owner_id === user.id;
  const isPlatformAdmin = isAdminEmail(user.email);
  if (!isOwner && !isPlatformAdmin) {
    return NextResponse.json(
      { error: 'Only the circle owner or platform admin can change payout order' },
      { status: 403 }
    );
  }

  // Apply sequential payout positions
  for (let i = 0; i < order.length; i++) {
    const { error } = await admin
      .from('circle_members')
      .update({ payout_position: i + 1, updated_at: new Date().toISOString() })
      .eq('circle_id', circleId)
      .eq('user_id', order[i]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await admin.from('ledger_events').insert({
    circle_id: circleId,
    actor_id: user.id,
    event_type: 'PAYOUT_ORDER_CHANGED',
    payload: { order } as never,
  });

  return NextResponse.json({ ok: true, by: isPlatformAdmin ? 'admin' : 'owner' });
}

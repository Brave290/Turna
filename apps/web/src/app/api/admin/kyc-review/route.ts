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
 * POST /api/admin/kyc-review
 * Body: { id, decision: 'approved' | 'rejected', reason? }
 * Admin-only KYC approve/reject.
 */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { id?: string; decision?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  const decision = String(body.decision ?? '');
  if (!id || !['approved', 'rejected'].includes(decision)) {
    return NextResponse.json(
      { error: 'id and decision (approved|rejected) required' },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  const update: Record<string, unknown> = {
    status: decision,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    rejection_reason:
      decision === 'rejected'
        ? (body.reason?.slice(0, 300) ?? 'Rejected by admin')
        : null,
  };

  const { data, error } = await admin
    .from('kyc_records')
    .update(update)
    .eq('id', id)
    .select('id, user_id, status')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'KYC record not found' },
      { status: 404 }
    );
  }

  await admin.from('notifications').insert({
    user_id: data.user_id,
    channel: 'in_app',
    title:
      decision === 'approved' ? 'Identity verified' : 'KYC needs attention',
    body:
      decision === 'approved'
        ? 'Your identity verification was approved.'
        : `Your identity verification was rejected: ${update.rejection_reason}`,
    data: { event: 'KYC_REVIEW', status: decision } as never,
    status: 'delivered',
    delivered_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, status: decision });
}

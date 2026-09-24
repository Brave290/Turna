import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CATEGORIES = new Set([
  'Account',
  'Circle',
  'Contribution',
  'Payout',
  'Notification',
  'Security',
  'Technical issue',
  'Other',
]);

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { description?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const description = String(body.description ?? '').trim().slice(0, 2000);
  const category = String(body.category ?? 'Other');
  if (description.length < 10) {
    return NextResponse.json({ error: 'Description too short' }, { status: 400 });
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: user.id,
    channel: 'in_app',
    title: `Report: ${category}`,
    body: description,
    data: { event: 'SUPPORT_REPORT', category } as never,
    status: 'delivered',
    delivered_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also log for ops via console (no PII beyond user id)
  console.log('[support-report]', user.id, category, description.slice(0, 120));

  return NextResponse.json({ ok: true });
}

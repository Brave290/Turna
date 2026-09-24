import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendEmail, emailTemplates } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/digest
 * Vercel cron: money-event email digests (contributions + payouts last 24h)
 * grouped per user so they don't get spam for every webhook.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const admin = createAdminSupabaseClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: payments } = await admin
      .from('payments')
      .select(
        `id, reference, kind, amount, currency, status, paid_at, created_at, circle_id, user_id,
         circles(name)`
      )
      .eq('status', 'success')
      .gte('paid_at', since)
      .limit(500);

    const userIds = [
      ...new Set(
        ((payments ?? []) as { user_id?: string }[])
          .map((p) => p.user_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const profileMap = new Map<
      string,
      { email?: string; display_name?: string }
    >();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.id, {
          email: p.email ?? undefined,
          display_name: p.display_name ?? undefined,
        });
      }
    }

    const byUser = new Map<
      string,
      { email: string; name?: string; events: string[] }
    >();

    for (const p of payments ?? []) {
      const profile = profileMap.get(
        (p as { user_id?: string }).user_id ?? ''
      );
      if (!profile?.email) continue;

      const circle = Array.isArray((p as { circles?: unknown }).circles)
        ? ((p as { circles: unknown[] }).circles[0] as
            | { name?: string }
            | undefined)
        : ((p as { circles?: { name?: string } }).circles as
            | { name?: string }
            | undefined);

      const naira = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: (p as { currency?: string }).currency ?? 'NGN',
      }).format(Number((p as { amount?: number }).amount ?? 0) / 100);

      const kindLabel =
        (p as { kind?: string }).kind === 'payout'
          ? 'Payout completed'
          : 'Contribution paid';
      const line = `${kindLabel}: ${naira}${circle?.name ? ` — ${circle.name}` : ''} (${(p as { reference?: string }).reference})`;

      const key = profile.email.toLowerCase();
      const entry = byUser.get(key) ?? {
        email: profile.email,
        name: profile.display_name,
        events: [],
      };
      entry.events.push(line);
      byUser.set(key, entry);
    }

    let sent = 0;
    for (const entry of byUser.values()) {
      if (entry.events.length === 0) continue;
      const tpl = emailTemplates.moneyDigest(entry.email, entry.events, entry.name);
      const res = await sendEmail({
        to: entry.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      if (res.success) sent += 1;
    }

    return NextResponse.json({
      ok: true,
      users: byUser.size,
      sent,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[cron/digest]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Digest failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { sendDueReminders } from '@/lib/circle-actions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/reminders
 * Vercel cron: contribution due reminders (email + in-app).
 * Protected by CRON_SECRET when set (Authorization: Bearer).
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
    const result = await sendDueReminders();
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[cron/reminders]', e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Reminders failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

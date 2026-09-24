import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { authorizeCron, cronOk, cronFail } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/db-ping
 * Daily database ping (project keep-alive during pause).
 * Auth: CRON_SECRET via Bearer / x-cron-secret / ?secret=
 * Also used by cron-job.org as external backup.
 */
export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  try {
    const admin = createAdminSupabaseClient();
    const started = Date.now();

    // Touch multiple tables so Supabase doesn't idle-pause the project
    const [profiles, circles, payments] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('circles').select('id', { count: 'exact', head: true }),
      admin.from('payments').select('id', { count: 'exact', head: true }),
    ]);

    const ms = Date.now() - started;
    const dbOk =
      !profiles.error && !circles.error && !payments.error;

    return cronOk({
      db: dbOk ? 'ok' : 'degraded',
      latency_ms: ms,
      counts: {
        profiles: profiles.count ?? 0,
        circles: circles.count ?? 0,
        payments: payments.count ?? 0,
      },
      errors: [
        profiles.error?.message,
        circles.error?.message,
        payments.error?.message,
      ].filter(Boolean),
      service: 'turna',
    });
  } catch (e) {
    return cronFail(e, 'db-ping');
  }
}

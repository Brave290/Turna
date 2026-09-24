import { NextResponse } from 'next/server';

/**
 * Shared cron auth for Vercel crons + cron-job.org + admin manual runs.
 * Requires CRON_SECRET. Accepts:
 * - Authorization: Bearer <secret> (Vercel cron default)
 * - x-cron-secret: <secret> (cron-job.org custom header)
 * - ?secret=<secret> (query for simple external pingers)
 *
 * If CRON_SECRET is unset, returns null (caller may decide open access —
 * we always recommend setting it).
 */
export function authorizeCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 500 }
    );
  }

  const auth = req.headers.get('authorization');
  const headerSecret = req.headers.get('x-cron-secret');
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret');

  const provided =
    (auth?.startsWith('Bearer ') ? auth.slice(7) : null) ??
    headerSecret ??
    querySecret;

  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export function cronOk(payload: Record<string, unknown>): NextResponse {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function cronFail(e: unknown, label: string): NextResponse {
  console.error(`[cron/${label}]`, e);
  return NextResponse.json(
    {
      ok: false,
      error: e instanceof Error ? e.message : `${label} failed`,
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

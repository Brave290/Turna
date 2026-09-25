import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authorizeCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

const JOBS = {
  reminders: '/api/cron/reminders',
  digest: '/api/cron/digest',
  'db-ping': '/api/cron/db-ping',
} as const;

export type CronJobName = keyof typeof JOBS;

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * POST /api/admin/run-cron
 * Body: { job: 'reminders' | 'digest' | 'db-ping' | 'all' }
 * Admin-only manual trigger when Vercel/cron-job.org fails.
 * Runs jobs in-process (no HTTP hop) with full auth context.
 */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Require CRON_SECRET configured (same as automated crons)
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server' },
      { status: 500 }
    );
  }

  let body: { job?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const job = String(body.job ?? '');
  const names: CronJobName[] =
    job === 'all'
      ? (Object.keys(JOBS) as CronJobName[])
      : job in JOBS
        ? [job as CronJobName]
        : [];

  if (names.length === 0) {
    return NextResponse.json(
      { error: `Unknown job. Use: ${Object.keys(JOBS).join(', ')}, or all` },
      { status: 400 }
    );
  }

  const results: Record<string, unknown> = {};
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app';

  for (const name of names) {
    try {
      const res = await fetch(`${base}${JOBS[name]}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        cache: 'no-store',
      });
      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 300) };
      }
      results[name] = { status: res.status, body: json };
    } catch (e) {
      results[name] = {
        status: 0,
        error: e instanceof Error ? e.message : 'fetch failed',
      };
    }
  }

  return NextResponse.json({
    ok: true,
    triggered_by: user.email,
    results,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/admin/run-cron?secret=…&job=…
 * External fallback (cron-job.org) — requires CRON_SECRET.
 * Prefer POST from the admin UI; GET is for simple HTTP pingers.
 */
export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const job = url.searchParams.get('job') ?? 'all';
  return runJobs(job, 'external-secret');
}

async function runJobs(job: string, by: string) {
  const names: CronJobName[] =
    job === 'all'
      ? (Object.keys(JOBS) as CronJobName[])
      : job in JOBS
        ? [job as CronJobName]
        : [];
  if (names.length === 0) {
    return NextResponse.json(
      { error: `Unknown job: ${job}` },
      { status: 400 }
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app';
  const results: Record<string, unknown> = {};

  for (const name of names) {
    try {
      const res = await fetch(`${base}${JOBS[name]}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
        cache: 'no-store',
      });
      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 300) };
      }
      results[name] = { status: res.status, body: json };
    } catch (e) {
      results[name] = {
        status: 0,
        error: e instanceof Error ? e.message : 'fetch failed',
      };
    }
  }

  return NextResponse.json({
    ok: true,
    triggered_by: by,
    results,
    timestamp: new Date().toISOString(),
  });
}

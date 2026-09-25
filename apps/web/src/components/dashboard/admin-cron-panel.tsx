'use client';

import { useState } from 'react';
import {
  BellRing,
  Mail,
  Database,
  PlayCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/toast';
import { Spinner } from '@/components/spinner';

type JobId = 'reminders' | 'digest' | 'db-ping' | 'all';

const JOBS: { id: JobId; label: string; hint: string; icon: typeof BellRing }[] =
  [
    {
      id: 'reminders',
      label: 'Reminders',
      hint: 'Email + in-app contribution due notices',
      icon: BellRing,
    },
    {
      id: 'digest',
      label: 'Digest',
      hint: 'Group money-event emails (last 24h)',
      icon: Mail,
    },
    {
      id: 'db-ping',
      label: 'DB ping',
      hint: 'Touch tables — keep Supabase awake',
      icon: Database,
    },
    {
      id: 'all',
      label: 'Run all',
      hint: 'Trigger every job in sequence',
      icon: PlayCircle,
    },
  ];

/**
 * Manual cron trigger for admins when Vercel / cron-job.org fail.
 * POST /api/admin/run-cron (admin session required).
 */
export function AdminCronPanel() {
  const toast = useToast();
  const [busy, setBusy] = useState<JobId | null>(null);

  async function run(job: JobId) {
    setBusy(job);
    try {
      const res = await fetch('/api/admin/run-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        results?: Record<string, { status?: number; body?: unknown; error?: string }>;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Cron run failed');
        return;
      }
      const parts = Object.entries(data.results ?? {}).map(([k, v]) => {
        const body = v.body as { sent?: number; db?: string } | undefined;
        const detail =
          body?.sent != null
            ? `sent=${body.sent}`
            : body?.db
              ? `db=${body.db}`
              : `http=${v.status ?? 0}`;
        return `${k}: ${detail}${v.error ? ` (${v.error})` : ''}`;
      });
      toast.success(parts.join(' · ') || 'Jobs finished');
    } catch {
      toast.error('Network error running cron');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card" data-no-swipe>
      <div className="flex items-center gap-2 mb-1">
        <PlayCircle className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-forest">Manual cron</h2>
      </div>
      <p className="text-sm text-muted mb-4">
        If Vercel crons or cron-job.org fail, run jobs here. Also useful for
        an immediate DB keep-alive ping.
      </p>
      <div className="flex flex-wrap gap-2">
        {JOBS.map((job) => {
          const Icon = job.icon;
          const pending = busy === job.id;
          return (
            <button
              key={job.id}
              type="button"
              onClick={() => void run(job.id)}
              disabled={busy !== null}
              className={`btn-outline btn-sm inline-flex items-center gap-1.5${
                job.id === 'all' ? ' btn-primary' : ''
              }`}
              title={job.hint}
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              {pending ? 'Running…' : job.label}
            </button>
          );
        })}
      </div>
      {busy && (
        <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
          <Spinner className="w-3 h-3" /> Job running — results will toast when
          done.
        </p>
      )}
      <p className="text-xs text-muted mt-4">
        External backup:{' '}
        <code className="font-mono bg-border/40 px-1.5 py-0.5 rounded">
          cron-job.org
        </code>{' '}
        → GET{' '}
        <code className="font-mono bg-border/40 px-1.5 py-0.5 rounded">
          /api/cron/db-ping?secret=CRON_SECRET
        </code>{' '}
        daily.
      </p>
    </section>
  );
}

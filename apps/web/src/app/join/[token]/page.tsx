import Link from 'next/link';
import { Logo } from '@/components/logo';
import { getInvitePreview } from '@/lib/share-invite-actions';
import { formatCurrency } from '@/lib/utils';
import { Users, PiggyBank, Clock } from 'lucide-react';
import { JoinActions } from './join-actions';

export const dynamic = 'force-dynamic';

/**
 * Universal invite landing: /join/[token]
 * Scanned from QR or opened from a shared link.
 */
export default async function JoinTokenPage({
  params,
}: {
  params: { token: string };
}) {
  const preview = await getInvitePreview(params.token);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app').replace(
    /\/$/,
    ''
  );
  const joinUrl = `${appUrl}/circles/join?token=${encodeURIComponent(params.token)}`;

  if (!preview.ok || !preview.circle) {
    return (
      <Shell>
        <p className="font-display text-3xl font-bold text-forest mb-2">
          Link not available
        </p>
        <p className="text-muted text-sm mb-8">
          {preview.error ?? 'This invitation link is invalid or has expired.'}
        </p>
        <Link href="/" className="btn-primary w-full inline-flex justify-center">
          Go to Turna
        </Link>
      </Shell>
    );
  }

  const c = preview.circle;
  const open = c.status === 'active' || c.status === 'draft' || c.status === 'paused';
  const full = c.member_count >= c.member_limit;

  return (
    <Shell>
      <div className="flex justify-center mb-4">
        <Logo variant="primary" size={48} />
      </div>
      <p className="text-[11px] uppercase tracking-wider text-muted mb-2">
        You&apos;ve been invited to
      </p>
      <h1 className="font-display text-3xl font-bold text-forest mb-1">{c.name}</h1>
      {c.description && (
        <p className="text-sm text-muted mb-5 leading-relaxed">{c.description}</p>
      )}

      <div className="card text-left space-y-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted">Contribution</p>
            <p className="font-display text-xl font-bold text-forest">
              {formatCurrency(c.contribution_amount, c.currency)}
              <span className="text-sm font-normal text-muted ml-1">
                / {c.frequency}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted">Members</p>
            <p className="font-display text-xl font-bold text-forest">
              {c.member_count} / {c.member_limit}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted">Status</p>
            <p className="font-medium text-forest capitalize">{c.status}</p>
          </div>
        </div>
      </div>

      <JoinActions joinUrl={joinUrl} disabled={!open || full} full={full} />

      <p className="text-xs text-muted mt-6">
        Money moves outside Turna. We record, confirm, and keep the history
        auditable.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      <header className="px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-forest/80 hover:text-forest transition-colors"
        >
          <Logo variant="primary" size={24} />
          <span className="font-display text-lg font-bold tracking-tight">Turna</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md text-center animate-fade-in">{children}</div>
      </main>
      <footer className="px-6 py-5 text-center text-sm text-muted">
        &copy; {new Date().getFullYear()} Turna
      </footer>
    </div>
  );
}

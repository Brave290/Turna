const statusStyles: Record<string, string> = {
  draft: 'bg-muted/15 text-muted',
  active: 'badge-active',
  paused: 'badge-pending',
  completed: 'badge-completed',
  cancelled: 'badge-error',
  pending: 'badge-pending',
  collecting: 'badge-active',
  reported: 'badge-pending',
  confirmed: 'badge-active',
  rejected: 'badge-error',
  disputed: 'badge-error',
  refunded: 'badge-pending',
  initiated: 'badge-pending',
  sent: 'badge-pending',
  received: 'badge-active',
  accepted: 'badge-active',
  expired: 'badge-error',
  left: 'badge-completed',
  removed: 'badge-error',
  read: 'badge-completed',
  delivered: 'badge-active',
  failed: 'badge-error',
  payout_pending: 'badge-pending',
  payout_initiated: 'badge-pending',
  payout_confirmed: 'badge-active',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = statusStyles[status] ?? 'bg-forest/10 text-forest';
  return (
    <span className={`badge ${cls} capitalize shrink-0`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

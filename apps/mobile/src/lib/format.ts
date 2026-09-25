/**
 * Formatting helpers — must stay byte-compatible with the web app's
 * apps/web/src/lib/utils.ts (formatCurrency / formatRelativeTime).
 * Amounts are stored in kobo (integer); display divides by 100.
 */
export function formatCurrency(amount: number, currency = 'NGN'): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₦0';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n / 100);
  } catch {
    return `₦${Math.round(n / 100)}`;
  }
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

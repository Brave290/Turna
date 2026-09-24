/** Pure period helpers — safe for client and server (no next/headers). */

export function periodKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return periodKey(d);
}

export function formatPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });
}

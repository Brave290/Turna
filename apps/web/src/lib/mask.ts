/** Mask helpers shared by client + server components (no emoji). */

export function maskName(name?: string | null): string {
  if (!name) return 'Member';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part.length <= 1
        ? part.toUpperCase()
        : `${part[0].toUpperCase()}${'•'.repeat(Math.min(part.length - 1, 4))}`
    )
    .join(' ');
}

export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

export function maskNameFor(name?: string | null): string {
  return maskName(name);
}

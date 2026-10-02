/**
 * Platform-admin identity.
 *
 * There is exactly ONE admin account: support.turna@gmail.com. It is enforced
 * by force — environment allowlists (ADMIN_EMAILS / ADMIN_EMAIL) are ignored
 * on purpose, so a stale or extra address in the dashboard can never grant
 * admin access. Matches the mobile app's ADMIN_EMAIL in
 * `apps/mobile/src/lib/config.ts`.
 */
export const PRODUCT_ADMIN_EMAIL = 'support.turna@gmail.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PRODUCT_ADMIN_EMAIL.toLowerCase();
}

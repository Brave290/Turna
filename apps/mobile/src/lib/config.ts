/**
 * App-wide constants shared by routing and feature screens.
 */

/**
 * Platform admin identity: the signed-in account with this email gets the
 * in-app admin dashboard. This is the ONLY admin — the server enforces the
 * same single address (apps/web/src/lib/admin.ts) regardless of env.
 */
export const ADMIN_EMAIL = 'support.turna@gmail.com';

/** Case-insensitive match against the signed-in user's email. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

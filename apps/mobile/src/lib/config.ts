/**
 * App-wide constants shared by routing and feature screens.
 */

/**
 * Platform admin identity: the signed-in account with this email gets the
 * in-app admin dashboard (Profile row + auto-offer after login).
 * Server side still gates on the `ADMIN_EMAILS` env allowlist.
 */
export const ADMIN_EMAIL = 'support.turna@gmail.com';

/** Case-insensitive match against the signed-in user's email. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

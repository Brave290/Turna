/**
 * Platform-admin allowlist shared by every admin-gated route.
 *
 * Honours `ADMIN_EMAILS` (comma list) and `ADMIN_EMAIL`, and always includes
 * the product admin address hardcoded in the mobile app
 * (`apps/mobile/src/lib/config.ts`) so a missing/renamed env var can never
 * lock the real admin account out with a 403.
 */
export const PRODUCT_ADMIN_EMAIL = 'support.turna@gmail.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = [
    ...(process.env.ADMIN_EMAILS ?? '').split(','),
    ...(process.env.ADMIN_EMAIL ?? '').split(','),
    PRODUCT_ADMIN_EMAIL,
  ]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

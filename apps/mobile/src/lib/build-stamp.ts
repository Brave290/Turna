/**
 * Build stamp — overwritten by CI with the current short commit SHA before
 * Gradle runs. `verify-no-stale-bundle` in release.yml greps the JS bundle
 * inside the built APK for this value, so a cached/stale bundle fails the
 * release instead of shipping.
 */
export const BUILD_STAMP = 'dev-local';

import { NextResponse } from 'next/server';

/**
 * App version manifest — polled by the native app on every login/resume.
 * Bump APP_VERSION_CODE when publishing a new APK so clients see the update.
 */
export const dynamic = 'force-dynamic';

const APP_VERSION_CODE = Number(process.env.APP_VERSION_CODE || 2);
const APP_VERSION_NAME = process.env.APP_VERSION_NAME || '1.0.1';
const MIN_SUPPORTED_CODE = Number(process.env.APP_MIN_SUPPORTED_CODE || 1);

export async function GET() {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app'
  ).replace(/\/$/, '');

  return NextResponse.json({
    ok: true,
    versionCode: APP_VERSION_CODE,
    versionName: APP_VERSION_NAME,
    minSupportedCode: MIN_SUPPORTED_CODE,
    // First-party download — streams from GitHub, user only sees our domain
    downloadUrl: `${appUrl}/api/download/apk`,
    notes: 'Bug fixes and improvements',
    checkedAt: new Date().toISOString(),
  });
}

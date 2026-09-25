import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * App version manifest — polled by the native app on every login/resume.
 * Serves the CI-generated version.json from the latest public release so the
 * version changes automatically with every build (env values are fallback).
 */
const DOWNLOADS_REPO =
  process.env.DOWNLOADS_REPO || 'Brave290/Turna-Downloads';

type Manifest = {
  versionCode?: number;
  versionName?: string;
  minSupportedCode?: number;
  apk?: string;
  notes?: string;
  builtAt?: string;
};

let cached: { at: number; m: Manifest } | null = null;
const CACHE_MS = 5 * 60_000;

function ghHeaders(): HeadersInit {
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.DOWNLOADS_APK_TOKEN;
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'TurnaAppVersion/1.0',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function latestManifest(): Promise<Manifest | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.m;
  try {
    const rel = await fetch(
      `https://api.github.com/repos/${DOWNLOADS_REPO}/releases/latest`,
      {
        headers: ghHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!rel.ok) return null;
    const data = (await rel.json()) as {
      assets?: { name: string; browser_download_url: string }[];
    };
    const asset = data.assets?.find((a) => a.name === 'version.json');
    if (!asset) return null;
    const res = await fetch(asset.browser_download_url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'TurnaAppVersion/1.0' },
    });
    if (!res.ok) return null;
    const m = (await res.json()) as Manifest;
    if (typeof m.versionCode !== 'number') return null;
    cached = { at: Date.now(), m };
    return m;
  } catch {
    return null;
  }
}

export async function GET() {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app'
  ).replace(/\/$/, '');

  const m = await latestManifest();

  return NextResponse.json(
    {
      ok: true,
      versionCode: m?.versionCode ?? Number(process.env.APP_VERSION_CODE || 2),
      versionName:
        (m?.versionName ?? process.env.APP_VERSION_NAME) || '1.0.1',
      minSupportedCode:
        m?.minSupportedCode ??
        Number(process.env.APP_MIN_SUPPORTED_CODE || 1),
      apkName: m?.apk,
      // First-party download — resolves the latest versioned APK asset
      downloadUrl: `${appUrl}/api/download/apk`,
      notes: m?.notes ?? 'Bug fixes and improvements',
      builtAt: m?.builtAt,
      checkedAt: new Date().toISOString(),
    },
    {
      headers: { 'Cache-Control': 'public, max-age=60' },
    }
  );
}

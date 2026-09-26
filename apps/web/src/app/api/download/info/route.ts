import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * JSON resolver for the animated in-page APK download.
 *
 * Returns the public API asset URL (CORS-enabled, streams with byte-level
 * progress) plus the plain browser download URL as fallback. The public
 * downloads repo needs no token.
 */
const DOWNLOADS_REPO =
  process.env.DOWNLOADS_REPO || 'Brave290/Turna-Downloads';

type GhAsset = {
  id: number;
  name: string;
  browser_download_url: string;
  url: string;
  size?: number;
};

let cached: { at: number; payload: unknown } | null = null;
const CACHE_MS = 5 * 60_000;

function pickApk(assets: GhAsset[]): GhAsset | null {
  if (!assets.length) return null;
  return (
    assets.find((a) => a.name === 'turna.apk') ??
    assets.find((a) => a.name.endsWith('-turna.apk')) ??
    assets.find((a) => a.name.endsWith('.apk') && !a.name.includes('debug')) ??
    null
  );
}

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.payload, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${DOWNLOADS_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'TurnaAppDownloader/1.0',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const data = (await res.json()) as { assets?: GhAsset[] };
    const asset = pickApk(data.assets ?? []);
    if (!asset) throw new Error('No APK asset');

    const payload = {
      assetApiUrl: asset.url,
      browserDownloadUrl: asset.browser_download_url,
      name: asset.name,
      size: asset.size ?? 0,
    };
    cached = { at: Date.now(), payload };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not resolve the download right now.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

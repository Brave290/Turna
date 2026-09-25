import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * First-party APK download.
 *
 * Resolves the latest `{version}-turna.apk` asset on the public Turna-Downloads
 * repo via the GitHub API and 302-redirects to GitHub's browser download URL
 * (GitHub then redirects to its CDN; APKs are ~50MB — never stream via Vercel).
 * Falls back to the legacy static URL, then to the private repo's latest release.
 *
 * GITHUB_TOKEN is only needed for the private-repo fallback.
 */
const DOWNLOADS_REPO =
  process.env.DOWNLOADS_REPO || 'Brave290/Turna-Downloads';
const PRIVATE_FALLBACK_REPO =
  process.env.PRIVATE_FALLBACK_REPO || 'Brave290/Turna';

type GhAsset = {
  id: number;
  name: string;
  browser_download_url: string;
  url: string; // API asset URL
  content_type?: string;
  size?: number;
};

let cached: { at: number; assets: GhAsset[] } | null = null;
const CACHE_MS = 5 * 60_000;

function ghHeaders(): HeadersInit {
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.DOWNLOADS_APK_TOKEN;
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'TurnaAppDownloader/1.0',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function pickApk(assets: GhAsset[]): GhAsset | null {
  if (!assets.length) return null;
  return (
    // Fixed short name first: turna.apk
    assets.find((a) => a.name === 'turna.apk') ??
    // Legacy versioned names: 1.0.260925.1430-turna.apk
    assets.find((a) => a.name.endsWith('-turna.apk')) ??
    assets.find(
      (a) => a.name.endsWith('.apk') && !a.name.includes('debug')
    ) ??
    null
  );
}

async function latestAssets(repo: string): Promise<GhAsset[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.assets;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/releases/latest`,
    {
      headers: ghHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { assets?: GhAsset[] };
  const assets = data.assets ?? [];
  cached = { at: Date.now(), assets };
  return assets;
}

function redirect(url: string, seconds = 600) {
  return NextResponse.redirect(url, {
    status: 302,
    headers: { 'Cache-Control': `public, max-age=${seconds}` },
  });
}

function unauthorized(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 502, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET() {
  // 0. Manual override
  const override = process.env.DOWNLOADS_APK_URL;
  if (override) return redirect(override, 60);

  // 1. Public downloads repo — auto-resolve the versioned asset name
  try {
    const asset = pickApk(await latestAssets(DOWNLOADS_REPO));
    if (asset) return redirect(asset.browser_download_url);
  } catch {
    /* fall through */
  }

  // 2. Legacy static URL (pre-versioning releases)
  try {
    const legacy = `https://github.com/${DOWNLOADS_REPO}/releases/latest/download/turna.apk`;
    const probe = await fetch(legacy, {
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'TurnaAppDownloader/1.0' },
    });
    await probe.body?.cancel().catch(() => {});
    if (probe.status >= 300 && probe.status < 400) return redirect(legacy, 60);
  } catch {
    /* fall through */
  }

  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.DOWNLOADS_APK_TOKEN;

  if (!token) {
    return unauthorized(
      'APK download not available: downloads repo unreachable and GITHUB_TOKEN not set.'
    );
  }

  // 3. Private repo fallback: latest release → pre-signed CDN redirect
  let asset: GhAsset | null = null;
  try {
    asset = pickApk(await latestAssets(PRIVATE_FALLBACK_REPO));
  } catch {
    /* handled below */
  }

  if (!asset) {
    return unauthorized('No APK asset found on the private repo releases.');
  }

  try {
    const assetRes = await fetch(asset.url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/octet-stream',
        'User-Agent': 'TurnaAppDownloader/1.0',
      },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const location =
      assetRes.headers.get('location') ??
      (assetRes.status >= 300 && assetRes.status < 400
        ? assetRes.headers.get('Location')
        : null);

    if (location) {
      return NextResponse.redirect(location, {
        status: 302,
        headers: {
          'Cache-Control': 'private, max-age=60',
          'Content-Disposition': `attachment; filename="${asset.name}"`,
        },
      });
    }

    // Some setups return 200 with body directly — stream it through.
    if (assetRes.ok && assetRes.body) {
      const headers = new Headers();
      headers.set(
        'Content-Type',
        'application/vnd.android.package-archive'
      );
      headers.set(
        'Content-Disposition',
        `attachment; filename="${asset.name}"`
      );
      headers.set('Cache-Control', 'public, max-age=300');
      const len = assetRes.headers.get('content-length');
      if (len) headers.set('Content-Length', len);
      return new Response(assetRes.body, { status: 200, headers });
    }

    return unauthorized(
      `GitHub asset fetch failed: ${assetRes.status} ${assetRes.statusText}`
    );
  } catch (e) {
    return unauthorized(e instanceof Error ? e.message : 'fetch failed');
  }
}

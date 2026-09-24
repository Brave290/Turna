import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * First-party APK download — resolves the latest android-latest release APK
 * from the (private) GitHub repo and 302-redirects to GitHub's pre-signed CDN URL.
 *
 * Why redirect: APKs are ~100MB+; streaming through Vercel serverless hits
 * response size limits. The CDN URL is short-lived and already authenticated.
 *
 * Requires env GITHUB_TOKEN (fine-grained PAT: contents:read on Brave290/Turna).
 */
const GITHUB_API =
  'https://api.github.com/repos/Brave290/Turna/releases/tags/android-latest';

type GhAsset = {
  id: number;
  name: string;
  browser_download_url: string;
  url: string; // API asset URL
  content_type?: string;
  size?: number;
};

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
    assets.find((a) => a.name === 'turna-latest.apk') ??
    assets.find((a) => a.name === 'turna.apk') ??
    assets.find((a) => a.name.endsWith('.apk')) ??
    null
  );
}

function unauthorized(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 502, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET() {
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.DOWNLOADS_APK_TOKEN;

  if (!token) {
    return unauthorized(
      'APK download not configured: set GITHUB_TOKEN (contents:read on Brave290/Turna).'
    );
  }

  // 1. Resolve latest rolling release assets
  let asset: GhAsset | null = null;
  try {
    const rel = await fetch(GITHUB_API, {
      headers: ghHeaders(),
      cache: 'no-store',
    });
    if (rel.ok) {
      const data = (await rel.json()) as { assets?: GhAsset[] };
      asset = pickApk(data.assets ?? []);
    }
  } catch {
    /* fall through to override */
  }

  // 2. Optional direct override (e.g. public Turna-Downloads URL)
  const override = process.env.DOWNLOADS_APK_URL;
  if (!asset && override) {
    return NextResponse.redirect(override, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  }

  if (!asset) {
    return unauthorized('No APK asset found on android-latest release.');
  }

  // 3. Ask GitHub for a pre-signed CDN redirect (Accept: octet-stream)
  try {
    const assetRes = await fetch(asset.url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/octet-stream',
        'User-Agent': 'TurnaAppDownloader/1.0',
      },
      redirect: 'manual',
      cache: 'no-store',
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

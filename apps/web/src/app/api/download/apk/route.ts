import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * First-party APK download.
 *
 * Preferred: 302 to the public Turna-Downloads release URL (unauthenticated,
 * stable, works in the app and any browser).
 *
 * Fallback: if the public repo has no release yet, resolve the private repo's
 * android-latest release via the GitHub API and 302-redirect to GitHub's
 * pre-signed CDN URL (APKs are ~50MB+; never stream through Vercel).
 *
 * Requires env GITHUB_TOKEN only for the fallback path.
 */
const PUBLIC_APK_URL =
  process.env.DOWNLOADS_APK_URL ||
  'https://github.com/Brave290/Turna-Downloads/releases/latest/download/turna.apk';

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
  // 1. Preferred: public downloads repo — no auth, stable URL.
  try {
    const probe = await fetch(PUBLIC_APK_URL, {
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'User-Agent': 'TurnaAppDownloader/1.0' },
    });
    await probe.body?.cancel().catch(() => {});
    if (probe.status >= 300 && probe.status < 400) {
      return NextResponse.redirect(PUBLIC_APK_URL, {
        status: 302,
        headers: { 'Cache-Control': 'public, max-age=60' },
      });
    }
  } catch {
    /* fall through to private-repo fallback */
  }

  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.DOWNLOADS_APK_TOKEN;

  if (!token) {
    return unauthorized(
      'APK download not available: public downloads repo unreachable and GITHUB_TOKEN not set.'
    );
  }

  // 2. Fallback: resolve android-latest rolling release assets
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
    /* handled below */
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

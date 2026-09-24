export const dynamic = 'force-dynamic';

/**
 * Silent first-party APK download.
 * Streams the asset from GitHub so users only ever see turnaapp.vercel.app.
 *
 * Sources (in order):
 * 1. DOWNLOADS_APK_URL — stable Turna-Downloads latest asset
 * 2. Fallback — private repo android-latest rolling release
 */
export async function GET() {
  const candidates = [
    process.env.DOWNLOADS_APK_URL ||
      'https://github.com/Brave290/Turna-Downloads/releases/latest/download/turna.apk',
    process.env.ROLLING_APK_URL ||
      'https://github.com/Brave290/Turna/releases/download/android-latest/turna-debug.apk',
  ];

  let lastErr = 'No APK source configured';
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'TurnaAppDownloader/1.0' },
      });
      if (!res.ok || !res.body) {
        lastErr = `Upstream ${res.status}`;
        continue;
      }
      const headers = new Headers();
      headers.set('Content-Type', 'application/vnd.android.package-archive');
      headers.set(
        'Content-Disposition',
        'attachment; filename="turna.apk"'
      );
      headers.set('Cache-Control', 'public, max-age=300');
      const len = res.headers.get('content-length');
      if (len) headers.set('Content-Length', len);
      const etag = res.headers.get('etag');
      if (etag) headers.set('ETag', etag);

      return new Response(res.body, {
        status: 200,
        headers,
      });
    } catch (e) {
      lastErr = e instanceof Error ? e.message : 'fetch failed';
    }
  }

  return new Response(JSON.stringify({ error: `APK unavailable: ${lastErr}` }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' },
  });
}

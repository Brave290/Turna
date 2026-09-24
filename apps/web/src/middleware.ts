import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/auth',
  '/auth/login',
  '/auth/signup',
  '/auth/verify',
  '/auth/welcome',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/update-password',
  '/auth/callback',
  '/auth/onboarding',
  '/terms',
  '/privacy',
  '/legal',
  '/legal/cookies',
  '/legal/acceptable-use',
  '/legal/refund',
  '/legal/contact',
  '/circles',
  '/circles/join',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/api/')) return NextResponse.next();
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name: string) {
          request.cookies.delete(name);
          supabaseResponse.cookies.delete(name);
        },
      },
    }
  );

  // FAST PATH: if access token present and not near-expiry, skip network getUser.
  // Only call getUser when token is missing or within 60s of expiry.
  const accessToken = request.cookies.get('sb-dhedoxczmbwrgetibvmy-auth-token')?.value
    ?? request.cookies.get('sb-dhedoxczmbwrgetibvmy-auth-token.0')?.value
    ?? request.cookies.get('sb-dhedoxczmbwrgetibvmy-auth-token.1')?.value;

  let needsNetwork = !accessToken;
  if (accessToken && !needsNetwork) {
    try {
      // Cookie may be base64 JSON session — decode exp if present
      const raw = accessToken;
      if (raw.includes('.')) {
        // JWT
        const payload = raw.split('.')[1];
        const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const exp = typeof json.exp === 'number' ? json.exp * 1000 : 0;
        needsNetwork = !exp || exp - Date.now() < 60_000;
      } else {
        // Encoded session from @supabase/ssr — still try decode
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        const json = JSON.parse(decoded) as { access_token?: string };
        if (json.access_token?.includes('.')) {
          const payload = json.access_token.split('.')[1];
          const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
          const exp = typeof claims.exp === 'number' ? claims.exp * 1000 : 0;
          needsNetwork = !exp || exp - Date.now() < 60_000;
        } else {
          needsNetwork = true;
        }
      }
    } catch {
      needsNetwork = true;
    }
  }

  if (needsNetwork) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // Local token valid — trust it for this request (page still validates via layout)
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

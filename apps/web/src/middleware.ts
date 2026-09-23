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
  '/terms',
  '/privacy',
  '/legal',
  '/legal/cookies',
  '/legal/acceptable-use',
  '/legal/refund',
  '/legal/contact',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Allow API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // @supabase/ssr@0.3 uses get/set/remove (not getAll/setAll).
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.delete(name);
          supabaseResponse.cookies.delete(name);
        },
      },
    }
  );

  // Validate and refresh the session from Supabase rather than trusting the
  // locally decoded session cookie. This prevents false login redirects when
  // the access token has expired but the refresh token is still valid.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

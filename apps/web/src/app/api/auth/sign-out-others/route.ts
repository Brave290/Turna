import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sign-out-others
 * Signs out all sessions except the current one (best-effort via Supabase).
 * Admin/sensitive: requires authenticated user.
 */
export async function POST() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return NextResponse.json(
      { error: 'Offline — cannot sign out other devices' },
      { status: 503 }
    );
  }

  try {
    // Supabase: signOut with scope 'others' removes other sessions when supported
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) {
      // Fallback: full signOut is too aggressive — report clearly
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    // Re-establish current session cookie if dropped (edge case)
    await supabase.auth.getSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}

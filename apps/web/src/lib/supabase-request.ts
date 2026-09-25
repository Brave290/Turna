import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './supabase-server';

/**
 * Session resolver for API routes:
 * - `Authorization: Bearer <access_token>` → mobile app (same anon key, RLS applies)
 * - otherwise → cookie session (web)
 */
export function createServerSupabaseClientFromRequest(req: Request) {
  const header = req.headers.get('authorization') ?? '';
  const token = /^bearer\s+/i.test(header) ? header.slice(7).trim() : '';
  if (!token) return createServerSupabaseClient();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  ) as ReturnType<typeof createServerSupabaseClient>;
}

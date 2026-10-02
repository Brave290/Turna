import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    smtpPassword: Boolean(process.env.SMTP_PASS),
  };
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      // Table missing or RLS-denied: still report reachable for keep-alive purposes
      return NextResponse.json({
        status: 'ok',
        db: 'degraded',
        message: error.message,
        config,
        timestamp: new Date().toISOString(),
        service: 'turna',
      });
    }

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      config,
      timestamp: new Date().toISOString(),
      service: 'turna',
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: 'error',
        message: e instanceof Error ? e.message : 'Health check failed',
        config,
        timestamp: new Date().toISOString(),
        service: 'turna',
      },
      { status: 500 }
    );
  }
}

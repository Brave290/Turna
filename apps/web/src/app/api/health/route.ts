import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      // Table missing or RLS-denied: still report reachable for keep-alive purposes
      return NextResponse.json({
        status: 'ok',
        db: 'degraded',
        message: error.message,
        timestamp: new Date().toISOString(),
        service: 'turna',
      });
    }

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      timestamp: new Date().toISOString(),
      service: 'turna',
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: 'error',
        message: e instanceof Error ? e.message : 'Health check failed',
        timestamp: new Date().toISOString(),
        service: 'turna',
      },
      { status: 500 }
    );
  }
}

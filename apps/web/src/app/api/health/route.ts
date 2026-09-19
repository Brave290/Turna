import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('user_profiles').select('id').limit(1);

    if (error) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'turna',
    });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Health check failed' }, { status: 500 });
  }
}
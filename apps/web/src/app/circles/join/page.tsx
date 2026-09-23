import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { JoinCircleClient } from './join-client';
import { Spinner } from '@/components/spinner';

export const dynamic = 'force-dynamic';

async function getSessionEmail(): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

export default async function JoinCirclePage() {
  const email = await getSessionEmail();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-forest flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <JoinCircleClient sessionEmail={email} />
    </Suspense>
  );
}

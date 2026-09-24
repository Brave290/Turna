import { NextResponse } from 'next/server';
import { getInvitePreview } from '@/lib/share-invite-actions';

export const dynamic = 'force-dynamic';

/** Public invite preview — used by join landing before auth. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') ?? '';
  const result = await getInvitePreview(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}

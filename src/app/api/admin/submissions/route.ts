import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passkey = searchParams.get('passkey');

  if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const submissions = Array.from(store.submissions.values()).sort(
    (a, b) => b.submittedAt - a.submittedAt
  );

  return NextResponse.json({ submissions });
}

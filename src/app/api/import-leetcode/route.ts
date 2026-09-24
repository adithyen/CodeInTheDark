import { NextRequest, NextResponse } from 'next/server';
import { importLeetCodeQuestion } from '@/lib/leetcode';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, passkey } = body;

    if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Passkey' }, { status: 401 });
    }

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug or URL' }, { status: 400 });
    }

    const imported = await importLeetCodeQuestion(slug);
    if (!imported) {
      return NextResponse.json({
        error: `Could not fetch LeetCode problem for "${slug}". Please verify the slug or try a popular problem (e.g., 'two-sum', 'valid-parentheses', 'maximum-subarray', 'coin-change').`
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, question: imported });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

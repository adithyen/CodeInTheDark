import { NextRequest, NextResponse } from 'next/server';
import { getActiveSession, getSessionById, buildLeaderboard, getQuestionsForSession } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    // Resolve the target session
    let session;
    if (sessionId) {
      session = await getSessionById(sessionId);
    } else {
      // Public leaderboard always shows the current active/ended/reveal session
      session = await getActiveSession();
    }

    if (!session) {
      return NextResponse.json({
        leaderboard: [],
        isRevealMode: false,
        contestTitle: 'No Active Contest',
        isActive: false,
        phase: 'setup',
        totalQuestions: 0,
        serverTime: Date.now(),
      });
    }

    const [leaderboard, questions] = await Promise.all([
      buildLeaderboard(session.id),
      getQuestionsForSession(session.id, false),
    ]);

    return NextResponse.json({
      leaderboard,
      isRevealMode: session.is_reveal_mode ?? false,
      contestTitle: session.label,
      isActive: session.phase === 'active' || session.phase === 'paused',
      phase: session.phase,
      sessionId: session.id,
      totalQuestions: questions.length,
      serverTime: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

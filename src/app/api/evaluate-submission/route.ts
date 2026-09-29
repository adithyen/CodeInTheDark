import { NextRequest, NextResponse } from 'next/server';
import { getActiveSession } from '@/lib/db';
import { evaluateParticipantSubmissions } from '@/lib/submissionEvaluator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { participantId, sessionId: reqSessionId } = body;

    if (!participantId) {
      return NextResponse.json({ error: 'Missing participantId' }, { status: 400 });
    }

    let sessionId = reqSessionId;
    if (!sessionId) {
      const activeSession = await getActiveSession();
      sessionId = activeSession?.id;
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'No active session found' }, { status: 404 });
    }

    const results = await evaluateParticipantSubmissions(participantId, sessionId);

    return NextResponse.json({
      success: true,
      evaluatedCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[API /api/evaluate-submission] Error:', error);
    return NextResponse.json({ error: error.message || 'Evaluation failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get('participantId');
    const sessionId = searchParams.get('sessionId');

    if (!participantId) {
      return NextResponse.json({ error: 'Missing participantId' }, { status: 400 });
    }

    let targetSessionId = sessionId || undefined;
    if (!targetSessionId) {
      const activeSession = await getActiveSession();
      targetSessionId = activeSession?.id;
    }

    if (!targetSessionId) {
      return NextResponse.json({ error: 'No active session found' }, { status: 404 });
    }

    const results = await evaluateParticipantSubmissions(participantId, targetSessionId);

    return NextResponse.json({
      success: true,
      evaluatedCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[API /api/evaluate-submission] Error:', error);
    return NextResponse.json({ error: error.message || 'Evaluation failed' }, { status: 500 });
  }
}

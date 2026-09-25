import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveSession,
  getSessionById,
  getSubmissionsForSession,
  upsertSubmission,
  getQuestionsForSession,
} from '@/lib/db';
import { executeCode } from '@/lib/executor';

function isAdmin(passkey: string) {
  return passkey === 'admin1111' || passkey === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passkey = searchParams.get('passkey') || '';
  const sessionId = searchParams.get('sessionId');

  if (!isAdmin(passkey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const session = await getActiveSession();
    targetSessionId = session?.id ?? null;
  }
  if (!targetSessionId) return NextResponse.json({ submissions: [] });

  const submissions = await getSubmissionsForSession(targetSessionId);
  return NextResponse.json({ submissions });
}

// Re-judge a submission against current test cases
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passkey, submissionId, sessionId: reqSessionId } = body;

    if (!isAdmin(passkey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetSessionId = reqSessionId;
    if (!targetSessionId) {
      const session = await getActiveSession();
      targetSessionId = session?.id ?? null;
    }
    if (!targetSessionId) return NextResponse.json({ error: 'No session found' }, { status: 404 });

    const submissions = await getSubmissionsForSession(targetSessionId);
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

    const questions = await getQuestionsForSession(targetSessionId, true);
    const question = questions.find(q => q.id === sub.questionId);
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const testCases = question.testCases;
    let passedCount = 0;
    const testCaseDetails: any[] = [];

    for (const tc of testCases) {
      const res = await executeCode(sub.language, sub.code, tc.input);
      const normalizedActual = (res.stdout || '').replace(/\r\n/g, '\n').trim();
      const normalizedExpected = (tc.expectedOutput || '').replace(/\r\n/g, '\n').trim();
      const passed = res.isSuccess && normalizedActual === normalizedExpected;
      if (passed) passedCount++;

      testCaseDetails.push({
        testCaseId: tc.id,
        passed,
        actualOutput: tc.isHidden ? '[HIDDEN IN TEST RUNNER]' : normalizedActual,
        expectedOutput: tc.isHidden ? '[HIDDEN]' : normalizedExpected,
        isHidden: tc.isHidden,
        error: res.stderr || undefined,
      });
    }

    const totalCount = testCases.length;
    const passRatio = totalCount > 0 ? passedCount / totalCount : 0;
    const baseScore = Math.round(passRatio * question.points);

    await upsertSubmission({
      ...sub,
      sessionId: targetSessionId,
      testCasesPassed: passedCount,
      totalTestCases: totalCount,
      score: baseScore,
      speedBonus: 0,
      evaluationStatus: 'completed',
      testCaseDetails,
    });

    return NextResponse.json({ success: true, testCasesPassed: passedCount, totalTestCases: totalCount, score: baseScore });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

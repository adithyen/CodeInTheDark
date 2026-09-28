import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveSession,
  getSessionById,
  getSubmissionsForSession,
  upsertSubmission,
  getQuestionsForSession,
} from '@/lib/db';
import { executeCode, executeCodeBatch } from '@/lib/executor';
import { calculateQuestionScore } from '@/lib/scoring';
import { isAdmin } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passkey = req.headers.get('x-admin-passkey') || searchParams.get('passkey') || '';
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
    const { submissionId, sessionId: reqSessionId } = body;
    const passkey = body.passkey || req.headers.get('x-admin-passkey') || '';

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

    let testCaseDetails: any[] = [];
    try {
      const batchResult = await executeCodeBatch(
        sub.language,
        sub.code,
        testCases.map((tc, idx) => ({ id: tc.id || String(idx), input: tc.input }))
      );

      testCaseDetails = testCases.map((tc, idx) => {
        const tcKey = tc.id || String(idx);
        const res = batchResult.results[tcKey];
        if (!res) {
          return {
            testCaseId: tc.id,
            passed: false,
            actualOutput: '[EXECUTION ERROR]',
            expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
            isHidden: tc.isHidden,
            error: 'No output returned from execution runner',
          };
        }

        const normalizedActual = (res.stdout || '').replace(/\r\n/g, '\n').trim();
        const normalizedExpected = (tc.expectedOutput || '').replace(/\r\n/g, '\n').trim();
        const passed = res.isSuccess && normalizedActual === normalizedExpected;

        return {
          testCaseId: tc.id,
          passed,
          actualOutput: tc.isHidden ? '[HIDDEN IN TEST RUNNER]' : normalizedActual,
          expectedOutput: tc.isHidden ? '[HIDDEN]' : normalizedExpected,
          isHidden: tc.isHidden,
          error: res.stderr || undefined,
        };
      });
    } catch (err: any) {
      testCaseDetails = testCases.map((tc) => ({
        testCaseId: tc.id,
        passed: false,
        actualOutput: '[EXECUTION ERROR]',
        expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
        isHidden: tc.isHidden,
        error: err.message,
      }));
    }

    const passedCount = testCaseDetails.filter(t => t.passed).length;
    const totalCount = testCases.length;

    // Fetch session details for benchmark scaling
    const targetSession = await getSessionById(targetSessionId);
    const sessionDurationMs = (targetSession?.challenge_starts_at && targetSession?.challenge_ends_at)
      ? (targetSession.challenge_ends_at - targetSession.challenge_starts_at)
      : undefined;

    const durationMs = sub.firstExecTimeMs || sub.execTimeMs || 0;

    const scoring = calculateQuestionScore({
      points: question.points || 100,
      testCasesPassed: passedCount,
      totalTestCases: totalCount,
      durationMs,
      sessionDurationMs,
      totalQuestions: questions.length,
    });

    await upsertSubmission({
      ...sub,
      sessionId: targetSessionId,
      testCasesPassed: passedCount,
      totalTestCases: totalCount,
      score: scoring.finalScore,
      speedBonus: scoring.speedBonus,
      evaluationStatus: 'completed',
      testCaseDetails,
    });

    return NextResponse.json({
      success: true,
      testCasesPassed: passedCount,
      totalTestCases: totalCount,
      baseScore: scoring.baseScore,
      speedBonus: scoring.speedBonus,
      score: scoring.finalScore,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

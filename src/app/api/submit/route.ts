import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveSession,
  getParticipantById,
  getQuestionsForSession,
  getSessionById,
  upsertSubmission,
  updateParticipant,
} from '@/lib/db';
import { executeCode } from '@/lib/executor';
import { Language } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      participantId,
      participantName,
      participantRoll,
      terminalId,
      questionId,
      language,
      code,
      strikes,
      isAutoSubmit = false,
      sessionId: reqSessionId,
    } = body;

    if (!participantId || !questionId || !language || !code) {
      return NextResponse.json({ error: 'Missing required submission fields' }, { status: 400 });
    }

    // Get the session
    let targetSessionId = reqSessionId;
    if (!targetSessionId) {
      const session = await getActiveSession();
      targetSessionId = session?.id ?? null;
    }
    if (!targetSessionId) {
      return NextResponse.json({ error: 'No active contest session' }, { status: 403 });
    }

    // Fetch participant from DB
    const participant = await getParticipantById(participantId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found. Please re-register.' }, { status: 404 });
    }

    if (participant.isLockedOut) {
      return NextResponse.json({ error: 'Participant locked out due to anti-cheat strikes' }, { status: 403 });
    }

    // Get questions for session (including hidden test cases for evaluation)
    const questions = await getQuestionsForSession(targetSessionId, true);
    const question = questions.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found in this session' }, { status: 404 });
    }

    const now = Date.now();

    // Update participant last active
    await updateParticipant(participantId, {
      activeLanguage: language as Language,
      currentQuestionId: questionId,
      lastActiveAt: now,
    });

    // Run test cases
    const testCases = question.testCases;
    let passedCount = 0;
    const testCaseDetails: any[] = [];

    for (const tc of testCases) {
      const res = await executeCode(language as Language, code, tc.input);
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

    // Speed bonus: up to 25% extra for solving early
    // Use the SAME session as this submission (not a second getActiveSession() call)
    let speedBonus = 0;
    const targetSession = await getSessionById(targetSessionId);
    if (targetSession?.challenge_starts_at && targetSession?.challenge_ends_at && passedCount > 0) {
      const totalDurationMs = targetSession.challenge_ends_at - targetSession.challenge_starts_at;
      const remainingMs = Math.max(0, targetSession.challenge_ends_at - now);
      if (totalDurationMs > 0) {
        speedBonus = Math.round(baseScore * (remainingMs / totalDurationMs) * 0.25);
      }
    }

    const finalScore = baseScore + speedBonus;

    // Persist submission (upserts — latest code wins per participant per question)
    await upsertSubmission({
      sessionId: targetSessionId,
      participantId,
      participantName: participant.name,
      participantRoll: participant.rollNumber,
      questionId,
      questionTitle: question.title,
      language: language as Language,
      code,
      submittedAt: now,
      isAutoSubmit,
      evaluationStatus: 'completed',
      testCasesPassed: passedCount,
      totalTestCases: totalCount,
      score: finalScore,
      speedBonus,
      testCaseDetails,
    });

    return NextResponse.json({
      success: true,
      message: isAutoSubmit
        ? 'Timer expired — code automatically submitted and locked for evaluation.'
        : 'Submission received and locked. Output remains sealed until stage reveal.',
      submittedAt: now,
      questionId,
      isAutoSubmit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

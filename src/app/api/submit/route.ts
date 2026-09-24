import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { executeCode } from '@/lib/executor';
import { Submission, Language } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      participantId, 
      participantName, 
      rollNumber, 
      terminalId, 
      questionId, 
      language, 
      code,
      strikes 
    } = body;

    if (!participantId || !questionId || !language || !code) {
      return NextResponse.json({ error: 'Missing submission fields' }, { status: 400 });
    }

    let participant = store.participants.get(participantId);
    if (!participant) {
      // Auto-hydrate participant state if hitting a fresh serverless container
      const now = Date.now();
      participant = {
        id: participantId,
        name: participantName || participantId,
        rollNumber: rollNumber || 'UNKNOWN',
        terminalId: terminalId || 'NODE-1',
        registeredAt: now,
        strikes: strikes || 0,
        isLockedOut: strikes >= 3,
        lastActiveAt: now,
      };
      store.participants.set(participantId, participant);
    }

    if (participant.isLockedOut) {
      return NextResponse.json({ error: 'Participant locked out due to anti-cheat strikes' }, { status: 403 });
    }

    const question = store.questions.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const now = Date.now();
    participant.lastActiveAt = now;
    participant.activeLanguage = language as Language;
    participant.currentQuestionId = questionId;

    // Background evaluation: execute against all test cases
    const testCases = question.testCases;
    let passedCount = 0;
    const testCaseDetails: Submission['testCaseDetails'] = [];

    // Run test cases sequentially or in parallel
    for (const tc of testCases) {
      const res = await executeCode(language as Language, code, tc.input);

      // Clean compare
      const normalizedActual = (res.stdout || '').replace(/\r\n/g, '\n').trim();
      const normalizedExpected = (tc.expectedOutput || '').replace(/\r\n/g, '\n').trim();

      const passed = res.isSuccess && normalizedActual === normalizedExpected;
      if (passed) {
        passedCount++;
      }

      testCaseDetails.push({
        testCaseId: tc.id,
        passed,
        actualOutput: tc.isHidden ? '[HIDDEN IN TEST RUNNER]' : normalizedActual,
        expectedOutput: tc.isHidden ? '[HIDDEN]' : normalizedExpected,
        isHidden: tc.isHidden,
        error: res.stderr || undefined,
      });
    }

    // Scoring formula: Partial ratio of points + speed bonus
    const totalCount = testCases.length;
    const passRatio = totalCount > 0 ? passedCount / totalCount : 0;
    const baseScore = Math.round(passRatio * question.points);

    // Speed bonus calculation based on remaining contest time
    let speedBonus = 0;
    if (store.contest.isActive && store.contest.startTime && store.contest.endTime) {
      const totalDurationMs = store.contest.endTime - store.contest.startTime;
      const remainingMs = Math.max(0, store.contest.endTime - now);
      if (totalDurationMs > 0 && passedCount > 0) {
        // Up to 25% bonus for solving early
        speedBonus = Math.round(baseScore * (remainingMs / totalDurationMs) * 0.25);
      }
    }

    const finalScore = baseScore + speedBonus;
    const subId = `sub-${participantId}-${questionId}`;

    const submission: Submission = {
      id: subId,
      participantId,
      participantName: participant.name,
      participantRoll: participant.rollNumber,
      questionId,
      questionTitle: question.title,
      language: language as Language,
      code,
      submittedAt: now,
      evaluationStatus: 'completed',
      testCasesPassed: passedCount,
      totalTestCases: totalCount,
      score: finalScore,
      speedBonus,
      testCaseDetails,
    };

    store.submissions.set(subId, submission);

    // Notice: Participant gets a blind acknowledgment!
    return NextResponse.json({
      success: true,
      message: 'Submission successfully received and locked. Under Code In The Dark rules, output and test results remain sealed until evaluation reveal.',
      submittedAt: now,
      questionId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveSession,
  getParticipantById,
  getQuestionsForSession,
  getSessionById,
  upsertSubmission,
  updateParticipant,
  getParticipantSubmissions,
  hasParticipantSubmitted,
} from '@/lib/db';
import { executeCode } from '@/lib/executor';
import { Language, Question } from '@/types';

// ─────────────────────────────────────────────────────────────────────
// GET /api/submit?participantId=...&sessionId=...
// Fetches all drafts/submissions for a participant (for page restoration)
// ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get('participantId');
    const sessionId = searchParams.get('sessionId') || undefined;

    if (!participantId) {
      return NextResponse.json({ error: 'Missing participantId' }, { status: 400 });
    }

    const submissions = await getParticipantSubmissions(participantId, sessionId);
    const isSubmitted = submissions.some(s => s.evaluationStatus === 'completed');

    return NextResponse.json({
      submissions,
      isSubmitted,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/submit
// Handles both:
// 1. Real-time Cloud Auto-Saving of Drafts (isDraft: true)
// 2. Global Final Contest Submission (isDraft: false / undefined)
// ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      participantId,
      isDraft = false,
      isAutoSubmit = false,
      sessionId: reqSessionId,
      // For batch submissions / batch drafts
      submissions: batchSubmissions,
      drafts: batchDrafts,
      // For single submission / single draft
      questionId,
      language,
      code,
    } = body;

    if (!participantId) {
      return NextResponse.json({ error: 'Missing participantId' }, { status: 400 });
    }

    // 1. Fetch participant from DB
    const participant = await getParticipantById(participantId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found. Please re-register.' }, { status: 404 });
    }

    if (participant.isLockedOut) {
      return NextResponse.json({ error: 'Participant locked out due to anti-cheat strikes' }, { status: 403 });
    }

    // 2. Resolve active session
    let targetSessionId = reqSessionId;
    if (!targetSessionId) {
      const session = await getActiveSession();
      targetSessionId = session?.id ?? null;
    }
    if (!targetSessionId) {
      return NextResponse.json({ error: 'No active contest session' }, { status: 403 });
    }

    const now = Date.now();

    // 3. Check if participant has ALREADY submitted the contest
    const alreadySubmitted = await hasParticipantSubmitted(participantId, targetSessionId);
    if (alreadySubmitted) {
      return NextResponse.json(
        {
          error: 'Contest responses are permanently sealed and locked. Modifications are prohibited.',
          isSubmitted: true,
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // BRANCH A: CLOUD AUTO-SAVE DRAFT (Real-time every 3s / debounced)
    // ─────────────────────────────────────────────────────────────────
    if (isDraft) {
      const itemsToSave: { questionId: string; language: Language; code: string }[] = [];

      if (batchDrafts && Array.isArray(batchDrafts)) {
        itemsToSave.push(...batchDrafts);
      } else if (questionId && language && code !== undefined) {
        itemsToSave.push({ questionId, language: language as Language, code });
      }

      if (itemsToSave.length === 0) {
        return NextResponse.json({ error: 'No draft items provided' }, { status: 400 });
      }

      // Fetch questions to get titles
      const questions = await getQuestionsForSession(targetSessionId, false);
      const qMap = new Map(questions.map(q => [q.id, q]));

      // Update participant's last active & current question
      const firstItem = itemsToSave[0];
      await updateParticipant(participantId, {
        activeLanguage: firstItem.language,
        currentQuestionId: firstItem.questionId,
        lastActiveAt: now,
      });

      // Save all drafts in parallel to Supabase
      await Promise.all(
        itemsToSave.map(async (item) => {
          const q = qMap.get(item.questionId);
          return upsertSubmission({
            sessionId: targetSessionId,
            participantId,
            participantName: participant.name,
            participantRoll: participant.rollNumber,
            questionId: item.questionId,
            questionTitle: q?.title || 'Question Draft',
            language: item.language,
            code: item.code,
            submittedAt: now,
            isAutoSubmit: false,
            evaluationStatus: 'draft',
            testCasesPassed: 0,
            totalTestCases: q?.testCases?.length || 0,
            score: 0,
            speedBonus: 0,
          });
        })
      );

      return NextResponse.json({
        success: true,
        isDraft: true,
        savedCount: itemsToSave.length,
        savedAt: now,
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // BRANCH B: FINAL CONTEST SUBMISSION (Global Submission)
    // ─────────────────────────────────────────────────────────────────
    const itemsToSubmit: { questionId: string; language: Language; code: string }[] = [];

    if (batchSubmissions && Array.isArray(batchSubmissions)) {
      itemsToSubmit.push(...batchSubmissions);
    } else if (questionId && language && code !== undefined) {
      itemsToSubmit.push({ questionId, language: language as Language, code });
    }

    if (itemsToSubmit.length === 0) {
      return NextResponse.json({ error: 'No question answers provided for submission' }, { status: 400 });
    }

    // Get all questions with hidden test cases for evaluation
    const questions = await getQuestionsForSession(targetSessionId, true);
    const qMap = new Map(questions.map(q => [q.id, q]));

    // Fetch session details for speed bonus calculation
    const targetSession = await getSessionById(targetSessionId);

    // Evaluate each question response
    const results: any[] = [];
    let grandTotalScore = 0;
    let grandTotalPassed = 0;
    let grandTotalTests = 0;

    for (const item of itemsToSubmit) {
      const question = qMap.get(item.questionId);
      if (!question) continue;

      const testCases = question.testCases || [];
      let passedCount = 0;
      const testCaseDetails: any[] = [];

      // If participant submitted empty code or starter code with no implementation, skip execution
      const trimmedCode = (item.code || '').trim();
      const starterTemplate = (question.starterTemplates?.[item.language] || '').trim();
      const hasMeaningfulCode = trimmedCode.length > 0 && trimmedCode !== starterTemplate;

      if (hasMeaningfulCode) {
        for (const tc of testCases) {
          try {
            const res = await executeCode(item.language, item.code, tc.input);
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
          } catch (err: any) {
            testCaseDetails.push({
              testCaseId: tc.id,
              passed: false,
              actualOutput: '[EXECUTION ERROR]',
              expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
              isHidden: tc.isHidden,
              error: err.message,
            });
          }
        }
      } else {
        // No meaningful code written
        for (const tc of testCases) {
          testCaseDetails.push({
            testCaseId: tc.id,
            passed: false,
            actualOutput: '[NO CODE SUBMITTED]',
            expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
            isHidden: tc.isHidden,
          });
        }
      }

      const totalCount = testCases.length;
      const passRatio = totalCount > 0 ? passedCount / totalCount : 0;
      const baseScore = Math.round(passRatio * question.points);

      // Speed bonus: up to 25% extra for solving early
      let speedBonus = 0;
      if (targetSession?.challenge_starts_at && targetSession?.challenge_ends_at && passedCount > 0) {
        const totalDurationMs = targetSession.challenge_ends_at - targetSession.challenge_starts_at;
        const remainingMs = Math.max(0, targetSession.challenge_ends_at - now);
        if (totalDurationMs > 0) {
          speedBonus = Math.round(baseScore * (remainingMs / totalDurationMs) * 0.25);
        }
      }

      const finalScore = baseScore + speedBonus;
      grandTotalScore += finalScore;
      grandTotalPassed += passedCount;
      grandTotalTests += totalCount;

      // Persist completed submission
      await upsertSubmission({
        sessionId: targetSessionId,
        participantId,
        participantName: participant.name,
        participantRoll: participant.rollNumber,
        questionId: item.questionId,
        questionTitle: question.title,
        language: item.language,
        code: item.code || '',
        submittedAt: now,
        isAutoSubmit,
        evaluationStatus: 'completed',
        testCasesPassed: passedCount,
        totalTestCases: totalCount,
        score: finalScore,
        speedBonus,
        testCaseDetails,
      });

      results.push({
        questionId: item.questionId,
        questionTitle: question.title,
        language: item.language,
        submittedAt: now,
        testCasesPassed: passedCount,
        totalTestCases: totalCount,
        baseScore,
        speedBonus,
        totalScore: finalScore,
        lines: (item.code || '').split('\n').length,
        chars: (item.code || '').length,
        isAutoSubmit,
      });
    }

    // Update participant's last active
    await updateParticipant(participantId, {
      lastActiveAt: now,
    });

    return NextResponse.json({
      success: true,
      isSubmitted: true,
      isAutoSubmit,
      submittedAt: now,
      message: isAutoSubmit
        ? 'Contest duration expired — all question responses have been auto-submitted and locked for evaluation.'
        : 'Global submission received and locked. All responses are sealed until the Admiralty stage reveal.',
      results,
      totalScore: grandTotalScore,
      totalPassed: grandTotalPassed,
      totalTestCases: grandTotalTests,
    });
  } catch (error: any) {
    console.error('Submit API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

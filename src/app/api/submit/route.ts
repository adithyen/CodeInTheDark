import { NextRequest, NextResponse, after } from 'next/server';
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
import { executeCode, executeCodeBatch } from '@/lib/executor';
import { calculateQuestionScore } from '@/lib/scoring';
import { evaluateParticipantSubmissions } from '@/lib/submissionEvaluator';
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
    const isSubmitted = submissions.some(s => s.evaluationStatus === 'completed' || s.evaluationStatus === 'evaluating');
    const isEvaluating = submissions.some(s => s.evaluationStatus === 'evaluating');

    return NextResponse.json({
      submissions,
      isSubmitted,
      isEvaluating,
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

    // 1. Resolve active session ID
    let targetSessionId = reqSessionId;
    if (!targetSessionId) {
      const activeSession = await getActiveSession();
      targetSessionId = activeSession?.id ?? null;
    }
    if (!targetSessionId) {
      return NextResponse.json({ error: 'No active contest session' }, { status: 403 });
    }

    const now = Date.now();

    // 2. Fetch participant, session details, already-submitted check, and questions in PARALLEL
    const [participant, targetSession, alreadySubmitted, questions] = await Promise.all([
      getParticipantById(participantId),
      getSessionById(targetSessionId),
      hasParticipantSubmitted(participantId, targetSessionId),
      getQuestionsForSession(targetSessionId, false),
    ]);

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found. Please re-register.' }, { status: 404 });
    }

    if (participant.isLockedOut) {
      return NextResponse.json({ error: 'Participant locked out due to anti-cheat strikes' }, { status: 403 });
    }

    if (alreadySubmitted) {
      return NextResponse.json(
        {
          error: 'Contest responses are permanently sealed and locked. Modifications are prohibited.',
          isSubmitted: true,
        },
        { status: 403 }
      );
    }

    const qMap = new Map(questions.map((q) => [q.id, q]));

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

    // ── Method 3: Instant Seal (<150ms) + Asynchronous Background Worker ──
    // Step 1: Immediately persist all answers into Supabase with evaluation_status: 'evaluating'.
    // Exact submission and elapsed stopwatch timestamps are permanently sealed.
    const sealedItems = itemsToSubmit.map((item) => {
      const question = qMap.get(item.questionId);
      const totalCount = question?.testCases?.length || 0;

      const questionElapsed = (item as any).elapsedMs || (now - (targetSession?.challenge_starts_at || now));
      const firstDuration = (item as any).firstDurationMs || questionElapsed;
      const firstSealedAt = (item as any).firstSealedAt || now;
      const lastSealedAt = (item as any).lastSealedAt || now;

      return {
        questionId: item.questionId,
        questionTitle: question?.title || 'Question Submission',
        language: item.language,
        code: item.code || '',
        submittedAt: lastSealedAt,
        firstSubmittedAt: firstSealedAt,
        elapsedMs: questionElapsed,
        firstDurationMs: firstDuration,
        totalTestCases: totalCount,
        testCasesPassed: 0,
        score: 0,
        speedBonus: 0,
        lines: (item.code || '').split('\n').length,
        chars: (item.code || '').length,
        isAutoSubmit,
        evaluationStatus: 'evaluating' as const,
      };
    });

    // Write all sealed submissions in parallel to Supabase (<100ms)
    await Promise.all(
      sealedItems.map((item) =>
        upsertSubmission({
          sessionId: targetSessionId,
          participantId,
          participantName: participant.name,
          participantRoll: participant.rollNumber,
          questionId: item.questionId,
          questionTitle: item.questionTitle,
          language: item.language,
          code: item.code,
          submittedAt: item.submittedAt,
          firstSubmittedAt: item.firstSubmittedAt,
          isAutoSubmit,
          evaluationStatus: 'evaluating',
          testCasesPassed: 0,
          totalTestCases: item.totalTestCases,
          score: 0,
          speedBonus: 0,
          execTimeMs: item.elapsedMs,
          firstExecTimeMs: item.firstDurationMs,
        })
      )
    );

    // Update participant's last active
    await updateParticipant(participantId, {
      lastActiveAt: now,
    });

    // Step 2: Trigger Background Evaluation via Next.js 15/16 after()
    // Runs asynchronously after the 150ms HTTP response is returned to the client
    after(async () => {
      try {
        await evaluateParticipantSubmissions(
          participantId,
          targetSessionId,
          sealedItems.map((s) => ({
            questionId: s.questionId,
            language: s.language,
            code: s.code,
            elapsedMs: s.elapsedMs,
            firstDurationMs: s.firstDurationMs,
            firstSealedAt: s.firstSubmittedAt,
            lastSealedAt: s.submittedAt,
            isAutoSubmit,
          }))
        );
      } catch (bgErr) {
        console.error('[Submit after()] Background evaluation failed:', bgErr);
      }
    });

    // Step 3: Return instant seal response to client in ~150ms!
    return NextResponse.json({
      success: true,
      isSubmitted: true,
      status: 'evaluating',
      isAutoSubmit,
      submittedAt: now,
      message: isAutoSubmit
        ? 'Contest duration expired — all question responses have been permanently sealed and locked. Background evaluation in progress...'
        : '🏆 Submission Sealed & Secured! Answers locked for final evaluation on Admiralty Bridge.',
      results: sealedItems,
      totalScore: 0,
      totalPassed: 0,
      totalTestCases: sealedItems.reduce((acc, s) => acc + s.totalTestCases, 0),
    });
  } catch (error: any) {
    console.error('Submit API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

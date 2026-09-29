import {
  getSessionById,
  getQuestionsForSession,
  getParticipantById,
  upsertSubmission,
} from '@/lib/db';
import { executeCodeBatch } from '@/lib/executor';
import { calculateQuestionScore } from '@/lib/scoring';
import { Language } from '@/types';
import { supabase } from '@/lib/supabase';

export interface EvaluateItemInput {
  questionId: string;
  language: Language;
  code: string;
  elapsedMs?: number;
  firstDurationMs?: number;
  firstSealedAt?: number;
  lastSealedAt?: number;
  isAutoSubmit?: boolean;
}

export interface EvaluatedItemResult {
  questionId: string;
  questionTitle: string;
  language: Language;
  submittedAt: number;
  firstSubmittedAt: number;
  elapsedMs: number;
  firstDurationMs: number;
  testCasesPassed: number;
  totalTestCases: number;
  baseScore: number;
  speedBonus: number;
  totalScore: number;
  lines: number;
  chars: number;
  isAutoSubmit: boolean;
  evaluationStatus: 'completed';
}

/**
 * Evaluates a set of question submissions for a participant in the background.
 * Uses Method 1 (batch test cases: compile once, run many) and updates Supabase.
 */
export async function evaluateParticipantSubmissions(
  participantId: string,
  sessionId: string,
  items?: EvaluateItemInput[]
): Promise<EvaluatedItemResult[]> {
  try {
    const [participant, session, questions] = await Promise.all([
      getParticipantById(participantId),
      getSessionById(sessionId),
      getQuestionsForSession(sessionId, true), // include hidden test cases
    ]);

    if (!participant || !session) {
      console.error(`[Evaluator] Participant ${participantId} or Session ${sessionId} not found`);
      return [];
    }

    const qMap = new Map(questions.map((q) => [q.id, q]));
    const now = Date.now();

    // If items weren't provided directly, pull pending submissions from DB
    let submissionsToProcess: EvaluateItemInput[] = items || [];
    if (!items || items.length === 0) {
      const { data: dbSubs } = await supabase
        .from('submissions')
        .select('*')
        .eq('participant_id', participantId)
        .eq('session_id', sessionId)
        .in('evaluation_status', ['evaluating', 'pending']);

      if (!dbSubs || dbSubs.length === 0) {
        return [];
      }

      submissionsToProcess = dbSubs.map((s) => {
        let meta: Record<string, number> = {};
        if (s.status_message && typeof s.status_message === 'string' && s.status_message.startsWith('{')) {
          try { meta = JSON.parse(s.status_message); } catch {}
        }
        return {
          questionId: s.question_id,
          language: s.language as Language,
          code: s.code || '',
          elapsedMs: s.exec_time_ms || meta.lastExecTimeMs || 0,
          firstDurationMs: meta.firstExecTimeMs || s.exec_time_ms || 0,
          firstSealedAt: s.first_submitted_at || meta.firstSealedAt || now,
          lastSealedAt: s.submitted_at || meta.lastSealedAt || now,
          isAutoSubmit: s.is_auto_submit || false,
        };
      });
    }

    if (submissionsToProcess.length === 0) return [];

    // Session duration for benchmark scaling
    const sessionDurationMs =
      session.challenge_starts_at && session.challenge_ends_at
        ? session.challenge_ends_at - session.challenge_starts_at
        : undefined;

    // Evaluate in parallel across questions with batch test case runs (Methods 1 & 2)
    const results = await Promise.all(
      submissionsToProcess.map(async (item) => {
        const question = qMap.get(item.questionId);
        if (!question) return null;

        const testCases = question.testCases || [];
        let passedCount = 0;
        let testCaseDetails: {
          testCaseId?: string;
          passed: boolean;
          actualOutput: string;
          expectedOutput: string;
          isHidden: boolean;
          error?: string;
        }[] = [];

        const trimmedCode = (item.code || '').trim();
        const starterTemplate = (question.starterTemplates?.[item.language] || '').trim();
        const hasMeaningfulCode = trimmedCode.length > 0 && trimmedCode !== starterTemplate;

        if (hasMeaningfulCode && testCases.length > 0) {
          try {
            // Method 1: Batch execute all test cases in ONE single request (Compile Once, Run Many)
            const batchResult = await executeCodeBatch(
              item.language,
              item.code,
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

            passedCount = testCaseDetails.filter((t) => t.passed).length;
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            testCaseDetails = testCases.map((tc) => ({
              testCaseId: tc.id,
              passed: false,
              actualOutput: '[EXECUTION ERROR]',
              expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
              isHidden: tc.isHidden,
              error: errMsg,
            }));
          }
        } else {
          testCaseDetails = testCases.map((tc) => ({
            testCaseId: tc.id,
            passed: false,
            actualOutput: '[NO CODE SUBMITTED]',
            expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
            isHidden: tc.isHidden,
          }));
        }

        const totalCount = testCases.length;
        const questionElapsed = item.elapsedMs || (now - (session.challenge_starts_at || now));
        const firstDuration = item.firstDurationMs || questionElapsed;
        const firstSealedAt = item.firstSealedAt || now;
        const lastSealedAt = item.lastSealedAt || now;

        // Dynamic Speed vs Accuracy Metric (SAM) calculation
        const { baseScore, speedBonus, finalScore } = calculateQuestionScore({
          points: question.points || 100,
          testCasesPassed: passedCount,
          totalTestCases: totalCount,
          durationMs: firstDuration,
          sessionDurationMs,
          totalQuestions: questions.length,
        });

        // Update database row to completed
        await upsertSubmission({
          sessionId,
          participantId,
          participantName: participant.name,
          participantRoll: participant.rollNumber,
          questionId: item.questionId,
          questionTitle: question.title,
          language: item.language,
          code: item.code || '',
          submittedAt: lastSealedAt,
          firstSubmittedAt: firstSealedAt,
          isAutoSubmit: item.isAutoSubmit || false,
          evaluationStatus: 'completed',
          testCasesPassed: passedCount,
          totalTestCases: totalCount,
          score: finalScore,
          speedBonus,
          testCaseDetails,
          execTimeMs: questionElapsed,
          firstExecTimeMs: firstDuration,
        });

        return {
          questionId: item.questionId,
          questionTitle: question.title,
          language: item.language,
          submittedAt: lastSealedAt,
          firstSubmittedAt: firstSealedAt,
          elapsedMs: questionElapsed,
          firstDurationMs: firstDuration,
          testCasesPassed: passedCount,
          totalTestCases: totalCount,
          baseScore,
          speedBonus,
          totalScore: finalScore,
          lines: (item.code || '').split('\n').length,
          chars: (item.code || '').length,
          isAutoSubmit: item.isAutoSubmit || false,
          evaluationStatus: 'completed',
        };
      })
    );

    return results.filter((r): r is EvaluatedItemResult => r !== null);
  } catch (error) {
    console.error('[Evaluator] Error evaluating participant submissions:', error);
    return [];
  }
}

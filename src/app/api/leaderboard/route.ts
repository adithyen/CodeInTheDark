import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { LeaderboardEntry } from '@/types';

export async function GET() {
  const entriesMap = new Map<string, LeaderboardEntry>();

  // Initialize for all registered participants
  for (const [id, p] of store.participants.entries()) {
    entriesMap.set(id, {
      participantId: id,
      name: p.name,
      rollNumber: p.rollNumber,
      terminalId: p.terminalId,
      totalScore: 0,
      questionsSolved: 0,
      partialSolved: 0,
      strikes: p.strikes,
      lastSubmissionTime: p.registeredAt,
      perQuestionScores: {},
    });
  }

  // Aggregate submissions
  for (const sub of store.submissions.values()) {
    const entry = entriesMap.get(sub.participantId);
    if (!entry) continue;

    entry.perQuestionScores[sub.questionId] = {
      score: sub.score,
      passedRatio: `${sub.testCasesPassed}/${sub.totalTestCases}`,
      language: sub.language,
      submittedAt: sub.submittedAt,
    };

    if (sub.testCasesPassed === sub.totalTestCases && sub.totalTestCases > 0) {
      entry.questionsSolved += 1;
    } else if (sub.testCasesPassed > 0) {
      entry.partialSolved += 1;
    }

    if (sub.submittedAt > entry.lastSubmissionTime) {
      entry.lastSubmissionTime = sub.submittedAt;
    }
  }

  // Calculate final score with strike penalties
  const entries: LeaderboardEntry[] = Array.from(entriesMap.values()).map((entry) => {
    let questionScoreSum = 0;
    for (const qScore of Object.values(entry.perQuestionScores)) {
      questionScoreSum += qScore.score;
    }
    // Strike penalty: 50 points per strike
    const penalty = entry.strikes * 50;
    const finalScore = Math.max(0, questionScoreSum - penalty);

    return {
      ...entry,
      totalScore: finalScore,
    };
  });

  // Sort: highest score first, then earliest last submission time
  entries.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.lastSubmissionTime - b.lastSubmissionTime;
  });

  return NextResponse.json({
    leaderboard: entries,
    isRevealMode: store.contest.isRevealMode,
    contestTitle: store.contest.title,
    isActive: store.contest.isActive,
    totalQuestions: store.questions.length,
    serverTime: Date.now(),
  });
}

export interface ScoringInput {
  points?: number; // Base question points (default: 100)
  testCasesPassed: number;
  totalTestCases: number;
  durationMs: number; // Time spent on this specific question
  sessionDurationMs?: number; // Total contest duration
  totalQuestions?: number;
}

export interface ScoringResult {
  baseScore: number;
  speedBonus: number;
  finalScore: number;
  passRatio: number;
  durationSec: number;
  benchmarkSec: number;
}

/**
 * Dynamic Speed vs Accuracy Scoring Metric
 *
 * Designed for "Code In The Dark" competitions:
 * - Accuracy: Each passed test case contributes proportionally to baseScore.
 * - Speed Bonus: Solutions sealed faster than the benchmark receive time-saved bonus.
 * - Sub-minute Velocity: Blazing solutions (< 60s) receive high-velocity bonus.
 * - Optimal Balance: A participant solving 4/5 in 50s can edge out someone solving 5/5 in 90s,
 *   rewarding intense blind-coding speed, while 0 passed tests always awards 0 points.
 */
export function calculateQuestionScore(input: ScoringInput): ScoringResult {
  const {
    points = 100,
    testCasesPassed,
    totalTestCases,
    durationMs,
    sessionDurationMs,
    totalQuestions = 5,
  } = input;

  const totalCount = totalTestCases || 0;
  const passedCount = testCasesPassed || 0;
  const passRatio = totalCount > 0 ? passedCount / totalCount : 0;

  // 1. Zero test cases passed -> strictly 0 points
  if (passRatio === 0 || passedCount === 0) {
    return {
      baseScore: 0,
      speedBonus: 0,
      finalScore: 0,
      passRatio: 0,
      durationSec: Math.round((durationMs || 0) / 1000),
      benchmarkSec: 180,
    };
  }

  // 2. Base Accuracy Score
  const baseScore = Math.round(passRatio * points);

  // 3. Question Benchmark Duration (seconds)
  // Default benchmark: 180 seconds (3 minutes).
  // If contest duration is defined, dynamically allocate per question (clamped 120s - 300s).
  let benchmarkSec = 180;
  if (sessionDurationMs && sessionDurationMs > 0) {
    const calculatedBench = Math.round(sessionDurationMs / (totalQuestions || 5) / 1000);
    benchmarkSec = Math.max(120, Math.min(300, calculatedBench));
  }

  // 4. Question Duration (seconds) - minimum 5s to protect against clock anomalies
  const durationSec = Math.max(5, Math.round((durationMs || 0) / 1000));

  let speedBonus = 0;
  if (durationSec < benchmarkSec) {
    const timeSavedSec = benchmarkSec - durationSec;
    const scale = points / 100;

    // Normal time savings: 0.60 pts per second saved
    let speedRaw = timeSavedSec * 0.60;

    // Sub-minute lightning velocity: 0.50 pts per second below 60s
    if (durationSec < 60) {
      speedRaw += (60 - durationSec) * 0.50;
    }

    speedRaw *= scale;

    // Weighted by pass ratio (power 0.3) so rapid partial solvers gain high speed points
    speedBonus = Math.round(speedRaw * Math.pow(passRatio, 0.3));
  }

  const finalScore = baseScore + speedBonus;

  return {
    baseScore,
    speedBonus,
    finalScore,
    passRatio,
    durationSec,
    benchmarkSec,
  };
}
